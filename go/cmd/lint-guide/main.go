package main

import (
	"encoding/json"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/speakeasy-api/mcp-setup-docs/go/internal/guidecheck"
)

func main() {
	cwd, err := os.Getwd()
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
	repoRoot, err := findRepoRoot(cwd)
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
	os.Exit(run(os.Args[1:], repoRoot, os.Stdout, os.Stderr))
}

func run(args []string, repoRoot string, stdout, stderr io.Writer) int {
	jsonMode := false
	metaOnly := false
	var guideDirs []string
	for _, arg := range args {
		switch {
		case arg == "--json":
			jsonMode = true
		case arg == "--meta-only":
			metaOnly = true
		case strings.HasPrefix(arg, "-"):
			fmt.Fprintf(stderr, "unknown option %s\n", arg)
			printUsage(stderr)
			return 1
		default:
			guideDirs = append(guideDirs, arg)
		}
	}
	if len(guideDirs) == 0 {
		printUsage(stderr)
		return 1
	}

	type target struct {
		key  string
		path string
	}
	targets := make([]target, 0, len(guideDirs))
	for _, guideDir := range guideDirs {
		key, err := filepath.Abs(guideDir)
		if err != nil {
			fmt.Fprintf(stderr, "%s: %v\n", guideDir, err)
			return 1
		}
		targets = append(targets, target{key: filepath.Clean(key), path: guideDir})
	}
	sort.SliceStable(targets, func(i, j int) bool { return targets[i].key < targets[j].key })

	var all []guidecheck.Finding
	for _, target := range targets {
		check := guidecheck.Check
		if metaOnly {
			check = guidecheck.CheckMeta
		}
		findings, err := check(repoRoot, target.path)
		if err != nil {
			fmt.Fprintf(stderr, "%s: %v\n", target.key, err)
			return 1
		}
		all = append(all, findings...)
	}

	if jsonMode {
		if all == nil {
			all = []guidecheck.Finding{}
		}
		if err := json.NewEncoder(stdout).Encode(all); err != nil {
			fmt.Fprintln(stderr, err)
			return 1
		}
	} else {
		for _, finding := range all {
			if _, err := fmt.Fprintf(stdout, "%s %s %s: %s\n", finding.Severity, finding.Target, finding.Where, finding.Problem); err != nil {
				fmt.Fprintln(stderr, err)
				return 1
			}
		}
	}
	for _, finding := range all {
		if finding.Severity == "blocker" {
			return 2
		}
	}
	return 0
}

func findRepoRoot(start string) (string, error) {
	dir, err := filepath.Abs(start)
	if err != nil {
		return "", err
	}
	for {
		if info, statErr := os.Stat(filepath.Join(dir, "schema", "guide.v1.schema.json")); statErr == nil && !info.IsDir() {
			return dir, nil
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			return "", fmt.Errorf("could not find schema/guide.v1.schema.json above %s", start)
		}
		dir = parent
	}
}

func printUsage(w io.Writer) {
	fmt.Fprintln(w, "usage: lint-guide [--json] [--meta-only] <guide-dir> [<guide-dir> ...]")
}
