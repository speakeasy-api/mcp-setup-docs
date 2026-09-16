package factorycontroller

import (
	"context"
	"errors"
	"maps"
	"strings"
	"time"
)

type WriterTask struct {
	SessionID string
	Repair    bool
	Findings  []string
	Research  ResearchResult
}
type ValidationResult struct {
	Valid    bool
	Findings []string
}
type WritingBackend interface {
	SaveDossier(context.Context, string) error
	BeginWriting(context.Context) error
	Write(context.Context, WriterTask) (TurnResult, error)
	Validate(context.Context, bool) (ValidationResult, error)
}
type WritingResult struct {
	Outcome, SessionID string
	OpenQuestions      []string
}

func cloneWritingResearch(r ResearchResult) ResearchResult {
	r.Reports = maps.Clone(r.Reports)
	r.Sessions = maps.Clone(r.Sessions)
	r.Actions = cloneResearchActions(r.Actions)
	r.Blockers = append([]string(nil), r.Blockers...)
	return r
}

// RunWriting owns the dossier gate, single writer and at most one same-session
// repair. Backends must honor cancellation; failures never trigger a retry.
func RunWriting(ctx context.Context, b WritingBackend, research ResearchResult) (WritingResult, error) {
	var out WritingResult
	if b == nil {
		return out, errors.New("nil writing backend")
	}
	if len(research.Blockers) > 0 || strings.TrimSpace(research.Dossier) == "" || strings.TrimSpace(research.Authentication) == "" || len(research.Actions) == 0 {
		return out, errors.New("incomplete research")
	}
	for _, a := range research.Actions {
		if strings.TrimSpace(a.Description) == "" || len(a.Sources) == 0 {
			return out, errors.New("incomplete research actions")
		}
		for _, s := range a.Sources {
			if strings.TrimSpace(s) == "" {
				return out, errors.New("empty research source")
			}
		}
	}
	research = cloneWritingResearch(research)
	if err := ctx.Err(); err != nil {
		return out, err
	}
	if err := b.SaveDossier(ctx, research.Dossier); err != nil {
		return out, err
	}
	if err := ctx.Err(); err != nil {
		return out, err
	}
	ctx, cancel := context.WithTimeout(ctx, 900*time.Second)
	defer cancel()
	if err := ctx.Err(); err != nil {
		return out, err
	}
	if err := b.BeginWriting(ctx); err != nil {
		return out, err
	}
	var findings []string
	for stage := 0; stage < 2; stage++ {
		if err := ctx.Err(); err != nil {
			return out, err
		}
		previous := out.SessionID
		turn, err := b.Write(ctx, WriterTask{SessionID: previous, Repair: stage == 1, Findings: append([]string(nil), findings...), Research: cloneWritingResearch(research)})
		if turn.SessionID != "" {
			out.SessionID = turn.SessionID
		}
		if err != nil {
			return out, err
		}
		if err := ctx.Err(); err != nil {
			return out, err
		}
		if !sessionIdentity.MatchString(turn.SessionID) || (stage == 1 && turn.SessionID != previous) {
			return out, errors.New("invalid writer session identity")
		}
		decision, err := DecodeWriter([]byte(turn.Answer))
		if err != nil {
			return out, err
		}
		if len(decision.OpenQuestions) > 0 {
			out.Outcome = "awaiting_scope"
			out.OpenQuestions = append([]string(nil), decision.OpenQuestions...)
			return out, nil
		}
		if !decision.Completed {
			return out, errors.New("writer did not complete")
		}
		if err := ctx.Err(); err != nil {
			return out, err
		}
		validation, err := b.Validate(ctx, stage == 1)
		if err != nil {
			return out, err
		}
		if err := ctx.Err(); err != nil {
			return out, err
		}
		if validation.Valid {
			if len(validation.Findings) != 0 {
				return out, errors.New("valid result has findings")
			}
			out.Outcome = "converged"
			return out, nil
		}
		if len(validation.Findings) == 0 {
			return out, errors.New("invalid result lacks findings")
		}
		for _, f := range validation.Findings {
			if strings.TrimSpace(f) == "" {
				return out, errors.New("blank validation finding")
			}
		}
		if stage == 1 {
			return out, errors.New("repair failed validation")
		}
		findings = append([]string(nil), validation.Findings...)
	}
	return out, errors.New("writing did not converge")
}
