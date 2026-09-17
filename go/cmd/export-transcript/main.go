package main

import (
	"flag"
	"fmt"
	"github.com/speakeasy-api/mcp-setup-docs/go/internal/factorytranscript"
	"io"
	"os"
)

func run(args []string, stderr io.Writer) int {
	flags := flag.NewFlagSet("export-transcript", flag.ContinueOnError)
	flags.SetOutput(io.Discard)
	home := flags.String("home", "", "")
	workspace := flags.String("workspace", "", "")
	output := flags.String("output", "", "")
	if flags.Parse(args) != nil || flags.NArg() != 0 || *home == "" || *workspace == "" || *output == "" {
		fmt.Fprintln(stderr, "transcript export: invalid arguments")
		return 2
	}
	// The factory supports this provider key only. Never enumerate environment,
	// accept secret argv flags, or read GH_TOKEN/GITHUB_TOKEN.
	if err := factorytranscript.Export(*home, *workspace, *output, []string{os.Getenv("OPENROUTER_API_KEY")}); err != nil {
		fmt.Fprintln(stderr, "transcript export: output withheld")
		return 1
	}
	return 0
}
func main() { os.Exit(run(os.Args[1:], os.Stderr)) }
