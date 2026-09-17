package factorycontroller

import (
	"context"
	"errors"
	"fmt"
	"sync"
	"testing"
	"time"
)

type researchFake struct {
	finalize func(ResearchSnapshot) (ResearchFinalization, error)
	mu       sync.Mutex
	tasks    []TopicTask
	rounds   []ResearchSnapshot
	research func(context.Context, TopicTask) (TurnResult, error)
	gate     EndpointGate
	decide   func(ResearchSnapshot) (ResearchDecision, error)
}

func (f *researchFake) Research(c context.Context, task TopicTask) (TurnResult, error) {
	f.mu.Lock()
	f.tasks = append(f.tasks, task)
	f.mu.Unlock()
	if f.research != nil {
		return f.research(c, task)
	}
	return TurnResult{SessionID: fmt.Sprintf("topic-%d", task.Topic), Answer: "report"}, nil
}
func (f *researchFake) Endpoint(context.Context, string) (EndpointGate, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	if len(f.tasks) != 1 || f.tasks[0].Topic != 5 {
		return EndpointGate{}, errors.New("gate ran before exclusive Topic 5")
	}
	return f.gate, nil
}
func (f *researchFake) Reconcile(_ context.Context, s ResearchSnapshot) (ResearchDecision, error) {
	f.rounds = append(f.rounds, s)
	if f.decide != nil {
		return f.decide(s)
	}
	return selected(), nil
}
func (f *researchFake) Finalize(_ context.Context, s ResearchSnapshot) (ResearchFinalization, error) {
	f.rounds = append(f.rounds, s)
	if f.finalize != nil {
		return f.finalize(s)
	}
	return ResearchFinalization{Dossier: "dossier"}, nil
}
func selected() ResearchDecision {
	return ResearchDecision{Authentication: "oauth", Actions: []SetupAction{{Description: "register", Sources: []string{"https://example.test"}}}, Dossier: "dossier"}
}
func goodFake() *researchFake {
	return &researchFake{gate: EndpointGate{Established: true, Endpoint: "https://example.test", Sources: []string{"source"}}}
}
func TestResearchConcurrentGateAndAudit(t *testing.T) {
	f := goodFake()
	var mu sync.Mutex
	n := 0
	ready := make(chan struct{})
	f.research = func(c context.Context, task TopicTask) (TurnResult, error) {
		if task.Topic != 5 && task.FollowUp == 0 {
			mu.Lock()
			n++
			if n == 4 {
				close(ready)
			}
			mu.Unlock()
			select {
			case <-ready:
			case <-c.Done():
				return TurnResult{}, c.Err()
			}
		}
		if task.FinalAudit && (task.Topic != 1 || task.FollowUp != 1 || task.SessionID != "topic-1" || task.Authentication != "oauth" || len(task.Actions) != 1) {
			t.Errorf("bad audit: %+v", task)
		}
		return TurnResult{SessionID: fmt.Sprintf("topic-%d", task.Topic), Answer: "report"}, nil
	}
	c, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()
	r, err := RunResearch(c, f)
	if err != nil || r.Dossier != "dossier" {
		t.Fatalf("%+v %v", r, err)
	}
	if len(f.tasks) != 6 || f.tasks[0].Topic != 5 || !f.tasks[5].FinalAudit || len(f.rounds) != 2 || !f.rounds[1].FinalAudit {
		t.Fatalf("tasks=%+v rounds=%+v", f.tasks, f.rounds)
	}
}
func TestResearchBlockedGate(t *testing.T) {
	f := goodFake()
	f.gate.Established = false
	r, e := RunResearch(context.Background(), f)
	if e != nil || len(r.Blockers) == 0 || len(f.tasks) != 1 {
		t.Fatalf("%+v %v %+v", r, e, f.tasks)
	}
}
func TestResearchTwoRounds(t *testing.T) {
	f := goodFake()
	f.decide = func(s ResearchSnapshot) (ResearchDecision, error) {
		d := selected()
		if !s.FinalAudit && s.Round < 2 {
			d.FollowUps = []FollowUpRequest{{Topic: 2, Checks: []string{"check"}}}
			if s.Round == 0 {
				d.FollowUps = append(d.FollowUps, FollowUpRequest{Topic: 1, Checks: []string{"check"}})
			}
		}
		return d, nil
	}
	r, e := RunResearch(context.Background(), f)
	if e != nil || r.Dossier == "" {
		t.Fatalf("%+v %v", r, e)
	}
	if len(f.rounds) != 4 || f.rounds[2].Round != 2 || !f.rounds[3].FinalAudit {
		t.Fatalf("rounds %+v", f.rounds)
	}
	last := f.tasks[len(f.tasks)-1]
	if !last.FinalAudit || last.FollowUp != 2 {
		t.Fatalf("%+v", last)
	}
}
func TestResearchRejectDecisions(t *testing.T) {
	for _, name := range []string{"duplicate", "range", "empty", "late", "second-topic1", "auth", "actions", "sources", "blocker"} {
		t.Run(name, func(t *testing.T) {
			f := goodFake()
			f.decide = func(s ResearchSnapshot) (ResearchDecision, error) {
				d := selected()
				switch name {
				case "duplicate":
					d.FollowUps = []FollowUpRequest{{2, []string{"x"}}, {2, []string{"y"}}}
				case "range":
					d.FollowUps = []FollowUpRequest{{6, []string{"x"}}}
				case "empty":
					d.FollowUps = []FollowUpRequest{{2, []string{" "}}}
				case "late":
					d.FollowUps = []FollowUpRequest{{2, []string{"x"}}}
				case "second-topic1":
					d.FollowUps = []FollowUpRequest{{1, []string{"x"}}}
				case "auth":
					d.Authentication = " "
				case "actions":
					d.Actions = nil
				case "sources":
					d.Actions[0].Sources = []string{" "}
				case "blocker":
					d.Blockers = []string{"missing"}
				}
				return d, nil
			}
			r, e := RunResearch(context.Background(), f)
			if e == nil && len(r.Blockers) == 0 {
				t.Fatalf("accepted %+v", r)
			}
			if r.Dossier != "" {
				t.Fatal("returned dossier on failure")
			}
		})
	}
}
func TestResearchCancelJoinAndPreserve(t *testing.T) {
	f := goodFake()
	started := make(chan struct{}, 4)
	release := make(chan struct{})
	var mu sync.Mutex
	joined := 0
	f.research = func(c context.Context, q TopicTask) (TurnResult, error) {
		if q.Topic == 5 {
			return TurnResult{SessionID: "five", Answer: "endpoint"}, nil
		}
		started <- struct{}{}
		if q.Topic == 1 {
			for i := 0; i < 4; i++ {
				<-started
			}
			close(release)
			return TurnResult{}, errors.New("failed")
		}
		<-release
		<-c.Done()
		mu.Lock()
		joined++
		mu.Unlock()
		return TurnResult{}, c.Err()
	}
	c, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()
	r, e := RunResearch(c, f)
	if e == nil || joined != 3 || r.Reports[5] != "endpoint" || len(f.rounds) != 0 {
		t.Fatalf("%+v %v joined=%d", r, e, joined)
	}
}
func TestResearchInvalidRuntime(t *testing.T) {
	for _, name := range []string{"answer", "identity", "duplicate", "changed"} {
		t.Run(name, func(t *testing.T) {
			f := goodFake()
			f.research = func(_ context.Context, q TopicTask) (TurnResult, error) {
				r := TurnResult{SessionID: fmt.Sprintf("topic-%d", q.Topic), Answer: "ok"}
				switch name {
				case "answer":
					r.Answer = " "
				case "identity":
					r.SessionID = ""
				case "duplicate":
					r.SessionID = "same"
				case "changed":
					if q.FinalAudit {
						r.SessionID = "replacement"
					}
				}
				return r, nil
			}
			r, e := RunResearch(context.Background(), f)
			if e == nil || r.Dossier != "" {
				t.Fatalf("%+v %v", r, e)
			}
		})
	}
}

