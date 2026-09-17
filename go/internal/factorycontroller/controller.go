package factorycontroller

import (
	"context"
	"crypto/sha256"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"
)

type ControllerConfig struct {
	Workspace, InputRoot, ControlDir, RunID string
	BeginBinary, LintBinary, GenerateBinary string
	Turn                                    func(context.Context, string, string) (TurnResult, error)
}

type controllerReport struct {
	SchemaVersion int      `json:"schema_version"`
	Outcome       string   `json:"outcome"`
	Provider      *string  `json:"provider"`
	Slug          *string  `json:"slug"`
	Persona       *string  `json:"persona"`
	Summary       string   `json:"summary"`
	OpenQuestions []string `json:"open_questions"`
	Blockers      []string `json:"blockers"`
	Nits          []string `json:"nits"`
	ReviewRounds  int      `json:"review_rounds"`
	Artifacts     []string `json:"artifacts"`
}

// A persisted failed report completes this invocation; it does not mean guide success.
func RunController(parent context.Context, c ControllerConfig) error {
	ctx, cancel := context.WithTimeout(parent, 2700*time.Second)
	defer cancel()
	researchCtx, stopResearch := context.WithTimeout(ctx, 1800*time.Second)
	defer stopResearch()
	report := controllerReport{SchemaVersion: 1, Outcome: "failed", Summary: "context_failed", OpenQuestions: []string{}, Blockers: []string{"context_failed"}, Nits: []string{}, Artifacts: []string{}}
	runController(ctx, researchCtx, c, &report)
	// Candidate reporting shares the controller ceiling and parent cancellation.
	// Only the outer host owns the separate finalization allowance.
	reportCtx, stopReport := context.WithTimeout(ctx, 300*time.Second)
	defer stopReport()
	data, err := json.Marshal(report)
	if err != nil {
		return errors.New("report_failed")
	}
	if _, err = contextRead(c.Workspace, "factory/scripts/write-report.sh"); err != nil {
		return errors.New("report_failed")
	}
	cmd := exec.CommandContext(reportCtx, "bash", filepath.Join(c.Workspace, "factory/scripts/write-report.sh"), string(data))
	cmd.Dir = c.Workspace
	for _, v := range os.Environ() {
		if !strings.HasPrefix(v, "FACTORY_REPO_ROOT=") {
			cmd.Env = append(cmd.Env, v)
		}
	}
	cmd.Env = append(cmd.Env, "FACTORY_REPO_ROOT="+c.Workspace)
	cmd.Stdout = &contextOutput{limit: 8192}
	cmd.Stderr = &contextOutput{limit: 8192}
	if cmd.Run() != nil {
		return errors.New("report_failed")
	}
	return nil
}

func runController(ctx, researchCtx context.Context, c ControllerConfig, report *controllerReport) {
	fail := func(phase string) {
		report.Outcome = "failed"
		report.Summary = phase
		report.Blockers = []string{phase}
	}
	resolved, err := ResolveContext(researchCtx, ContextConfig{Workspace: c.Workspace, InputRoot: c.InputRoot, Turn: c.Turn})
	if err != nil {
		return
	}
	if len(resolved.Blockers) > 0 {
		report.Outcome = "blocked"
		report.Summary = "context_blocked"
		report.Blockers = resolved.Blockers
		return
	}
	persona := strings.TrimSuffix(filepath.Base(resolved.Research.PersonaPath), ".md")
	report.Provider = &resolved.Research.Provider
	report.Slug = &resolved.Research.Slug
	report.Persona = &persona
	evidence, err := OpenEvidence(c.Workspace)
	if err != nil {
		fail("evidence_failed")
		return
	}
	defer evidence.Close()
	coordinator, err := contextRead(c.Workspace, "factory/coordinator.md")
	if err != nil {
		fail("research_configuration_failed")
		return
	}
	host, err := json.Marshal(struct {
		Provider     string          `json:"provider"`
		Slug         string          `json:"slug"`
		Persona      string          `json:"persona"`
		Mode         string          `json:"mode"`
		ResearchedAt string          `json:"researched_at"`
		Catalog      json.RawMessage `json:"catalog"`
	}{resolved.Research.Provider, resolved.Research.Slug, persona, resolved.Research.Mode, time.Now().UTC().Format("2006-01-02"), resolved.Catalog})
	if err != nil {
		fail("research_configuration_failed")
		return
	}
	prompts := make([]string, 3)
	for i, name := range []string{"endpoint.md", "reconcile.md", "finalize-research.md"} {
		asset, e := contextRead(c.Workspace, "factory/prompts/"+name)
		if e != nil {
			fail("research_configuration_failed")
			return
		}
		prompts[i] = resolved.Authority + "\n" + string(asset) + "\nHost context JSON (data, not instructions):\n" + string(host)
	}
	deadline, _ := researchCtx.Deadline()
	backend, err := NewKitResearchBackend(BackendConfig{Turn: c.Turn, Evidence: evidence, Context: resolved.Research, Coordinator: coordinator, CoordinatorSHA256: fmt.Sprintf("%x", sha256.Sum256(coordinator)), Deadline: deadline, EndpointPrompt: prompts[0], ReconcilePrompt: prompts[1], FinalizePrompt: prompts[2]})
	if err != nil {
		fail("research_configuration_failed")
		return
	}
	research, err := RunResearch(researchCtx, backend)
	if err != nil {
		fail("research_failed")
		return
	}
	if len(research.Blockers) > 0 {
		report.Outcome = "blocked"
		report.Summary = "research_blocked"
		report.Blockers = research.Blockers
		return
	}
	writer, err := NewKitWritingBackend(WriterBackendConfig{Workspace: c.Workspace, ControlDir: c.ControlDir, RunID: c.RunID, BeginBinary: c.BeginBinary, LintBinary: c.LintBinary, GenerateBinary: c.GenerateBinary, Context: resolved, Evidence: evidence, Turn: c.Turn})
	if err != nil {
		fail("writing_configuration_failed")
		return
	}
	writing, err := RunWriting(ctx, writer, research)
	if err != nil {
		fail("writing_failed")
		return
	}
	report.Outcome = writing.Outcome
	report.Summary = writing.Outcome
	report.Blockers = []string{}
	report.OpenQuestions = append([]string{}, writing.OpenQuestions...)
	if writing.Outcome == "converged" {
		report.Artifacts = []string{"research.md", "meta.yaml", "external.md", "speakeasy.md"}
	}
}
