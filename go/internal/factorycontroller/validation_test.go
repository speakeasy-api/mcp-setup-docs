package factorycontroller

import (
	"bytes"
	"context"
	"errors"
	"image"
	"image/png"
	"os"
	"path/filepath"
	"strings"
	"syscall"
	"testing"
)

func validationFixture(t *testing.T) ValidationConfig {
	t.Helper()
	root, err := filepath.EvalSymlinks(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	c := ValidationConfig{Workspace: root, Slug: "sample", LintBinary: filepath.Join(root, "lint"), GenerateBinary: filepath.Join(root, "generate")}
	for _, name := range validationNames {
		validationWrite(t, filepath.Join(root, "guides/sample", name), "content\n", 0600)
	}
	for _, path := range []string{"schema/guide.v1.schema.json", "go/go.mod", "go/published_server_refs.txt", "guides/other/meta.yaml", "guides/sample/keep.txt", "go/generated/keep.txt"} {
		validationWrite(t, filepath.Join(root, path), "original\n", 0600)
	}
	for _, name := range []string{"inspect-guide-artifacts.sh", "lib.sh"} {
		data, e := os.ReadFile(filepath.Join("../../../factory/scripts", name))
		if e != nil {
			t.Fatal(e)
		}
		validationWrite(t, filepath.Join(root, "factory/scripts", name), string(data), 0700)
	}
	validationWrite(t, c.LintBinary, "#!/bin/sh\nset -eu\n[ \"$1\" = --json ]\n[ -f \"$2/keep.txt\" ]\n[ -f guides/other/meta.yaml ]\nprintf '[]\\n'\ntouch lint-ran\n", 0700)
	validationWrite(t, c.GenerateBinary, "#!/bin/sh\nset -eu\n[ -f ../lint-ran ]\n[ -f go.mod ]\n[ -f published_server_refs.txt ]\n[ ! -e generated ]\necho changed > ../guides/sample/keep.txt\necho changed > published_server_refs.txt\nmkdir generated\necho generated > generated/result.md\necho 'package guides' > index_gen.go\n", 0700)
	return c
}
func validationWrite(t *testing.T, path, content string, mode os.FileMode) {
	t.Helper()
	if e := os.MkdirAll(filepath.Dir(path), 0700); e != nil {
		t.Fatal(e)
	}
	if e := os.WriteFile(path, []byte(content), mode); e != nil {
		t.Fatal(e)
	}
}
func TestValidationIsolation(t *testing.T) {
	c := validationFixture(t)
	for _, repair := range []bool{false, true} {
		result, err := ValidateDraft(context.Background(), c, repair)
		if err != nil || !result.Valid {
			t.Fatalf("%+v %v", result, err)
		}
	}
	for _, path := range []string{"guides/sample/keep.txt", "go/published_server_refs.txt", "go/generated/keep.txt"} {
		data, err := os.ReadFile(filepath.Join(c.Workspace, path))
		if err != nil || string(data) != "original\n" {
			t.Fatalf("source mutated: %s", path)
		}
	}
	entries, err := os.ReadDir(filepath.Join(c.Workspace, ".factory"))
	if err != nil || len(entries) != 0 {
		t.Fatal("snapshot not cleaned")
	}
}
func TestValidationLintContracts(t *testing.T) {
	good := `{"severity":"blocker","target":"meta","where":"meta.yaml","problem":"Fix this","suggestion":"Use valid metadata","dimension":"lint"}`
	for _, tc := range []struct {
		name, body string
		code       int
		repairable bool
	}{
		{"blocker", "[" + good + "]", 2, true}, {"wrong-exit", "[" + good + "]", 0, false}, {"empty-exit2", "[]", 2, false}, {"null", "null", 0, false}, {"unknown", `[{"severity":"blocker","extra":true}]`, 2, false}, {"missing", `[{"severity":"blocker"}]`, 2, false}, {"execution", "[]", 1, false}, {"duplicate", "[" + strings.Replace(good, `"severity":"blocker"`, `"severity":"blocker","severity":"blocker"`, 1) + "]", 2, false},
	} {
		t.Run(tc.name, func(t *testing.T) {
			c := validationFixture(t)
			validationWrite(t, c.LintBinary, "#!/bin/sh\nprintf '%s\\n' '"+tc.body+"'\nexit "+string(rune('0'+tc.code))+"\n", 0700)
			validationWrite(t, c.GenerateBinary, "#!/bin/sh\ntouch '"+filepath.Join(c.Workspace, "unexpected")+"'\n", 0700)
			r, e := ValidateDraft(context.Background(), c, false)
			if tc.repairable {
				if e != nil || r.Valid || len(r.Findings) != 1 || !strings.Contains(r.Findings[0], "Fix this") {
					t.Fatalf("%+v %v", r, e)
				}
			} else if e == nil {
				t.Fatalf("accepted %+v", r)
			}
			if _, e := os.Stat(filepath.Join(c.Workspace, "unexpected")); !os.IsNotExist(e) {
				t.Fatal("generator ran")
			}
		})
	}
}
func TestValidationUnsafeAndCaps(t *testing.T) {
	for _, kind := range []string{"symlink", "hardlink", "fifo", "target-cap", "generated-cap", "generated-total", "generated-link", "whitespace", "empty"} {
		t.Run(kind, func(t *testing.T) {
			c := validationFixture(t)
			path := filepath.Join(c.Workspace, "guides/other/bad")
			switch kind {
			case "symlink":
				if e := os.Symlink("meta.yaml", path); e != nil {
					t.Fatal(e)
				}
			case "hardlink":
				if e := os.Link(filepath.Join(c.Workspace, "guides/other/meta.yaml"), path); e != nil {
					t.Fatal(e)
				}
			case "fifo":
				if e := syscall.Mkfifo(path, 0600); e != nil {
					t.Fatal(e)
				}
			case "target-cap":
				validationWrite(t, filepath.Join(c.Workspace, "guides/sample/meta.yaml"), strings.Repeat("x", validationFileLimit+1), 0600)
			case "generated-cap":
				validationWrite(t, c.GenerateBinary, "#!/bin/sh\necho 'package guides' > index_gen.go\nmkdir generated\nhead -c 524289 /dev/zero > generated/big\n", 0700)
			case "generated-total":
				validationWrite(t, c.GenerateBinary, "#!/bin/sh\necho 'package guides' > index_gen.go\nmkdir generated\nfor i in 1 2 3 4 5 6 7 8 9 10 11; do head -c 524288 /dev/zero > generated/$i; done\n", 0700)
			case "generated-link":
				validationWrite(t, c.GenerateBinary, "#!/bin/sh\necho 'package guides' > index_gen.go\nmkdir generated\nln -s ../go.mod generated/link\n", 0700)
			case "whitespace":
				validationWrite(t, filepath.Join(c.Workspace, "guides/sample/meta.yaml"), "bad \n", 0600)
			case "empty":
				validationWrite(t, filepath.Join(c.Workspace, "guides/sample/meta.yaml"), " \n", 0600)
			}
			r, e := ValidateDraft(context.Background(), c, false)
			if e == nil && r.Valid {
				t.Fatal("accepted unsafe output")
			}
		})
	}
}
func TestValidationManifestAndCancellation(t *testing.T) {
	for _, manifest := range []string{`{"slug":"sample","stage":"writer","artifacts":["external.md","meta.yaml","research.md","speakeasy.md"],"extra":true}`, `{"slug":"sample","stage":"revision","artifacts":["external.md","meta.yaml","research.md","speakeasy.md"]}`, `{"slug":"sample","stage":"writer","artifacts":["meta.yaml","external.md","research.md","speakeasy.md"]}`} {
		c := validationFixture(t)
		validationWrite(t, filepath.Join(c.Workspace, "factory/scripts/inspect-guide-artifacts.sh"), "#!/bin/sh\nprintf '%s\\n' '"+manifest+"'\n", 0700)
		if _, e := ValidateDraft(context.Background(), c, false); e == nil {
			t.Fatal("accepted invalid manifest")
		}
	}
	c := validationFixture(t)
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	if _, e := ValidateDraft(ctx, c, false); !errors.Is(e, context.Canceled) {
		t.Fatal(e)
	}
}

func TestValidationGeneratedOutputs(t *testing.T) {
	for _, tc := range []struct {
		name, script string
		valid        bool
	}{
		{"png-whitespace", "", true},
		{"missing-index", "rm index_gen.go\n", false},
		{"oversized-index", "head -c 524289 /dev/zero > index_gen.go\n", false},
		{"index-whitespace", "printf 'package guides \\n' > index_gen.go\n", false},
		{"aggregate-index", "for i in 1 2 3 4 5 6 7 8 9 10; do head -c 524288 /dev/zero > generated/$i.png; done\n", false},
		{"index-symlink", "rm index_gen.go; ln -s go.mod index_gen.go\n", false},
		{"index-hardlink", "rm index_gen.go; ln go.mod index_gen.go\n", false},
		{"text-whitespace", "printf 'text \\n' > generated/result.md\n", false},
	} {
		t.Run(tc.name, func(t *testing.T) {
			c := validationFixture(t)
			script := tc.script
			if tc.name == "png-whitespace" {
				var asset bytes.Buffer
				if err := png.Encode(&asset, image.NewRGBA(image.Rect(0, 0, 1, 1))); err != nil {
					t.Fatal(err)
				}
				asset.WriteString(" \n") // Legal trailing binary data must not trigger text rules.
				path := filepath.Join(c.Workspace, "asset.png")
				validationWrite(t, path, asset.String(), 0600)
				script = "cp '" + path + "' generated/asset.png\n"
			}
			validationWrite(t, c.GenerateBinary, "#!/bin/sh\nset -eu\nmkdir generated\necho 'package guides' > index_gen.go\n"+script, 0700)
			r, e := ValidateDraft(context.Background(), c, false)
			if tc.valid {
				if e != nil || !r.Valid {
					t.Fatalf("expected valid: %+v %v", r, e)
				}
			} else if e == nil && r.Valid {
				t.Fatal("accepted invalid generated output")
			}
		})
	}
}