func TestResearchCompletedSiblingSurvivesFailure(t *testing.T) {
	f := goodFake()
	completed := make(chan struct{})
	f.research = func(c context.Context, q TopicTask) (TurnResult, error) {
		if q.Topic == 2 {
			close(completed)
			return TurnResult{SessionID: "topic-2", Answer: "saved sibling"}, nil
		}
		if q.Topic == 1 {
			<-completed
			return TurnResult{}, errors.New("failed")
		}
		if q.Topic != 5 {
			<-c.Done()
			return TurnResult{}, c.Err()
		}
		return TurnResult{SessionID: "topic-5", Answer: "endpoint"}, nil
	}
	c, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()
	r, e := RunResearch(c, f)
	if e == nil || r.Reports[2] != "saved sibling" || r.Sessions[2] != "topic-2" || len(f.rounds) != 0 {
		t.Fatalf("%+v %v", r, e)
	}
}
func TestResearchAlreadyCancelled(t *testing.T) {
	f := goodFake()
	c, cancel := context.WithCancel(context.Background())
	cancel()
	_, e := RunResearch(c, f)
	if !errors.Is(e, context.Canceled) || len(f.tasks) != 0 {
		t.Fatalf("%v %+v", e, f.tasks)
	}
}
func TestResearchEvidenceAndMutationIsolation(t *testing.T) {
	f := goodFake()
	selection := selected()
	f.research = func(_ context.Context, q TopicTask) (TurnResult, error) {
		if q.Topic != 5 || q.FollowUp > 0 {
			if q.Endpoint.Endpoint != "https://example.test" || len(q.Endpoint.Sources) != 1 || q.Endpoint.Sources[0] != "source" {
				t.Errorf("bad endpoint %+v", q)
			}
			expected := "report"
			if q.FinalAudit {
				expected = "updated endpoint report"
			}
			if q.EndpointReport != expected {
				t.Errorf("evidence %q want %q", q.EndpointReport, expected)
			}
			q.Endpoint.Sources[0] = "mutated task"
		}
		if q.FinalAudit {
			q.Actions[0].Description = "mutated"
			q.Actions[0].Sources[0] = "mutated"
		}
		answer := "report"
		if q.Topic == 5 && q.FollowUp > 0 {
			answer = "updated endpoint report"
		}
		return TurnResult{SessionID: fmt.Sprintf("topic-%d", q.Topic), Answer: answer}, nil
	}
	f.decide = func(s ResearchSnapshot) (ResearchDecision, error) {
		if s.Endpoint.Sources[0] != "source" {
			t.Errorf("gate changed %+v", s.Endpoint)
		}
		s.Endpoint.Sources[0] = "mutated reconcile"
		f.gate.Sources[0] = "mutated original"
		d := selection
		if s.Round == 0 {
			d.FollowUps = []FollowUpRequest{{5, []string{"check"}}, {2, []string{"check"}}}
		}
		return d, nil
	}
	f.finalize = func(s ResearchSnapshot) (ResearchFinalization, error) {
		if !s.FinalAudit || s.Authentication != "oauth" || s.Actions[0].Description != "register" || s.Actions[0].Sources[0] != "https://example.test" || s.Endpoint.Sources[0] != "source" {
			t.Errorf("bad final snapshot %+v", s)
		}
		s.Actions[0].Description = "mutated final"
		s.Actions[0].Sources[0] = "mutated final"
		s.Endpoint.Sources[0] = "mutated final"
		return ResearchFinalization{Dossier: "final dossier"}, nil
	}
	r, e := RunResearch(context.Background(), f)
	selection.Actions[0].Sources[0] = "mutated after return"
	if e != nil || r.Dossier != "final dossier" || r.Authentication != "oauth" || r.Actions[0].Description != "register" || r.Actions[0].Sources[0] != "https://example.test" {
		t.Fatalf("%+v %v", r, e)
	}
}
func TestResearchFinalization(t *testing.T) {
	for _, blocked := range []bool{false, true} {
		t.Run(fmt.Sprint(blocked), func(t *testing.T) {
			f := goodFake()
			f.finalize = func(ResearchSnapshot) (ResearchFinalization, error) {
				if blocked {
					return ResearchFinalization{Blockers: []string{"new evidence"}}, nil
				}
				return ResearchFinalization{}, nil
			}
			r, e := RunResearch(context.Background(), f)
			if blocked {
				if e != nil || len(r.Blockers) != 1 || r.Authentication != "oauth" {
					t.Fatalf("%+v %v", r, e)
				}
			} else if e == nil {
				t.Fatal("accepted empty dossier")
			}
			if r.Dossier != "" {
				t.Fatal("installed dossier")
			}
		})
	}
}
func TestResearchFiveTopicConcurrencyBound(t *testing.T) {
	f := goodFake()
	var mu sync.Mutex
	active, peak, total := 0, 0, 0
	four := make(chan struct{})
	release := make(chan struct{})
	f.decide = func(s ResearchSnapshot) (ResearchDecision, error) {
		d := selected()
		if s.Round == 0 {
			for i := 1; i <= 5; i++ {
				d.FollowUps = append(d.FollowUps, FollowUpRequest{i, []string{"check"}})
			}
		}
		return d, nil
	}
	f.research = func(c context.Context, q TopicTask) (TurnResult, error) {
		if q.FollowUp > 0 && !q.FinalAudit {
			mu.Lock()
			active++
			total++
			if active > peak {
				peak = active
			}
			if total == 4 {
				close(four)
			}
			mu.Unlock()
			select {
			case <-release:
			case <-c.Done():
				return TurnResult{}, c.Err()
			}
			mu.Lock()
			active--
			mu.Unlock()
		}
		return TurnResult{SessionID: fmt.Sprintf("topic-%d", q.Topic), Answer: "report"}, nil
	}
	c, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()
	done := make(chan error, 1)
	go func() { _, e := RunResearch(c, f); done <- e }()
	select {
	case <-four:
	case <-c.Done():
		t.Fatal("four calls did not start")
	}
	time.Sleep(20 * time.Millisecond)
	close(release)
	if e := <-done; e != nil {
		t.Fatal(e)
	}
	if peak != 4 || total != 5 || active != 0 {
		t.Fatalf("peak %d total %d active %d", peak, total, active)
	}
}
func TestResearchExternalActiveCancellation(t *testing.T) {
	f := goodFake()
	started := make(chan struct{}, 4)
	var mu sync.Mutex
	joined := 0
	f.research = func(c context.Context, q TopicTask) (TurnResult, error) {
		if q.Topic == 5 {
			return TurnResult{SessionID: "five", Answer: "endpoint"}, nil
		}
		started <- struct{}{}
		<-c.Done()
		mu.Lock()
		joined++
		mu.Unlock()
		return TurnResult{}, c.Err()
	}
	c, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()
	done := make(chan error, 1)
	go func() { _, e := RunResearch(c, f); done <- e }()
	for i := 0; i < 4; i++ {
		select {
		case <-started:
		case <-c.Done():
			t.Fatal("wave did not start")
		}
	}
	cancel()
	if e := <-done; !errors.Is(e, context.Canceled) {
		t.Fatal(e)
	}
	if joined != 4 || len(f.rounds) != 0 {
		t.Fatalf("joined=%d phases=%d", joined, len(f.rounds))
	}
}
