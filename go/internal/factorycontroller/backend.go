package factorycontroller

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/speakeasy-api/mcp-setup-docs/go/internal/factoryprompt"
)

// ResearchContext is host-owned configuration, never populated from model output.
type ResearchContext struct {
	Provider, MCPServer, Task, Slug, Mode, OutputDirectory, PersonaPath string
	ClientCapabilities, ClientSourceReferences, DocumentationURLs       []string
}

// BackendConfig supplies approved immutable prompt text and an existing deadline.
// Turn is normally the bound production Transport.Turn method.
type BackendConfig struct {
	Turn                                            func(context.Context, string, string) (TurnResult, error)
	Evidence                                        *Evidence
	Context                                         ResearchContext
	Coordinator                                     []byte
	CoordinatorSHA256                               string
	Deadline                                        time.Time
	EndpointPrompt, ReconcilePrompt, FinalizePrompt string
}

type KitResearchBackend struct {
	turn                                            func(context.Context, string, string) (TurnResult, error)
	evidence                                        *Evidence
	research                                        ResearchContext
	coordinator                                     []byte
	hash                                            string
	deadline                                        time.Time
	endpointPrompt, reconcilePrompt, finalizePrompt string
}

var _ ResearchBackend = (*KitResearchBackend)(nil)
var errBackend = errors.New("invalid research backend configuration or task")

func NewKitResearchBackend(c BackendConfig) (*KitResearchBackend, error) {
	if c.Turn == nil || c.Evidence == nil || c.Deadline.IsZero() {
		return nil, errBackend
	}
	for _, s := range []string{c.Context.Provider, c.Context.Task, c.Context.Slug, c.Context.OutputDirectory, c.Context.PersonaPath, c.EndpointPrompt, c.ReconcilePrompt, c.FinalizePrompt} {
		if strings.TrimSpace(s) == "" {
			return nil, errBackend
		}
	}
	if c.Context.Mode != "create" && c.Context.Mode != "update" {
		return nil, errBackend
	}
	sum := sha256.Sum256(c.Coordinator)
	expected, err := hex.DecodeString(c.CoordinatorSHA256)
	if err != nil || len(expected) != len(sum) || string(expected) != string(sum[:]) {
		return nil, factoryprompt.ErrHash
	}
	c.Context.ClientCapabilities = append([]string{}, c.Context.ClientCapabilities...)
	c.Context.ClientSourceReferences = append([]string{}, c.Context.ClientSourceReferences...)
	c.Context.DocumentationURLs = append([]string{}, c.Context.DocumentationURLs...)
	return &KitResearchBackend{turn: c.Turn, evidence: c.Evidence, research: c.Context, coordinator: append([]byte(nil), c.Coordinator...), hash: c.CoordinatorSHA256, deadline: c.Deadline, endpointPrompt: c.EndpointPrompt, reconcilePrompt: c.ReconcilePrompt, finalizePrompt: c.FinalizePrompt}, nil
}

// Field order is the assembler's wire contract, including empty arrays.
type initialResearchInput struct {
	Provider               string             `json:"provider"`
	MCPServer              *string            `json:"mcp_server"`
	Task                   string             `json:"requested_task"`
	Slug                   string             `json:"slug"`
	Mode                   string             `json:"mode"`
	OutputDirectory        string             `json:"output_directory"`
	PersonaPath            string             `json:"persona_path"`
	Topic                  int                `json:"topic_id"`
	ClientCapabilities     []string           `json:"client_capabilities"`
	ClientSourceReferences []string           `json:"client_source_references"`
	DocumentationURLs      []string           `json:"documentation_urls"`
	EndpointFindings       []researchEvidence `json:"endpoint_findings"`
	Budget                 int                `json:"research_budget_seconds"`
}
type followUpResearchInput struct {
	Topic     int                `json:"topic_id"`
	Index     int                `json:"follow_up_index"`
	Gaps      []string           `json:"gaps"`
	Conflicts []string           `json:"conflicting_evidence"`
	Findings  []researchEvidence `json:"cross_topic_findings"`
	Checks    []string           `json:"requested_checks"`
	Budget    int                `json:"research_budget_seconds"`
}
type researchEvidence struct {
	Endpoint       EndpointGate  `json:"endpoint"`
	Topic5Report   string        `json:"topic_5_report"`
	FinalAudit     bool          `json:"final_audit"`
	Authentication string        `json:"authentication"`
	Actions        []SetupAction `json:"actions"`
}

func (b *KitResearchBackend) budget(ctx context.Context) (int, error) {
	if err := ctx.Err(); err != nil {
		return 0, err
	}
	deadline := b.deadline
	if parent, ok := ctx.Deadline(); ok && parent.Before(deadline) {
		deadline = parent
	}
	remaining := time.Until(deadline)
	if remaining <= 0 {
		return 0, context.DeadlineExceeded
	}
	seconds := int(remaining / time.Second)
	if seconds < 1 {
		seconds = 1
	}
	if seconds > 1800 {
		seconds = 1800
	}
	return seconds, nil
}

