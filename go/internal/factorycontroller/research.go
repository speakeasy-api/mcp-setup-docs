package factorycontroller

import (
	"context"
	"errors"
	"fmt"
	"maps"
	"strings"
)

type TopicTask struct {
	Endpoint        EndpointGate
	EndpointReport  string
	Topic, FollowUp int
	SessionID       string
	Checks          []string
	FinalAudit      bool
	Authentication  string
	Actions         []SetupAction
}
type SetupAction struct {
	Description string
	Sources     []string
}
type EndpointGate struct {
	Established       bool
	Endpoint          string
	Sources, Blockers []string
}
type FollowUpRequest struct {
	Topic  int
	Checks []string
}
type ResearchDecision struct {
	Authentication string
	Actions        []SetupAction
	FollowUps      []FollowUpRequest
	Blockers       []string
	Dossier        string
}
type ResearchSnapshot struct {
	Reports        map[int]string
	Endpoint       EndpointGate
	Round          int
	FinalAudit     bool
	Authentication string
	Actions        []SetupAction
}
type ResearchFinalization struct {
	Dossier  string
	Blockers []string
}

type ResearchBackend interface {
	Finalize(context.Context, ResearchSnapshot) (ResearchFinalization, error)
	Research(context.Context, TopicTask) (TurnResult, error)
	Endpoint(context.Context, string) (EndpointGate, error)
	Reconcile(context.Context, ResearchSnapshot) (ResearchDecision, error)
}
type ResearchResult struct {
	Authentication string
	Actions        []SetupAction
	Dossier        string
	Reports        map[int]string
	Sessions       map[int]string
	Blockers       []string
}

// RunResearch owns scheduling and session identities. The backend must return
// when its context is cancelled; every started wave is joined before returning.
func RunResearch(ctx context.Context, b ResearchBackend) (ResearchResult, error) {
	r := ResearchResult{Reports: map[int]string{}, Sessions: map[int]string{}}
	if b == nil {
		return r, errors.New("nil research backend")
	}
	if err := researchWave(ctx, b, []TopicTask{{Topic: 5}}, &r); err != nil {
		return r, err
	}
	if err := ctx.Err(); err != nil {
		return r, err
	}
	gate, err := b.Endpoint(ctx, r.Reports[5])
	if err != nil {
		return r, err
	}
	if err := ctx.Err(); err != nil {
		return r, err
	}
	gate = cloneResearchEndpoint(gate)
	if !gate.Established || strings.TrimSpace(gate.Endpoint) == "" || len(gate.Blockers) > 0 {
		r.Blockers = append([]string(nil), gate.Blockers...)
		if len(r.Blockers) == 0 {
			r.Blockers = []string{"endpoint not established"}
		}
		return r, nil
	}
	initial := make([]TopicTask, 4)
	for i := range initial {
		initial[i] = TopicTask{Topic: i + 1, Endpoint: cloneResearchEndpoint(gate), EndpointReport: r.Reports[5]}
	}
	if err := researchWave(ctx, b, initial, &r); err != nil {
		return r, err
	}
	counts := map[int]int{}
	var decision ResearchDecision
	round := 0
	for {
		if err := ctx.Err(); err != nil {
			return r, err
		}
		decision, err = b.Reconcile(ctx, ResearchSnapshot{Reports: maps.Clone(r.Reports), Endpoint: cloneResearchEndpoint(gate), Round: round})
		if err != nil {
			return r, err
		}
		if err := ctx.Err(); err != nil {
			return r, err
		}
		if len(decision.Blockers) > 0 {
			r.Blockers = append([]string(nil), decision.Blockers...)
			return r, nil
		}
		if len(decision.FollowUps) == 0 {
			break
		}
		if round == 2 {
			return r, errors.New("follow-ups exceed two rounds")
		}
		seen := map[int]bool{}
		tasks := make([]TopicTask, 0, len(decision.FollowUps))
		for _, q := range decision.FollowUps {
			if q.Topic < 1 || q.Topic > 5 || seen[q.Topic] || len(q.Checks) == 0 {
				return r, errors.New("invalid follow-up request")
			}
			for _, check := range q.Checks {
				if strings.TrimSpace(check) == "" {
					return r, errors.New("empty follow-up check")
				}
			}
			if q.Topic == 1 && counts[1] >= 1 {
				return r, errors.New("Topic 1 follow-up reserved for audit")
			}
			seen[q.Topic] = true
			tasks = append(tasks, TopicTask{Endpoint: cloneResearchEndpoint(gate), EndpointReport: r.Reports[5], Topic: q.Topic, FollowUp: counts[q.Topic] + 1, SessionID: r.Sessions[q.Topic], Checks: append([]string(nil), q.Checks...)})
		}
		if err := researchWave(ctx, b, tasks, &r); err != nil {
			return r, err
		}
		for _, task := range tasks {
			counts[task.Topic]++
		}
		round++
	}
	if strings.TrimSpace(decision.Authentication) == "" || len(decision.Actions) == 0 {
		r.Blockers = []string{"authentication and sourced setup actions required"}
		return r, nil
	}
	for _, a := range decision.Actions {
		if strings.TrimSpace(a.Description) == "" || len(a.Sources) == 0 {
			r.Blockers = []string{"sourced setup actions required"}
			return r, nil
		}
		for _, source := range a.Sources {
			if strings.TrimSpace(source) == "" {
				r.Blockers = []string{"empty action source"}
				return r, nil
			}
		}
	}
	// Keep an independent copy: backend-owned slices cannot rewrite what was audited.
	authentication := decision.Authentication
	actions := cloneResearchActions(decision.Actions)
	audit := TopicTask{Endpoint: cloneResearchEndpoint(gate), EndpointReport: r.Reports[5], Topic: 1, FollowUp: counts[1] + 1, SessionID: r.Sessions[1], FinalAudit: true, Authentication: authentication, Actions: cloneResearchActions(actions)}
	if err := researchWave(ctx, b, []TopicTask{audit}, &r); err != nil {
		return r, err
	}
	if err := ctx.Err(); err != nil {
		return r, err
	}
	r.Authentication = authentication
	r.Actions = cloneResearchActions(actions)
	final, err := b.Finalize(ctx, ResearchSnapshot{Reports: maps.Clone(r.Reports), Endpoint: cloneResearchEndpoint(gate), Round: round, FinalAudit: true, Authentication: authentication, Actions: cloneResearchActions(actions)})
	if err != nil {
		return r, err
	}
	if err := ctx.Err(); err != nil {
		return r, err
	}
	if len(final.Blockers) > 0 {
		r.Blockers = append([]string(nil), final.Blockers...)
		return r, nil
	}
	if strings.TrimSpace(final.Dossier) == "" {
		return r, errors.New("empty research dossier")
	}
	r.Dossier = final.Dossier
	return r, nil
}

