package main

import (
	"bytes"
	"encoding/json"
	"path/filepath"
	"strings"
	"testing"

	"github.com/speakeasy-api/mcp-setup-docs/go/internal/guidecheck"
)

func TestRunRequiresGuidePath(t *testing.T) {
	var stdout, stderr bytes.Buffer
	if code := run(nil, t.TempDir(), &stdout, &stderr); code != 1 {
		t.Fatalf("run exit = %d, want 1", code)
	}
	if !strings.Contains(stderr.String(), "usage:") {
		t.Fatalf("stderr = %q, want usage", stderr.String())
	}
}

func TestRunPrintsHumanFindingsAndReturnsTwoForBlockers(t *testing.T) {
	var stdout, stderr bytes.Buffer
	missingGuide := filepath.Join(t.TempDir(), "missing")
	if code := run([]string{missingGuide}, t.TempDir(), &stdout, &stderr); code != 2 {
		t.Fatalf("run exit = %d, want 2; stderr: %s", code, stderr.String())
	}
	if !strings.Contains(stdout.String(), "blocker external external.md: external.md is missing.") {
		t.Fatalf("stdout = %q", stdout.String())
	}
}

func TestRunJSONEmitsOneArray(t *testing.T) {
	var stdout, stderr bytes.Buffer
	missingGuide := filepath.Join(t.TempDir(), "missing")
	if code := run([]string{"--json", missingGuide}, t.TempDir(), &stdout, &stderr); code != 2 {
		t.Fatalf("run exit = %d, want 2; stderr: %s", code, stderr.String())
	}
	var findings []guidecheck.Finding
	if err := json.Unmarshal(stdout.Bytes(), &findings); err != nil {
		t.Fatalf("JSON output %q: %v", stdout.String(), err)
	}
	if len(findings) != 2 {
		t.Fatalf("len(findings) = %d, want 2", len(findings))
	}
}
