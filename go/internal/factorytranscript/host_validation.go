package factorytranscript

import (
	"bytes"
	"encoding/json"
	"io"
	"io/fs"
	"os"
	"os/exec"
	"path/filepath"
)

type countOutput int

func (c *countOutput) Write(p []byte) (int, error) { *c += countOutput(len(p)); return len(p), nil }
func hostCommand(private, dir, program string, args ...string) error {
	cmd := exec.Command(program, args...)
	cmd.Dir = dir
	cmd.Env = []string{"PATH=" + private + "/host:/usr/bin:/bin", "HOME=" + private + "/host"}
	cmd.Stdout, cmd.Stderr = io.Discard, io.Discard
	if cmd.Run() != nil {
		return errUnsafe
	}
	return nil
}

// Validate with the existing prebuilt linter/generator against a complete trusted
// repository snapshot. Never execute workspace scripts or build after termination.
func validateFrozen(b *sourceBoundary, private string, report map[string]any, transcript readableArtifact) (string, error) {
	source, err := b.root(private + "/source")
	if err != nil {
		return "", errUnsafe
	}
	host, err := b.root(private + "/host")
	if err != nil {
		return "", errUnsafe
	}
	if err = host.Mkdir("validation", 0700); err != nil {
		return "", errUnsafe
	}
	stage := private + "/host/validation"
	for _, name := range []string{"guides", "schema"} {
		root, err := b.directory(source, name)
		if err != nil {
			return "", errUnsafe
		}
		if err = os.CopyFS(stage+"/"+name, root.FS()); err != nil {
			return "", errUnsafe
		}
	}
	if err = os.Mkdir(stage+"/go", 0700); err != nil {
		return "", errUnsafe
	}
	goRoot, err := b.directory(source, "go")
	if err != nil {
		return "", errUnsafe
	}
	for _, name := range []string{"go.mod", "published_server_refs.txt"} {
		data, err := b.read(goRoot, name)
		if err != nil {
			return "", errUnsafe
		}
		if err = os.WriteFile(stage+"/go/"+name, data, 0600); err != nil {
			return "", errUnsafe
		}
	}
	slug := report["slug"].(string)
	if err = os.RemoveAll(stage + "/guides/" + slug); err != nil {
		return "", errUnsafe
	}
	if err = os.Mkdir(stage+"/guides/"+slug, 0700); err != nil {
		return "", errUnsafe
	}
	if err = host.Mkdir("frozen-guide", 0700); err != nil {
		return "", errUnsafe
	}
	frozen, err := b.directory(host, "frozen-guide")
	if err != nil {
		return "", errUnsafe
	}
	work, err := b.root(private + "/workspace")
	if err != nil {
		return "", errUnsafe
	}
	guides, err := b.directory(work, "guides")
	if err != nil {
		return "", errUnsafe
	}
	candidate, err := b.directory(guides, slug)
	if err != nil {
		return "", errUnsafe
	}
	for _, name := range guideNames {
		original, err := b.read(candidate, name)
		if err != nil {
			return "", errUnsafe
		}
		matched := false
		for _, file := range transcript.Files {
			if file.Name == "guide/"+name && bytes.Equal(original, []byte(file.Text)) {
				matched = true
			}
		}
		// A redacted/rewritten guide is NOT silently installed. Require byte equality
		// with the clean sanitized snapshot; reports may be redacted separately.
		if !matched {
			return "", errUnsafe
		}
		if err = writeFinal(frozen, name, original); err != nil {
			return "", errUnsafe
		}
		if err = os.WriteFile(stage+"/guides/"+slug+"/"+name, original, 0600); err != nil {
			return "", errUnsafe
		}
		previous := private + "/source/guides/" + slug + "/" + name
		if _, err = os.Stat(previous); os.IsNotExist(err) {
			previous = "/dev/null"
		}
		cmd := exec.Command("/usr/bin/git", "diff", "--no-index", "--check", previous, stage+"/guides/"+slug+"/"+name)
		var output countOutput
		cmd.Stdout, cmd.Stderr = &output, &output
		err = cmd.Run()
		if output != 0 {
			return "", errUnsafe
		}
		if e, ok := err.(*exec.ExitError); err != nil && (!ok || e.ExitCode() != 1) {
			return "", errUnsafe
		}
	}
	if err = hostCommand(private, stage, private+"/host/lint-guide", stage+"/guides/"+slug); err != nil {
		return "", errUnsafe
	}
	// Existing generator enforces append-only published identities using the copied
	// complete ledger and ALL trusted guides, with the new candidate replacing one.
	if err = hostCommand(private, stage+"/go", private+"/host/factory-generate"); err != nil {
		return "", errUnsafe
	}
	total := int64(0)
	err = filepath.WalkDir(stage+"/go/generated", func(path string, e fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if e.IsDir() {
			return nil
		}
		st, err := e.Info()
		if err != nil || !st.Mode().IsRegular() || st.Size() > 512<<10 {
			return errUnsafe
		}
		total += st.Size()
		if total > 5<<20 {
			return errUnsafe
		}
		return nil
	})
	if err != nil {
		return "", errUnsafe
	}
	for _, check := range b.checks {
		if !check() {
			return "", errUnsafe
		}
	}
	return private + "/host/frozen-guide", nil
}

// Existing tools see only an empty, explicit limited metadata snapshot and the
// already-safe host report. No raw session/log fallback crosses this boundary.
func hostFallbacks(private, export string, out *os.Root, state finalization, failed bool) error {
	scripts := private + "/source/factory/scripts"
	if _, err := os.Stat(scripts + "/build-transcript.sh"); os.IsNotExist(err) {
		return nil
	}
	home := private + "/host/metadata-home"
	if err := os.MkdirAll(home, 0700); err != nil {
		return errUnsafe
	}
	metadata := private + "/host/execution-transcript.json"
	if err := hostCommand(private, private+"/host", "/bin/bash", scripts+"/build-transcript.sh", home, metadata); err != nil {
		return errUnsafe
	}
	data, err := os.ReadFile(metadata)
	if err != nil || len(data) > 2<<20 {
		return errUnsafe
	}
	var m map[string]any
	if json.Unmarshal(data, &m) != nil {
		return errUnsafe
	}
	m["limited"] = true
	data, err = json.Marshal(m)
	if err != nil {
		return errUnsafe
	}
	if err = writeFinal(out, "execution-transcript.json", data); err != nil {
		return errUnsafe
	}
	if !failed {
		return nil
	}
	events := private + "/host/diagnostic-events.json"
	if err = os.WriteFile(events, []byte("[]"), 0600); err != nil {
		return errUnsafe
	}
	diagnostic := private + "/host/factory-diagnostics.json"
	stage, status := "kit_prompt", "1"
	if state.Primary != "failed" || state.Readable == "failed" {
		stage, status = "report_validation", "0"
	}
	if err = hostCommand(private, private+"/host", "/bin/bash", scripts+"/build-diagnostics.sh", stage, status, events, export+"/run-report.json", "-", diagnostic); err != nil {
		return errUnsafe
	}
	if err = hostCommand(private, private+"/host", "/bin/bash", scripts+"/validate-diagnostics.sh", diagnostic); err != nil {
		return errUnsafe
	}
	data, err = os.ReadFile(diagnostic)
	if err != nil || len(data) > 2<<20 {
		return errUnsafe
	}
	return writeFinal(out, "factory-diagnostics.json", data)
}