func cloneResearchEndpoint(gate EndpointGate) EndpointGate {
	gate.Sources = append([]string(nil), gate.Sources...)
	gate.Blockers = append([]string(nil), gate.Blockers...)
	return gate
}

func cloneResearchActions(actions []SetupAction) []SetupAction {
	out := make([]SetupAction, len(actions))
	for i, a := range actions {
		out[i] = SetupAction{Description: a.Description, Sources: append([]string(nil), a.Sources...)}
	}
	return out
}

// Only this collector writes result maps. It drains successes even after the
// first failure, so already-completed reports are not lost to sibling failure.
func researchWave(ctx context.Context, b ResearchBackend, tasks []TopicTask, r *ResearchResult) error {
	if err := ctx.Err(); err != nil {
		return err
	}
	wave, cancel := context.WithCancel(ctx)
	defer cancel()
	type completed struct {
		task TopicTask
		turn TurnResult
		err  error
	}
	done := make(chan completed, len(tasks))
	slots := make(chan struct{}, 4)
	for _, task := range tasks {
		go func() {
			select {
			case slots <- struct{}{}:
				defer func() { <-slots }()
			case <-wave.Done():
				done <- completed{task: task, err: wave.Err()}
				return
			}
			if err := wave.Err(); err != nil {
				done <- completed{task: task, err: err}
				return
			}
			turn, err := b.Research(wave, task)
			done <- completed{task, turn, err}
		}()
	}
	var first error
	for range tasks {
		c := <-done
		err := c.err
		if err == nil {
			if strings.TrimSpace(c.turn.Answer) == "" || !sessionIdentity.MatchString(c.turn.SessionID) {
				err = errors.New("invalid research output or session identity")
			} else if c.task.SessionID != "" && c.task.SessionID != c.turn.SessionID {
				err = errors.New("research session identity changed")
			} else if c.task.SessionID == "" {
				for topic, id := range r.Sessions {
					if topic != c.task.Topic && id == c.turn.SessionID {
						err = errors.New("duplicate research session identity")
						break
					}
				}
			}
		}
		if err != nil {
			if first == nil {
				first = fmt.Errorf("topic %d: %w", c.task.Topic, err)
				cancel()
			}
			continue
		}
		r.Reports[c.task.Topic] = c.turn.Answer
		if c.task.SessionID == "" {
			r.Sessions[c.task.Topic] = c.turn.SessionID
		}
	}
	if first != nil {
		return first
	}
	return ctx.Err()
}
