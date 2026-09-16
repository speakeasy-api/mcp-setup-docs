package factorycontroller

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strings"
	"syscall"
)

type ValidationConfig struct{ Workspace, Slug, LintBinary, GenerateBinary string }

const validationFileLimit = 512 << 10

var validationFailure = errors.New("draft validation failed")
var validationNames = []string{"external.md", "meta.yaml", "research.md", "speakeasy.md"}

// ValidateDraft runs trusted validators against disposable, physical snapshots.
func ValidateDraft(ctx context.Context, c ValidationConfig, repair bool) (ValidationResult, error) {
	fail := func() (ValidationResult, error) {
		if ctx.Err() != nil {
			return ValidationResult{}, ctx.Err()
		}
		return ValidationResult{}, validationFailure
	}
	if ctx.Err() != nil {
		return fail()
	}
	if len(c.Slug) > 96 || !regexp.MustCompile(`^[a-z0-9]+(-[a-z0-9]+)*$`).MatchString(c.Slug) {
		return fail()
	}
	root, err := filepath.Abs(c.Workspace)
	if err != nil || validationPhysical(root) != nil {
		return fail()
	}
	for _, bin := range []string{c.LintBinary, c.GenerateBinary} {
		if !filepath.IsAbs(bin) {
			return fail()
		}
	}
	private := filepath.Join(root, ".factory")
	if err = os.Mkdir(private, 0700); err != nil && !os.IsExist(err) {
		return fail()
	}
	if validationPhysical(private) != nil {
		return fail()
	}
	stage := "writer"
	if repair {
		stage = "revision"
	}
	phase, err := os.MkdirTemp(private, "validation-"+stage+"-")
	if err != nil {
		return fail()
	}
	defer os.RemoveAll(phase)
	subset := filepath.Join(phase, "inspection")
	target := filepath.Join(root, "guides", c.Slug)
	if validationPhysical(target) != nil {
		return fail()
	}
	var defects []string
	for _, name := range validationNames {
		data, e := validationRead(filepath.Join(target, name), validationFileLimit)
		if e != nil {
			return fail()
		}
		if len(bytes.TrimSpace(data)) == 0 {
			defects = append(defects, "Target artifact is empty: "+name)
		}
		if validationWhitespace(data) {
			defects = append(defects, "Target artifact has whitespace errors: "+name)
		}
		dst := filepath.Join(subset, "guides", c.Slug, name)
		if os.MkdirAll(filepath.Dir(dst), 0700) != nil || os.WriteFile(dst, data, 0600) != nil {
			return fail()
		}
	}
	if len(defects) > 0 {
		return ValidationResult{Findings: defects}, nil
	}
	out, code, e := validationCommand(ctx, root, subset, "/bin/bash", filepath.Join(root, "factory/scripts/inspect-guide-artifacts.sh"), c.Slug, stage)
	if e != nil || code != 0 {
		return fail()
	}
	manifest, e := validationObject(out, []string{"slug", "stage", "artifacts"})
	if e != nil {
		return fail()
	}
	var slug, gotStage string
	var names []string
	if json.Unmarshal(manifest["slug"], &slug) != nil || json.Unmarshal(manifest["stage"], &gotStage) != nil || json.Unmarshal(manifest["artifacts"], &names) != nil || slug != c.Slug || gotStage != stage || strings.Join(names, "\x00") != strings.Join(validationNames, "\x00") {
		return fail()
	}
	snapshot := filepath.Join(phase, "repository")
	for _, path := range []string{"guides", "schema", "go/go.mod", "go/published_server_refs.txt"} {
		if validationCopy(ctx, filepath.Join(root, path), filepath.Join(snapshot, path)) != nil {
			return fail()
		}
	}
	out, code, e = validationCommand(ctx, snapshot, snapshot, c.LintBinary, "--json", filepath.Join(snapshot, "guides", c.Slug))
	if e != nil || (code != 0 && code != 2) {
		return fail()
	}
	findings, blockers, e := validationFindings(out)
	if e != nil || (code == 2) != blockers {
		return fail()
	}
	if blockers {
		return ValidationResult{Findings: findings}, nil
	}
	_, code, e = validationCommand(ctx, filepath.Join(snapshot, "go"), snapshot, c.GenerateBinary)
	if e != nil {
		return fail()
	}
	if code != 0 {
		return ValidationResult{Findings: []string{"Guide generation failed validation."}}, nil
	}
	total := int64(0)
	checkGenerated := func(path string) error {
		if ctx.Err() != nil {
			return ctx.Err()
		}
		data, e := validationRead(path, validationFileLimit)
		if e != nil {
			return e
		}
		total += int64(len(data))
		if total > 5<<20 {
			return validationFailure
		}
		// Binary assets have the same safety/size limits, but no text whitespace rules.
		switch strings.ToLower(filepath.Ext(path)) {
		case ".md", ".yaml", ".yml", ".json", ".go", ".txt":
			if validationWhitespace(data) {
				return validationFailure
			}
		}
		return nil
	}
	// The generator writes its Go index outside generated/; require and count it.
	if checkGenerated(filepath.Join(snapshot, "go/index_gen.go")) != nil {
		return fail()
	}
	err = filepath.WalkDir(filepath.Join(snapshot, "go/generated"), func(path string, d os.DirEntry, e error) error {
		if e != nil {
			return validationFailure
		}
		if ctx.Err() != nil {
			return ctx.Err()
		}
		if d.IsDir() {
			return nil
		}
		return checkGenerated(path)
	})
	if err != nil {
		return fail()
	}
	return ValidationResult{Valid: true}, nil
}

