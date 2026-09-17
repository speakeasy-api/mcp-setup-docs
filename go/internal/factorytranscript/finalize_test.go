package factorytranscript

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
)

func TestFinalizeLifecycleDominates(t *testing.T) {
	for _, termination := range []string{"research_timeout", "provider_exit", "completed"} {
		t.Run(termination, func(t *testing.T) {
			home, work, out := exportFixture(t)
			private := filepath.Dir(home)
			os.Chmod(private, 0700)
			export := filepath.Dir(out)
			os.Mkdir(private+"/host", 0700)
			writeCandidate(t, work, "converged")
			code := 0
			if termination != "completed" {
				code = 1
			}
			data, _ := json.Marshal(map[string]any{"version": 1, "run_id": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", "termination": termination, "exit_code": code, "container_removed": true})
			result := private + "/host/result.json"
			os.WriteFile(result, data, 0600)
			_ = Finalize(private, result, export, []string{"synthetic-report-secret"})
			b, err := os.ReadFile(export + "/run-report.json")
			if err != nil {
				t.Fatal(err)
			}
			report, err := decodeReport(b)
			if err != nil {
				t.Fatal(err)
			}
			if termination != "completed" && (report["outcome"] != "failed" || len(report["artifacts"].([]any)) != 0) {
				t.Fatal("stale success overrides lifecycle")
			}
			if _, err := os.Stat(export + "/guide"); !os.IsNotExist(err) {
				t.Fatal("unvalidated guide became installable")
			}
		})
	}
}
func TestFinalizeMissingReportAndUnreadable(t *testing.T) {
	home, _, out := exportFixture(t)
	private := filepath.Dir(home)
	os.Chmod(private, 0700)
	export := filepath.Dir(out)
	os.Mkdir(private+"/host", 0700)
	result := private + "/host/result.json"
	os.WriteFile(result, []byte(`{"version":1,"run_id":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","termination":"completed","exit_code":0,"container_removed":true}`), 0600)
	os.WriteFile(home+"/.kit/sessions/w-test/child.jsonl", []byte("malformed\n"), 0600)
	if Finalize(private, result, export, nil) == nil {
		t.Fatal("unreadable accepted")
	}
	b, err := os.ReadFile(export + "/run-report.json")
	if err != nil {
		t.Fatal("failure report missing")
	}
	r, err := decodeReport(b)
	if err != nil || r["outcome"] != "failed" {
		t.Fatal("invalid fallback")
	}
	if _, err := os.Stat(export + "/session-transcript.json"); !os.IsNotExist(err) {
		t.Fatal("raw fallback")
	}
}

func TestFinalizeUnconfirmedRemovalDoesNotReadOrClean(t *testing.T) {
	home, work, out := exportFixture(t)
	private := filepath.Dir(home)
	os.Chmod(private, 0700)
	os.Mkdir(private+"/host", 0700)
	result := private + "/host/result.json"
	os.WriteFile(result, []byte(`{"version":1,"run_id":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","termination":"cleanup_failed","exit_code":1,"container_removed":false}`), 0600)
	if Finalize(private, result, filepath.Dir(out), nil) == nil {
		t.Fatal("unconfirmed removal accepted")
	}
	for _, path := range []string{home, work} {
		if _, err := os.Stat(path); err != nil {
			t.Fatal("unconfirmed private tree removed")
		}
	}
	if _, err := os.Stat(filepath.Dir(out) + "/session-transcript.json"); !os.IsNotExist(err) {
		t.Fatal("readable export before removal")
	}
}

func TestFinalizeNonconvergedReport(t *testing.T) {
	for _, outcome := range []string{"blocked", "awaiting_scope"} {
		t.Run(outcome, func(t *testing.T) {
			home, work, out := exportFixture(t)
			private := filepath.Dir(home)
			os.Chmod(private, 0700)
			os.Mkdir(private+"/host", 0700)
			writeCandidate(t, work, "blocked")
			r, _ := decodeReport(candidateReport("blocked"))
			r["outcome"] = outcome
			if outcome == "awaiting_scope" {
				r["open_questions"] = []string{"Choose scope."}
			}
			data, _ := json.Marshal(r)
			os.WriteFile(work+"/.factory/run-report.json", data, 0600)
			result := private + "/host/result.json"
			os.WriteFile(result, []byte(`{"version":1,"run_id":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","termination":"completed","exit_code":0,"container_removed":true}`), 0600)
			if err := Finalize(private, result, filepath.Dir(out), []string{"synthetic-report-secret"}); err != nil {
				t.Fatal(err)
			}
			data, _ = os.ReadFile(filepath.Dir(out) + "/run-report.json")
			report, err := decodeReport(data)
			if err != nil || report["outcome"] != outcome || len(report["artifacts"].([]any)) != 0 {
				t.Fatal("noninstalling outcome lost")
			}
		})
	}
}

// Successful worker shutdown without a candidate is a host failure, not success.
func TestFinalizeCompletedWithoutCandidate(t *testing.T) {
	home, _, out := exportFixture(t)
	private := filepath.Dir(home)
	os.Chmod(private, 0700)
	os.Mkdir(private+"/host", 0700)
	result := private + "/host/result.json"
	os.WriteFile(result, []byte(`{"version":1,"run_id":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","termination":"completed","exit_code":0,"container_removed":true}`), 0600)
	if err := Finalize(private, result, filepath.Dir(out), nil); err != nil {
		t.Fatal(err)
	}
	report, err := os.ReadFile(filepath.Dir(out) + "/run-report.json")
	if err != nil || string(report) != string(failedReport) {
		t.Fatal("fixed fallback lost")
	}
	data, err := os.ReadFile(filepath.Dir(out) + "/session-transcript.json")
	if err != nil {
		t.Fatal(err)
	}
	var transcript struct {
		Files []readableFile `json:"files"`
	}
	if err := json.Unmarshal(data, &transcript); err != nil {
		t.Fatal(err)
	}
	for _, f := range transcript.Files {
		if f.Name == "run-report.json" {
			t.Fatal("host fallback embedded as candidate")
		}
	}
	data, err = os.ReadFile(filepath.Dir(out) + "/finalization.json")
	if err != nil {
		t.Fatal(err)
	}
	var state finalization
	if err := json.Unmarshal(data, &state); err != nil {
		t.Fatal(err)
	}
	if state.Primary != "failed" || state.PublicationReady || state.Readable != "ready" {
		t.Fatal("missing candidate became publishable")
	}
}
