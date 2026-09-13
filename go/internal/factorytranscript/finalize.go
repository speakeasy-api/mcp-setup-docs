package factorytranscript

import (
	"encoding/json"
	"io"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"syscall"
)

type hostLifecycle struct {
	Version     int    `json:"version"`
	RunID       string `json:"run_id"`
	Termination string `json:"termination"`
	ExitCode    int    `json:"exit_code"`
	Removed     bool   `json:"container_removed"`
}
type finalization struct {
	HostRunID          string `json:"host_run_id"`
	WorkflowRunID      string `json:"workflow_run_id"`
	WorkflowRunAttempt int    `json:"workflow_run_attempt"`
	Version            int    `json:"version"`
	Primary            string `json:"primary_outcome"`
	Readable           string `json:"readable_export"`
	Partial            bool   `json:"partial"`
	PublicationReady   bool   `json:"publication_ready"`
}

// Identity comes only from the host launch/supervisor, never model reports.
func initialFinalization(runID string) finalization {
	attempt := 0
	if value := os.Getenv("GITHUB_RUN_ATTEMPT"); value != "" {
		var err error
		attempt, err = strconv.Atoi(value)
		if err != nil {
			attempt = -1
		}
	}
	return finalization{Version: 1, HostRunID: runID, WorkflowRunID: os.Getenv("GITHUB_RUN_ID"), WorkflowRunAttempt: attempt, Primary: "failed", Readable: "failed", Partial: true}
}
func (s finalization) validIdentity() bool {
	return regexp.MustCompile(`^[a-f0-9]{32}$`).MatchString(s.HostRunID) &&
		((s.WorkflowRunID == "" && s.WorkflowRunAttempt == 0) ||
			(regexp.MustCompile(`^[1-9][0-9]*$`).MatchString(s.WorkflowRunID) && s.WorkflowRunAttempt > 0))
}
func (s finalization) sameIdentity(other finalization) bool {
	return s.validIdentity() && s.HostRunID == other.HostRunID && s.WorkflowRunID == other.WorkflowRunID && s.WorkflowRunAttempt == other.WorkflowRunAttempt
}

var failedReport = []byte(`{"schema_version":1,"outcome":"failed","provider":null,"slug":null,"persona":null,"summary":"Factory model execution failed.","open_questions":[],"blockers":["Factory model execution failed."],"nits":[],"review_rounds":0,"artifacts":[]}`)

// writeFinal replaces only an established regular single-link host artifact.
// Its directory is private and never mounted in the model container.
func writeFinal(root *os.Root, name string, data []byte) error {
	if len(data) > 2<<20 {
		return errUnsafe
	}
	if st, err := root.Lstat(name); err == nil {
		if !singleRegular(st) {
			return errUnsafe
		}
	} else if !os.IsNotExist(err) {
		return errUnsafe
	}
	tmp := name + ".pending"
	f, err := root.OpenFile(tmp, os.O_WRONLY|os.O_CREATE|os.O_EXCL|syscall.O_NOFOLLOW, 0600)
	if err != nil {
		return errUnsafe
	}
	defer root.Remove(tmp)
	_, e := f.Write(data)
	syncErr := f.Sync()
	st, statErr := f.Stat()
	closeErr := f.Close()
	if e != nil || syncErr != nil || statErr != nil || closeErr != nil {
		return errUnsafe
	}
	now, err := root.Lstat(tmp)
	if err != nil || !unchanged(st, now) {
		return errUnsafe
	}
	if err = root.Rename(tmp, name); err != nil {
		return errUnsafe
	}
	return nil
}

