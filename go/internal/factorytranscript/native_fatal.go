package factorytranscript

import (
	"bytes"
	"encoding/json"
	"io"
	"os"
	"regexp"
	"strings"
	"syscall"
)

// Native fatal records are model-writable diagnostic evidence, NOT host authority.
// Source: Kit bf347453 src/fatal.rs:40-59,245-360,413-486 (release 0.2.2).
// Fresh invocation home + exactly one prompt fatal record provides conservative
// attribution; multiple records (including child failures) are unavailable.
// Never export messages, diagnostics, span context, paths or native identifiers.
type FatalStatus string
type FatalKind string
type FatalCode string
type FatalDiagnostic struct {
	Status   FatalStatus `json:"status"`
	Evidence string      `json:"evidence,omitempty"`
	Kind     FatalKind   `json:"kind,omitempty"`
	Code     FatalCode   `json:"code,omitempty"`
}
type fatalSidecar struct {
	Version    int             `json:"version"`
	RunID      string          `json:"run_id"`
	Diagnostic FatalDiagnostic `json:"diagnostic"`
}

const fatalDiagnosticName = "fatal-diagnostic.json"

func unavailableFatal() FatalDiagnostic { return FatalDiagnostic{Status: "unavailable"} }
func validFatal(d FatalDiagnostic) bool {
	if d.Status == "unavailable" {
		return d.Evidence == "" && d.Kind == "" && d.Code == ""
	}
	if d.Status != "classified" || d.Evidence != "native_reported" {
		return false
	}
	switch d.Kind {
	case "provider":
		switch d.Code {
		case "stream_transport", "request_transport", "stream_idle_timeout", "stream_closed", "authentication", "retry_exhausted", "response_transient", "response_failed", "protocol_error", "credential_error", "http_error", "provider_error":
			return true
		}
	case "tool":
		return d.Code == "tool_error"
	case "runtime":
		switch d.Code {
		case "mutator_error", "invalid_state", "unsupported", "session_open", "compactor_build", "subagent_restore", "agent_build":
			return true
		}
	}
	return false
}