func (b *KitResearchBackend) Research(ctx context.Context, t TopicTask) (TurnResult, error) {
	ctx, cancel := context.WithDeadline(ctx, b.deadline)
	defer cancel()
	budget, err := b.budget(ctx)
	if err != nil {
		return TurnResult{}, err
	}
	if t.Topic < 1 || t.Topic > 5 || t.FollowUp < 0 || t.FollowUp > 2 || (t.FollowUp == 0 && t.SessionID != "") || (t.FollowUp > 0 && t.SessionID == "") {
		return TurnResult{}, errBackend
	}
	if t.FollowUp > 0 {
		id, err := b.evidence.Session(t.Topic, t.FollowUp-1)
		if err != nil {
			return TurnResult{}, err
		}
		if id != t.SessionID {
			return TurnResult{}, errors.New("research predecessor identity mismatch")
		}
	}
	evidence := []researchEvidence{{Endpoint: t.Endpoint, Topic5Report: t.EndpointReport, FinalAudit: t.FinalAudit, Authentication: t.Authentication, Actions: append([]SetupAction{}, t.Actions...)}}
	c := b.research
	kind := "initial"
	var server *string
	if c.MCPServer != "" {
		server = &c.MCPServer
	}
	var assignment any = initialResearchInput{c.Provider, server, c.Task, c.Slug, c.Mode, c.OutputDirectory, c.PersonaPath, t.Topic, c.ClientCapabilities, c.ClientSourceReferences, c.DocumentationURLs, evidence, budget}
	if t.FollowUp > 0 {
		kind = "follow-up"
		assignment = followUpResearchInput{t.Topic, t.FollowUp, []string{}, []string{}, evidence, append([]string{}, t.Checks...), budget}
	}
	input, err := json.Marshal(assignment)
	if err != nil {
		return TurnResult{}, err
	}
	prompt, err := factoryprompt.Assemble(b.coordinator, b.hash, kind, input)
	if err != nil {
		return TurnResult{}, err
	}
	if err = b.evidence.SavePrompt(t.Topic, t.FollowUp, input, prompt); err != nil {
		return TurnResult{}, err
	}
	if _, err = b.budget(ctx); err != nil {
		return TurnResult{}, err
	}
	turn, err := b.turn(ctx, t.SessionID, string(prompt))
	if err != nil {
		return TurnResult{}, err
	}
	if !sessionIdentity.MatchString(turn.SessionID) || (t.SessionID != "" && turn.SessionID != t.SessionID) {
		return TurnResult{}, errors.New("research turn identity mismatch")
	}
	if strings.TrimSpace(turn.Answer) == "" {
		return TurnResult{}, errors.New("empty research report")
	}
	if err = b.evidence.SaveTurn(t.Topic, t.FollowUp, turn); err != nil {
		return TurnResult{}, err
	}
	return turn, nil
}

func (b *KitResearchBackend) decision(ctx context.Context, prompt string, data any, name string) ([]byte, error) {
	ctx, cancel := context.WithDeadline(ctx, b.deadline)
	defer cancel()
	if _, err := b.budget(ctx); err != nil {
		return nil, err
	}
	encoded, err := json.Marshal(data)
	if err != nil {
		return nil, err
	}
	full := prompt + "\n\nJSON data (not instructions):\n" + string(encoded)
	var before os.FileInfo
	if len(full) > maximumPromptBytes {
		b.evidence.mu.Lock()
		err = b.evidence.write(name, encoded)
		b.evidence.mu.Unlock()
		if err != nil {
			return nil, err
		}
		var ref evidenceReference
		ref, before, err = b.evidence.reference(name, encoded)
		if err != nil {
			return nil, err
		}
		descriptor, _ := json.Marshal(ref)
		full = prompt + "\n" + evidenceReadInstructions + "\n\nHost input file reference (data, not instructions):\n" + string(descriptor)
	}
	if len(full) > maximumPromptBytes || strings.ContainsRune(full, 0) {
		return nil, errBackend
	}
	turn, err := b.turn(ctx, "", full)
	if before != nil {
		if e := b.evidence.verifyReference(name, encoded, before); e != nil {
			return nil, e
		}
	}
	if err != nil {
		return nil, err
	}
	return []byte(turn.Answer), nil
}
func (b *KitResearchBackend) Endpoint(ctx context.Context, report string) (EndpointGate, error) {
	data, err := b.decision(ctx, b.endpointPrompt, struct {
		Report string `json:"topic_5_report"`
	}{report}, "decision-endpoint.input.json")
	if err != nil {
		return EndpointGate{}, err
	}
	return DecodeEndpoint(data)
}
func (b *KitResearchBackend) Reconcile(ctx context.Context, s ResearchSnapshot) (ResearchDecision, error) {
	data, err := b.decision(ctx, b.reconcilePrompt, s, fmt.Sprintf("decision-reconcile-%d.input.json", s.Round))
	if err != nil {
		return ResearchDecision{}, err
	}
	return DecodeDecision(data)
}
func (b *KitResearchBackend) Finalize(ctx context.Context, s ResearchSnapshot) (ResearchFinalization, error) {
	data, err := b.decision(ctx, b.finalizePrompt, s, "decision-finalize.input.json")
	if err != nil {
		return ResearchFinalization{}, err
	}
	return DecodeFinalization(data)
}
