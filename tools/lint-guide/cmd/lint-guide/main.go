package main

import (
	"encoding/json"
	"fmt"
	"io"
	"os"
	"path/filepath"

	"github.com/speakeasy-api/mcp-setup-docs/tools/lint-guide/internal/guidecheck"
)

const usageText = "Usage: npm run lint-guide -- [--json] [--meta-only] <slug|guides/<slug>|path>…"

type guideResult struct {
	Guide    string               `json:"guide"`
	Findings []guidecheck.Finding `json:"findings"`
}

type options struct {
	jsonOutput bool
	metaOnly   bool
	targets    []string
}

func main() {
	cwd, err := os.Getwd()
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(2)
	}
	os.Exit(execute(os.Args[1:], cwd, os.Stdout, os.Stderr))
}

func execute(args []string, cwd string, stdout, stderr io.Writer) int {
	opts, terminalUsage := parseArgs(args)
	if terminalUsage {
		fmt.Fprintln(stderr, usageText)
		return 2
	}
	repoRoot, err := findRepoRoot(cwd)
	if err != nil {
		fmt.Fprintln(stderr, err)
		return 2
	}
	return runOptions(opts, cwd, repoRoot, stdout, stderr)
}

func run(args []string, cwd, repoRoot string, stdout, stderr io.Writer) int {
	opts, terminalUsage := parseArgs(args)
	if terminalUsage {
		fmt.Fprintln(stderr, usageText)
		return 2
	}
	return runOptions(opts, cwd, repoRoot, stdout, stderr)
}

func parseArgs(args []string) (options, bool) {
	opts := options{targets: make([]string, 0, len(args))}
	for _, arg := range args {
		switch arg {
		case "--json":
			opts.jsonOutput = true
		case "--meta-only":
			opts.metaOnly = true
		case "--help", "-h":
			return options{}, true
		default:
			opts.targets = append(opts.targets, arg)
		}
	}
	return opts, len(opts.targets) == 0
}

func runOptions(opts options, cwd, repoRoot string, stdout, stderr io.Writer) int {
	jsonOutput := opts.jsonOutput
	targets := opts.targets

	dirs := make([]string, 0, len(targets))
	for _, target := range targets {
		dir, err := resolveGuideDir(target, cwd, repoRoot)
		if err != nil {
			fmt.Fprintln(stderr, err)
			return 2
		}
		dirs = append(dirs, dir)
	}

	results := make([]guideResult, 0, len(dirs))
	total := 0
	for _, dir := range dirs {
		var findings []guidecheck.Finding
		var err error
		if opts.metaOnly {
			findings, err = guidecheck.CheckMeta(dir, repoRoot)
		} else {
			findings, err = guidecheck.CheckGuide(dir, repoRoot)
		}
		if err != nil {
			fmt.Fprintln(stderr, err)
			return 2
		}
		total += len(findings)
		results = append(results, guideResult{Guide: dir, Findings: findings})
	}

	if jsonOutput {
		encoder := json.NewEncoder(stdout)
		encoder.SetIndent("", "  ")
		if err := encoder.Encode(results); err != nil {
			reportWriteError(stderr, err)
			return 2
		}
	} else if err := writeHuman(stdout, results); err != nil {
		reportWriteError(stderr, err)
		return 2
	}
	if total > 0 {
		return 1
	}
	return 0
}

func writeHuman(w io.Writer, results []guideResult) error {
	for _, result := range results {
		slug := filepath.Base(result.Guide)
		if len(result.Findings) == 0 {
			if _, err := fmt.Fprintf(w, "%s: ok\n", slug); err != nil {
				return err
			}
			continue
		}
		if _, err := fmt.Fprintf(w, "%s: %d finding(s)\n", slug, len(result.Findings)); err != nil {
			return err
		}
		for _, finding := range result.Findings {
			label := finding.Severity
			if finding.Rule != "" {
				label += "/" + finding.Rule
			}
			if _, err := fmt.Fprintf(w, "  [%s] %s %s: %s\n", label, finding.Target, finding.Where, finding.Problem); err != nil {
				return err
			}
			if _, err := fmt.Fprintf(w, "    → %s\n", finding.Suggestion); err != nil {
				return err
			}
		}
	}
	return nil
}

func reportWriteError(stderr io.Writer, err error) {
	fmt.Fprintf(stderr, "write output: %v\n", err)
}

func resolveGuideDir(arg, cwd, repoRoot string) (string, error) {
	cwdCandidate := arg
	if !filepath.IsAbs(cwdCandidate) {
		cwdCandidate = filepath.Join(cwd, cwdCandidate)
	}
	if pathExists(filepath.Join(cwdCandidate, "external.md")) || pathExists(filepath.Join(cwdCandidate, "meta.yaml")) {
		return filepath.Abs(cwdCandidate)
	}

	for _, candidate := range []string{
		filepath.Join(repoRoot, "guides", arg),
		filepath.Join(repoRoot, arg),
	} {
		if pathExists(candidate) {
			return filepath.Abs(candidate)
		}
	}
	return "", fmt.Errorf("No guide directory for %q", arg)
}

func findRepoRoot(start string) (string, error) {
	dir, err := filepath.Abs(start)
	if err != nil {
		return "", err
	}
	for {
		if pathExists(filepath.Join(dir, "schema", "guide.v1.schema.json")) {
			return dir, nil
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			return "", fmt.Errorf("repository root not found from %q", start)
		}
		dir = parent
	}
}

func pathExists(path string) bool {
	_, err := os.Stat(path)
	return err == nil
}
