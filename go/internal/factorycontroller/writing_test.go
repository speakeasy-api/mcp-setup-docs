package factorycontroller

import (
	"context"
	"errors"
	"reflect"
	"testing"
	"time"
)

const writerOK = `{"completed":true,"open_questions":[]}`

type writingFake struct {
	t                                        *testing.T
	ops                                      []string
	fail, cancelAt, answer, repairAnswer, id string
	cancel                                   context.CancelFunc
	invalid                                  int
	deadline                                 time.Time
	research                                 ResearchResult
}

func (b *writingFake) step(ctx context.Context, op string) error {
	b.ops = append(b.ops, op)
	if op != "save" {
		d, ok := ctx.Deadline()
		if !ok {
			b.t.Fatal("missing deadline")
		}
		if b.deadline.IsZero() {
			b.deadline = d
			if time.Until(d) > 900*time.Second {
				b.t.Fatal("long deadline")
			}
		} else if d != b.deadline {
			b.t.Fatal("reset deadline")
		}
	}
	if b.cancelAt == op {
		b.cancel()
	}
	if b.fail == op {
		return errors.New("failed")
	}
	return nil
}
func (b *writingFake) SaveDossier(ctx context.Context, s string) error {
	if s != b.research.Dossier {
		b.t.Fatal("dossier")
	}
	return b.step(ctx, "save")
}
func (b *writingFake) BeginWriting(ctx context.Context) error { return b.step(ctx, "gate") }
func (b *writingFake) Write(ctx context.Context, task WriterTask) (TurnResult, error) {
	op := "write"
	answer := b.answer
	if task.Repair {
		op = "repair"
		answer = b.repairAnswer
		if task.SessionID != "writer-1" || !reflect.DeepEqual(task.Findings, []string{"fix"}) {
			b.t.Fatal("repair task")
		}
	} else if task.SessionID != "" {
		b.t.Fatal("initial identity")
	}
	if !reflect.DeepEqual(task.Research, b.research) {
		b.t.Fatal("research changed")
	}
	task.Research.Reports[1] = "mutation"
	task.Research.Sessions[1] = "mutation"
	task.Research.Actions[0].Sources[0] = "mutation"
	task.Research.Actions[0].Description = "mutation"
	id := "writer-1"
	if b.id != "" {
		id = b.id
	}
	return TurnResult{SessionID: id, Answer: answer}, b.step(ctx, op)
}
func (b *writingFake) Validate(ctx context.Context, repair bool) (ValidationResult, error) {
	op := "validate"
	if repair {
		op = "revalidate"
	}
	err := b.step(ctx, op)
	if b.invalid > 0 {
		b.invalid--
		return ValidationResult{Findings: []string{"fix"}}, err
	}
	return ValidationResult{Valid: true}, err
}
func writingResearch() ResearchResult {
	return ResearchResult{Dossier: "dossier", Authentication: "token", Actions: []SetupAction{{Description: "setup", Sources: []string{"source"}}}, Reports: map[int]string{1: "report"}, Sessions: map[int]string{1: "research-1"}}
}
func TestRunWriting(t *testing.T) {
	for _, tc := range []struct {
		name, answer, id, want string
		invalid                int
		ops                    []string
	}{
		{name: "success", want: "converged", ops: []string{"save", "gate", "write", "validate"}},
		{name: "repair", want: "converged", invalid: 1, ops: []string{"save", "gate", "write", "validate", "repair", "revalidate"}},
		{name: "invalid again", invalid: 2, ops: []string{"save", "gate", "write", "validate", "repair", "revalidate"}},
		{name: "questions", answer: `{"completed":true,"open_questions":["scope?"]}`, want: "awaiting_scope", ops: []string{"save", "gate", "write"}},
		{name: "incomplete", answer: `{"completed":false,"open_questions":[]}`, ops: []string{"save", "gate", "write"}},
		{name: "json", answer: `null`, ops: []string{"save", "gate", "write"}},
		{name: "identity", id: "bad id", ops: []string{"save", "gate", "write"}},
	} {
		t.Run(tc.name, func(t *testing.T) {
			r := writingResearch()
			b := &writingFake{t: t, research: writingResearch(), answer: writerOK, repairAnswer: writerOK, invalid: tc.invalid, id: tc.id}
			if tc.answer != "" {
				b.answer = tc.answer
			}
			out, err := RunWriting(context.Background(), b, r)
			if (err == nil) != (tc.want != "") || out.Outcome != tc.want {
				t.Fatalf("%+v %v", out, err)
			}
			if !reflect.DeepEqual(b.ops, tc.ops) {
				t.Fatal(b.ops)
			}
			if !reflect.DeepEqual(r, writingResearch()) {
				t.Fatal("mutated input")
			}
		})
	}
}
func TestWritingStopsAtEveryFailure(t *testing.T) {
	ops := []string{"save", "gate", "write", "validate", "repair", "revalidate"}
	for i, op := range ops {
		for _, cancel := range []bool{false, true} {
			t.Run(op+map[bool]string{true: "cancel", false: "error"}[cancel], func(t *testing.T) {
				ctx, stop := context.WithCancel(context.Background())
				defer stop()
				b := &writingFake{t: t, research: writingResearch(), answer: writerOK, repairAnswer: writerOK, invalid: 1, cancel: stop}
				if cancel {
					b.cancelAt = op
				} else {
					b.fail = op
				}
				out, err := RunWriting(ctx, b, writingResearch())
				if err == nil {
					t.Fatal("expected error")
				}
				if !reflect.DeepEqual(b.ops, ops[:i+1]) {
					t.Fatal(b.ops)
				}
				if i >= 2 && out.SessionID != "writer-1" {
					t.Fatal("lost identity")
				}
			})
		}
	}
}
func TestWritingReadinessAndParent(t *testing.T) {
	for _, r := range []ResearchResult{{}, {Dossier: "x", Blockers: []string{"blocked"}}} {
		b := &writingFake{t: t}
		if _, err := RunWriting(context.Background(), b, r); err == nil || len(b.ops) > 0 {
			t.Fatal("accepted incomplete")
		}
	}
	ctx, cancel := context.WithTimeout(context.Background(), time.Minute)
	defer cancel()
	b := &writingFake{t: t, research: writingResearch(), answer: writerOK}
	if _, err := RunWriting(ctx, b, writingResearch()); err != nil {
		t.Fatal(err)
	}
	d, _ := ctx.Deadline()
	if b.deadline != d {
		t.Fatal("parent deadline lost")
	}
}

