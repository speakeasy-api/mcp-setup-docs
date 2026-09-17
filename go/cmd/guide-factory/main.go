package main

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"io"
	"os"
	"os/signal"
	"path/filepath"
	"strconv"
	"syscall"

	"github.com/speakeasy-api/mcp-setup-docs/go/internal/factorycontroller"
)

func configuration(args []string, getenv func(string) string) (factorycontroller.ControllerConfig, *factorycontroller.Transport, error) {
	var c factorycontroller.ControllerConfig
	t := &factorycontroller.Transport{}
	env := func(key, fallback string) string {
		if v := getenv(key); v != "" {
			return v
		}
		return fallback
	}
	f := flag.NewFlagSet("guide-factory", flag.ContinueOnError)
	f.SetOutput(io.Discard)
	f.StringVar(&c.Workspace, "workspace", env("FACTORY_WORKSPACE_ROOT", "/workspace"), "")
	f.StringVar(&c.InputRoot, "input-root", env("FACTORY_INPUT_ROOT", "/input"), "")
	f.StringVar(&c.ControlDir, "control-dir", env("FACTORY_CONTROL_DIR", "/control"), "")
	f.StringVar(&c.RunID, "run-id", getenv("FACTORY_RUN_ID"), "")
	f.StringVar(&c.BeginBinary, "begin-binary", "/usr/local/bin/begin-writing", "")
	f.StringVar(&c.LintBinary, "lint-binary", "/usr/local/bin/lint-guide", "")
	f.StringVar(&c.GenerateBinary, "generate-binary", "/usr/local/bin/factory-generate", "")
	f.StringVar(&t.KitPath, "kit-binary", env("KIT_BIN", "/usr/local/bin/kit"), "")
	f.StringVar(&t.Home, "home", env("FACTORY_KIT_HOME", "/kit-home"), "")
	provider := f.String("provider", env("FACTORY_PROVIDER", "openrouter"), "")
	model := f.String("model", getenv("KIT_MODEL"), "")
	reasoning := f.String("reasoning-effort", getenv("KIT_REASONING_EFFORT"), "")
	budget := f.String("request-budget-seconds", env("KIT_REQUEST_BUDGET_SECONDS", "300"), "")
	bad := errors.New("invalid configuration")
	if f.Parse(args) != nil || f.NArg() != 0 {
		return c, nil, bad
	}
	seconds, err := strconv.Atoi(*budget)
	if err != nil || seconds <= 0 || *model == "" || *reasoning == "" || len(c.RunID) != 32 {
		return c, nil, bad
	}
	for _, r := range c.RunID {
		if !(r >= '0' && r <= '9' || r >= 'a' && r <= 'f') {
			return c, nil, bad
		}
	}
	for _, p := range []string{c.Workspace, c.InputRoot, c.ControlDir, c.BeginBinary, c.LintBinary, c.GenerateBinary, t.KitPath, t.Home} {
		if !filepath.IsAbs(p) || filepath.Clean(p) != p {
			return c, nil, bad
		}
	}
	t.Workspace = c.Workspace
	t.Args = []string{"--provider", *provider}
	switch *provider {
	case "openrouter":
	case "openai-subscription":
		t.Args = append(t.Args, "--credential-store", "file", "--credential-dir", "/subscription")
	default:
		return c, nil, bad
	}
	t.Args = append(t.Args, "--model", *model, "--reasoning-effort", *reasoning, "--request-budget-seconds", *budget, "--mcp-config", filepath.Join(c.Workspace, "factory/mcp/exa.json"))
	c.Turn = t.Turn
	return c, t, nil
}
func main() {
	c, _, err := configuration(os.Args[1:], os.Getenv)
	if err != nil {
		fmt.Fprintln(os.Stderr, "factory: invalid configuration")
		os.Exit(1)
	}
	ctx, cancel := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer cancel()
	if factorycontroller.RunController(ctx, c) != nil {
		fmt.Fprintln(os.Stderr, "factory: report creation failed")
		os.Exit(1)
	}
}