// Finalize is run only as the supervisor's deadline-bound host child. There is
// intentionally NO local timer reset and NO publication/upload authority.
func Finalize(private, result, export string, known []string) (ret error) {
	b := &sourceBoundary{}
	defer b.close()
	if result != filepath.Join(private, "host", "result.json") {
		return errUnsafe
	}
	owned, err := b.root(private)
	if err != nil {
		return errUnsafe
	}
	out, err := b.root(export)
	if err != nil {
		return errUnsafe
	}
	for _, root := range []*os.Root{owned, out} {
		st, err := root.Stat(".")
		if err != nil {
			return errUnsafe
		}
		sys, ok := st.Sys().(*syscall.Stat_t)
		if !ok || sys.Uid != uint32(os.Geteuid()) || st.Mode().Perm()&0077 != 0 {
			return errUnsafe
		}
	}
	if !disjoint(export, filepath.Join(private, "home")) || !disjoint(export, filepath.Join(private, "workspace")) {
		return errUnsafe
	}
	if _, e := out.Lstat("guide"); !os.IsNotExist(e) {
		return errUnsafe
	}
	guidePublished := false
	state := initialFinalization(os.Getenv("FACTORY_HOST_RUN_ID"))
	if err = writeFinal(out, "run-report.json", failedReport); err != nil {
		return errUnsafe
	}
	saveState := func() error { data, _ := json.Marshal(state); return writeFinal(out, "finalization.json", data) }
	if err = saveState(); err != nil {
		return errUnsafe
	}
	defer func() {
		if e := hostFallbacks(private, export, out, state, ret != nil); e != nil {
			ret = errUnsafe
		}
		if ret != nil {
			if guidePublished {
				_ = out.RemoveAll("guide")
			}
			state.PublicationReady = false
		}
		if e := saveState(); e != nil {
			ret = errUnsafe
		}
	}()
	host, err := b.directory(owned, "host")
	if err != nil {
		return errUnsafe
	}
	data, err := b.read(host, "result.json")
	if err != nil {
		return errUnsafe
	}
	var lifecycle hostLifecycle
	if json.Unmarshal(data, &lifecycle) != nil || lifecycle.Version != 1 || !state.validIdentity() || lifecycle.RunID != state.HostRunID || !lifecycle.Removed {
		return errUnsafe
	}
	// Only this proven removal branch may touch or delete private model mounts.
	// os.Root.RemoveAll does not follow symlinks; never delete source/input/host.
	defer func() {
		if owned.RemoveAll("home") != nil {
			ret = errUnsafe
		}
		if owned.RemoveAll("workspace") != nil {
			ret = errUnsafe
		}
	}()
	eligible := lifecycle.Termination == "completed" && lifecycle.ExitCode == 0
	if eligible {
		workspace, e := b.directory(owned, "workspace")
		if e != nil {
			return errUnsafe
		}
		factory, e := b.directory(workspace, ".factory")
		if e == nil {
			candidate, e := b.read(factory, "run-report.json")
			if e == nil {
				if report, e := decodeReport(candidate); e == nil {
					state.Primary = report["outcome"].(string)
				}
			}
		}
	}
	// Always attempt readable evidence, even for timeout/stale converged candidates.
	if err = Export(filepath.Join(private, "home"), filepath.Join(private, "workspace"), filepath.Join(export, "session-transcript.json"), known); err != nil {
		return errUnsafe
	}
	f, err := out.OpenFile("session-transcript.json", os.O_RDONLY|syscall.O_NOFOLLOW|syscall.O_NONBLOCK, 0)
	if err != nil {
		return errUnsafe
	}
	st, err := f.Stat()
	if err != nil || !singleRegular(st) || st.Size() > 2<<20 {
		f.Close()
		return errUnsafe
	}
	data, err = io.ReadAll(io.LimitReader(f, (2<<20)+1))
	closeErr := f.Close()
	if err != nil || closeErr != nil || len(data) > 2<<20 {
		return errUnsafe
	}
	var transcript readableArtifact
	if json.Unmarshal(data, &transcript) != nil || transcript.Version != 1 || transcript.Kind != "guide_factory_readable_transcript" {
		return errUnsafe
	}
	state.Readable = "ready"
	state.Partial = transcript.Limited
	if eligible {
		for _, file := range transcript.Files {
			if file.Name != "run-report.json" {
				continue
			}
			report, e := decodeReport([]byte(file.Text))
			if e != nil || report["outcome"] != state.Primary {
				return errUnsafe
			}
			if state.Primary == "converged" {
				frozen, e := validateFrozen(b, private, report, transcript)
				if e != nil {
					return errUnsafe
				}
				if e = os.Rename(frozen, export+"/guide"); e != nil {
					return errUnsafe
				}
				guidePublished = true
				state.PublicationReady = true
			}
			if e = writeFinal(out, "run-report.json", []byte(file.Text)); e != nil {
				return errUnsafe
			}
		}
	}
	if state.Primary == "converged" && !state.PublicationReady {
		return errUnsafe
	}
	if !eligible {
		return errUnsafe
	}
	return nil
}