type writingGuardFake struct {
	*writingFake
	validation             *ValidationResult
	repairID, repairOutput string
	blankID                bool
}

func (b *writingGuardFake) Write(ctx context.Context, task WriterTask) (TurnResult, error) {
	r, err := b.writingFake.Write(ctx, task)
	if b.blankID {
		r.SessionID = ""
	}
	if task.Repair {
		if b.repairID != "" {
			r.SessionID = b.repairID
		}
		if b.repairOutput != "" {
			r.Answer = b.repairOutput
		}
	}
	return r, err
}
func (b *writingGuardFake) Validate(ctx context.Context, repair bool) (ValidationResult, error) {
	r, err := b.writingFake.Validate(ctx, repair)
	if b.validation != nil {
		r = *b.validation
	}
	return r, err
}
func TestWritingGuards(t *testing.T) {
	for _, tc := range []struct {
		name                   string
		validation             *ValidationResult
		repairID, repairOutput string
		blankID                bool
		ops                    []string
	}{
		{name: "valid findings", validation: &ValidationResult{Valid: true, Findings: []string{"fix"}}, ops: []string{"save", "gate", "write", "validate"}},
		{name: "invalid empty", validation: &ValidationResult{}, ops: []string{"save", "gate", "write", "validate"}},
		{name: "invalid blank", validation: &ValidationResult{Findings: []string{" "}}, ops: []string{"save", "gate", "write", "validate"}},
		{name: "resume mismatch", repairID: "other-session", ops: []string{"save", "gate", "write", "validate", "repair"}},
		{name: "repair malformed", repairOutput: `{"completed":true,"open_questions":null}`, ops: []string{"save", "gate", "write", "validate", "repair"}},
		{name: "initial missing identity", blankID: true, ops: []string{"save", "gate", "write"}},
	} {
		t.Run(tc.name, func(t *testing.T) {
			b := &writingGuardFake{writingFake: &writingFake{t: t, research: writingResearch(), answer: writerOK, repairAnswer: writerOK, invalid: 1}, validation: tc.validation, repairID: tc.repairID, repairOutput: tc.repairOutput, blankID: tc.blankID}
			if _, err := RunWriting(context.Background(), b, writingResearch()); err == nil {
				t.Fatal("guard accepted")
			}
			if !reflect.DeepEqual(b.ops, tc.ops) {
				t.Fatal(b.ops)
			}
		})
	}
}
func TestWritingAlreadyCancelled(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	b := &writingFake{t: t}
	if _, err := RunWriting(ctx, b, writingResearch()); !errors.Is(err, context.Canceled) || len(b.ops) != 0 {
		t.Fatalf("err=%v ops=%v", err, b.ops)
	}
}
