package factorytranscript

import (
	"bytes"
	"encoding/json"
	"errors"
	"io"
	"os"
	"regexp"
	"syscall"
)

const limitDiagnosticName = "worker-limit.json"
const limitDiagnosticBytes = 512

type workerLimitRecord struct {
	Version  int    `json:"version"`
	RunID    string `json:"run_id"`
	Category string `json:"category"`
	Observed int64  `json:"observed"`
	Allowed  int64  `json:"allowed"`
}

func privateDiagnosticInfo(info os.FileInfo, directory bool) bool {
	st, ok := info.Sys().(*syscall.Stat_t)
	if !ok || st.Uid != uint32(os.Geteuid()) {
		return false
	}
	if directory {
		return info.IsDir() && info.Mode() == os.ModeDir|0700
	}
	return singleRegular(info) && info.Mode() == 0600 && info.Size() > 0 && info.Size() <= limitDiagnosticBytes
}

func writeLimitDiagnostic(host *os.Root, runID string, err error) {
	var stage *workerStageError
	if !errors.As(err, &stage) || stage.limit == nil {
		return
	}
	info, e := host.Stat(".")
	if e != nil || !privateDiagnosticInfo(info, true) {
		return
	}
	d := workerLimitRecord{1, runID, stage.limit.Category, stage.limit.Observed, stage.limit.Allowed}
	data, e := json.Marshal(d)
	if e == nil && len(data) <= limitDiagnosticBytes {
		_ = writeFinal(host, limitDiagnosticName, data)
	}
}

// ReadLimitDiagnostic treats the worker's sidecar as untrusted. A missing or
// invalid record is only absent evidence: never a lifecycle or readiness vote.
// The caller supplies its retained host-private root and current launch ID.
func ReadLimitDiagnostic(host *os.Root, runID string) *LimitDiagnostic {
	if !regexp.MustCompile(`^[a-f0-9]{32}$`).MatchString(runID) {
		return nil
	}
	info, err := host.Stat(".")
	if err != nil || !privateDiagnosticInfo(info, true) {
		return nil
	}
	before, err := host.Lstat(limitDiagnosticName)
	if err != nil || !privateDiagnosticInfo(before, false) {
		return nil
	}
	file, err := host.OpenFile(limitDiagnosticName, os.O_RDONLY|syscall.O_NOFOLLOW|syscall.O_NONBLOCK, 0)
	if err != nil {
		return nil
	}
	defer file.Close()
	actual, err := file.Stat()
	if err != nil || !privateDiagnosticInfo(actual, false) || !unchanged(before, actual) {
		return nil
	}
	data, err := io.ReadAll(io.LimitReader(file, limitDiagnosticBytes+1))
	after, e := file.Stat()
	named, nameErr := host.Lstat(limitDiagnosticName)
	parent, parentErr := host.Stat(".")
	if err != nil || e != nil || nameErr != nil || parentErr != nil || !privateDiagnosticInfo(parent, true) || !privateDiagnosticInfo(after, false) || !unchanged(before, after) || !unchanged(before, named) || int64(len(data)) != before.Size() || len(data) > limitDiagnosticBytes {
		return nil
	}
	dec := json.NewDecoder(bytes.NewReader(data))
	value, err := readValue(dec, 0)
	if err != nil {
		return nil
	}
	fields, err := object(value, "version", "run_id", "category", "observed", "allowed")
	if err != nil || len(fields) != 5 {
		return nil
	}
	if _, err = dec.Token(); err != io.EOF {
		return nil
	}
	var d workerLimitRecord
	if json.Unmarshal(data, &d) != nil || d.Version != 1 || d.RunID != runID {
		return nil
	}
	caps := map[string]int64{"source_bytes": 2 << 20, "total_bytes": 8 << 20, "entries": 4096, "session_dirs": 64, "session_files": 64, "events": 4096, "assembled_bytes": 2 << 20}
	cap, ok := caps[d.Category]
	// Safe integer ceiling prevents downstream rounding; larger observations are
	// omitted, not truncated or used to change the worker's result.
	if !ok || d.Allowed != cap || d.Observed <= cap || d.Observed > 1<<53-1 {
		return nil
	}
	return &LimitDiagnostic{d.Category, d.Observed, d.Allowed}
}
