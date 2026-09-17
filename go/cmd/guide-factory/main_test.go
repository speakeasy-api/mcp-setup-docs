package main

import (
	"strings"
	"testing"
)

func TestConfiguration(t *testing.T) {
	env := func(k string) string {
		return map[string]string{"KIT_MODEL": "model", "KIT_REASONING_EFFORT": "high", "FACTORY_RUN_ID": strings.Repeat("a", 32)}[k]
	}
	for _, provider := range []string{"openrouter", "openai-subscription"} {
		c, tr, err := configuration([]string{"--provider", provider}, env)
		if err != nil || c.Turn == nil || tr.Home != "/kit-home" || c.LintBinary != "/usr/local/bin/lint-guide" {
			t.Fatal(c, tr, err)
		}
		args := strings.Join(tr.Args, " ")
		if !strings.Contains(args, "--mcp-config /workspace/factory/mcp/exa.json") || strings.Contains(args, "--credential-store file") != (provider == "openai-subscription") || strings.Contains(args, "--credential-dir /subscription") != (provider == "openai-subscription") {
			t.Fatal(args)
		}
	}
	for _, args := range [][]string{{"--provider", "bad"}, {"--home", "relative"}, {"--request-budget-seconds", "0"}, {"--unknown", "secret"}, {"extra"}} {
		if _, _, err := configuration(args, env); err == nil || err.Error() != "invalid configuration" {
			t.Fatal(args, err)
		}
	}
}

func TestConfigurationKitBinary(t *testing.T) {
	env := func(k string) string {
		return map[string]string{"KIT_MODEL": "model", "KIT_REASONING_EFFORT": "high", "FACTORY_RUN_ID": strings.Repeat("a", 32), "KIT_BIN": "/trusted/kit"}[k]
	}
	_, tr, err := configuration(nil, env)
	if err != nil || tr.KitPath != "/trusted/kit" {
		t.Fatalf("KIT_BIN not preserved: %v %v", tr, err)
	}
	_, tr, err = configuration([]string{"--kit-binary", "/explicit/kit"}, env)
	if err != nil || tr.KitPath != "/explicit/kit" {
		t.Fatalf("explicit override lost: %v %v", tr, err)
	}
}