// Independent 1 MiB read bound: deliberately does not reuse exporter byte limits.
func readFatalFile(root *os.Root, name string, limit int64) ([]byte, error) {
	before, err := root.Lstat(name)
	if err != nil || !singleRegular(before) || before.Size() < 1 || before.Size() > limit {
		return nil, errUnsafe
	}
	f, err := root.OpenFile(name, os.O_RDONLY|syscall.O_NOFOLLOW|syscall.O_NONBLOCK, 0)
	if err != nil {
		return nil, errUnsafe
	}
	defer f.Close()
	actual, err := f.Stat()
	if err != nil || !unchanged(before, actual) {
		return nil, errUnsafe
	}
	data, err := io.ReadAll(io.LimitReader(f, limit+1))
	if err != nil || int64(len(data)) != before.Size() {
		return nil, errUnsafe
	}
	after, err := f.Stat()
	if err != nil || !unchanged(before, after) {
		return nil, errUnsafe
	}
	now, err := root.Lstat(name)
	if err != nil || !unchanged(before, now) {
		return nil, errUnsafe
	}
	return data, nil
}
func fatalNames(root *os.Root, remaining *int) ([]string, error) {
	f, err := root.Open(".")
	if err != nil {
		return nil, errUnsafe
	}
	defer f.Close()
	entries, err := f.ReadDir(*remaining + 1)
	if (err != nil && err != io.EOF) || len(entries) > *remaining {
		return nil, errUnsafe
	}
	*remaining -= len(entries)
	names := make([]string, 0, len(entries))
	for _, e := range entries {
		names = append(names, e.Name())
	}
	return names, nil
}
func fatalObject(data []byte) (map[string]any, error) {
	dec := json.NewDecoder(bytes.NewReader(data))
	dec.UseNumber()
	value, err := readValue(dec, 0)
	if err != nil {
		return nil, errUnsafe
	}
	if _, err = dec.Token(); err != io.EOF {
		return nil, errUnsafe
	}
	return object(value, "schema_version", "event_id", "occurred_at_ms", "kit_version", "session_id", "surface", "kind", "code", "message", "diagnostics", "span_context")
}
func collectNativeFatal(owned *os.Root) FatalDiagnostic {
	fail := unavailableFatal()
	b := &sourceBoundary{}
	defer b.close()
	root := owned
	for _, name := range []string{"home", ".kit", "errors"} {
		var err error
		root, err = b.directory(root, name)
		if err != nil {
			return fail
		}
	}
	remaining := 64
	dirs, err := fatalNames(root, &remaining)
	if err != nil || len(dirs) != 1 {
		return fail
	}
	session, err := b.directory(root, dirs[0])
	if err != nil {
		return fail
	}
	names, err := fatalNames(session, &remaining)
	if err != nil || len(names) != 1 || !strings.HasSuffix(names[0], ".json") {
		return fail
	}
	data, err := readFatalFile(session, names[0], 1<<20)
	if err != nil {
		return fail
	}
	m, err := fatalObject(data)
	if err != nil {
		return fail
	}
	if m["schema_version"] != json.Number("2") || m["kit_version"] != "0.2.2" || m["surface"] != "prompt" || m["session_id"] != dirs[0] {
		return fail
	}
	event, ok := m["event_id"].(string)
	if !ok || event+".json" != names[0] {
		return fail
	}
	if !regexp.MustCompile(`^e-[0-9]+-[0-9]+-[0-9]+$`).MatchString(event) {
		return fail
	}
	timestamp, ok := m["occurred_at_ms"].(json.Number)
	if !ok {
		return fail
	}
	if _, err := timestamp.Int64(); err != nil {
		return fail
	}
	if _, ok := m["message"].(string); !ok {
		return fail
	}
	kind, ok := m["kind"].(string)
	if !ok {
		return fail
	}
	code, ok := m["code"].(string)
	if !ok {
		return fail
	}
	result := FatalDiagnostic{"classified", "native_reported", FatalKind(kind), FatalCode(code)}
	if !validFatal(result) {
		return fail
	}
	for _, check := range b.checks {
		if !check() {
			return fail
		}
	}
	return result
}
func writeFatalDiagnostic(owned, host *os.Root, runID string) {
	info, err := host.Stat(".")
	if err != nil || !privateDiagnosticInfo(info, true) {
		return
	}
	data, err := json.Marshal(fatalSidecar{1, runID, collectNativeFatal(owned)})
	if err == nil {
		_ = writeFinal(host, fatalDiagnosticName, data)
	}
}

// ReadFatalDiagnostic is called by the surviving supervisor BEFORE cleanup.
// Missing or invalid evidence remains unavailable, never a lifecycle decision.
func ReadFatalDiagnostic(host *os.Root, runID string) FatalDiagnostic {
	fail := unavailableFatal()
	if !regexp.MustCompile(`^[a-f0-9]{32}$`).MatchString(runID) {
		return fail
	}
	info, err := host.Stat(".")
	if err != nil || !privateDiagnosticInfo(info, true) {
		return fail
	}
	st, err := host.Lstat(fatalDiagnosticName)
	if err != nil || !privateDiagnosticInfo(st, false) {
		return fail
	}
	data, err := readFatalFile(host, fatalDiagnosticName, 512)
	if err != nil {
		return fail
	}
	// First reject duplicate keys (encoding/json alone permits them).
	parser := json.NewDecoder(bytes.NewReader(data))
	parser.UseNumber()
	if _, err := readValue(parser, 0); err != nil {
		return fail
	}
	var d fatalSidecar
	dec := json.NewDecoder(bytes.NewReader(data))
	dec.DisallowUnknownFields()
	if dec.Decode(&d) != nil || dec.Decode(new(any)) != io.EOF || d.Version != 1 || d.RunID != runID || !validFatal(d.Diagnostic) {
		return fail
	}
	return d.Diagnostic
}