func validationPhysical(path string) error {
	for {
		info, err := os.Lstat(path)
		if err != nil || info.Mode()&os.ModeSymlink != 0 {
			return validationFailure
		}
		parent := filepath.Dir(path)
		if parent == path {
			return nil
		}
		path = parent
	}
}
func validationRead(path string, limit int64) ([]byte, error) {
	info, err := os.Lstat(path)
	if err != nil || !info.Mode().IsRegular() || info.Size() > limit {
		return nil, validationFailure
	}
	stat, ok := info.Sys().(*syscall.Stat_t)
	if !ok || stat.Nlink != 1 {
		return nil, validationFailure
	}
	f, err := os.Open(path)
	if err != nil {
		return nil, validationFailure
	}
	defer f.Close()
	actual, err := f.Stat()
	if err != nil || !os.SameFile(info, actual) {
		return nil, validationFailure
	}
	data, err := io.ReadAll(io.LimitReader(f, limit+1))
	if err != nil || int64(len(data)) > limit {
		return nil, validationFailure
	}
	return data, nil
}
func validationCopy(ctx context.Context, src, dst string) error {
	if validationPhysical(src) != nil {
		return validationFailure
	}
	return filepath.WalkDir(src, func(path string, d os.DirEntry, err error) error {
		if ctx.Err() != nil {
			return ctx.Err()
		}
		if err != nil {
			return validationFailure
		}
		rel, err := filepath.Rel(src, path)
		if err != nil {
			return validationFailure
		}
		to := filepath.Join(dst, rel)
		if d.IsDir() {
			return os.MkdirAll(to, 0700)
		}
		data, err := validationRead(path, 16<<20)
		if err != nil {
			return err
		}
		if os.MkdirAll(filepath.Dir(to), 0700) != nil {
			return validationFailure
		}
		return os.WriteFile(to, data, 0600)
	})
}
func validationWhitespace(data []byte) bool {
	for _, line := range bytes.Split(data, []byte("\n")) {
		if len(line) > 0 && (line[len(line)-1] == ' ' || line[len(line)-1] == '\t' || line[len(line)-1] == '\r') {
			return true
		}
	}
	return false
}

type validationBuffer struct{ buffer bytes.Buffer }

func (b *validationBuffer) Write(p []byte) (int, error) {
	if b.buffer.Len()+len(p) > validationFileLimit {
		return 0, validationFailure
	}
	return b.buffer.Write(p)
}
func validationCommand(ctx context.Context, dir, root, bin string, args ...string) ([]byte, int, error) {
	if ctx.Err() != nil {
		return nil, -1, ctx.Err()
	}
	cmd := exec.CommandContext(ctx, bin, args...)
	cmd.Dir = dir
	for _, v := range os.Environ() {
		if !strings.HasPrefix(v, "FACTORY_REPO_ROOT=") {
			cmd.Env = append(cmd.Env, v)
		}
	}
	cmd.Env = append(cmd.Env, "FACTORY_REPO_ROOT="+root)
	var out validationBuffer
	cmd.Stdout = &out
	cmd.Stderr = io.Discard
	err := cmd.Run()
	if ctx.Err() != nil {
		return nil, -1, ctx.Err()
	}
	var exit *exec.ExitError
	if errors.As(err, &exit) {
		return out.buffer.Bytes(), exit.ExitCode(), nil
	}
	if err != nil {
		return nil, -1, validationFailure
	}
	return out.buffer.Bytes(), 0, nil
}

// Token-level object parsing rejects duplicate, missing and unknown fields.
func validationObject(data []byte, keys []string) (map[string]json.RawMessage, error) {
	dec := json.NewDecoder(bytes.NewReader(data))
	t, e := dec.Token()
	if e != nil || t != json.Delim('{') {
		return nil, validationFailure
	}
	out := map[string]json.RawMessage{}
	for dec.More() {
		t, e = dec.Token()
		if e != nil {
			return nil, validationFailure
		}
		key, ok := t.(string)
		if !ok {
			return nil, validationFailure
		}
		if _, ok = out[key]; ok {
			return nil, validationFailure
		}
		var raw json.RawMessage
		if dec.Decode(&raw) != nil {
			return nil, validationFailure
		}
		out[key] = raw
	}
	if _, e = dec.Token(); e != nil {
		return nil, validationFailure
	}
	var extra any
	if dec.Decode(&extra) != io.EOF || len(out) != len(keys) {
		return nil, validationFailure
	}
	for _, key := range keys {
		if _, ok := out[key]; !ok {
			return nil, validationFailure
		}
	}
	return out, nil
}
func validationFindings(data []byte) ([]string, bool, error) {
	var rows []json.RawMessage
	if json.Unmarshal(data, &rows) != nil || rows == nil || len(rows) > 128 {
		return nil, false, validationFailure
	}
	var findings []string
	blockers := false
	keys := []string{"severity", "target", "where", "problem", "suggestion", "dimension"}
	for _, row := range rows {
		obj, err := validationObject(row, keys)
		if err != nil {
			return nil, false, err
		}
		vals := map[string]string{}
		for _, key := range keys {
			var s string
			if bytes.Equal(obj[key], []byte("null")) || json.Unmarshal(obj[key], &s) != nil || len(s) > 2048 {
				return nil, false, validationFailure
			}
			vals[key] = s
		}
		if vals["severity"] != "blocker" && vals["severity"] != "warning" && vals["severity"] != "nit" {
			return nil, false, validationFailure
		}
		if vals["severity"] == "blocker" {
			blockers = true
		}
		if len(findings) < 16 {
			findings = append(findings, vals["severity"]+" "+vals["target"]+" "+vals["where"]+": "+vals["problem"]+" "+vals["suggestion"])
		}
	}
	return findings, blockers, nil
}
