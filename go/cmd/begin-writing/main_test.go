package main

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestRun(t *testing.T) {
	dir, err := filepath.EvalSymlinks(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	os.Chmod(dir, 0700)
	args := []string{"--control-dir", dir, "--run-id", strings.Repeat("a", 32)}
	if run(args) != 0 || run(args) != 0 {
		t.Fatal("valid and duplicate signal must succeed")
	}
	for _, args := range [][]string{nil, {"--run-id", "invalid"}, append(args, "extra")} {
		if run(args) == 0 {
			t.Fatal("accepted bad arguments")
		}
	}
}
