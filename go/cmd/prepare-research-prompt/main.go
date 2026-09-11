package main

import (
	"flag"
	"fmt"
	"github.com/speakeasy-api/mcp-setup-docs/go/internal/factoryprompt"
	"io"
	"os"
)

func main() { os.Exit(run(os.Args[1:], os.Stdout, os.Stderr)) }
func run(args []string, stdout, stderr io.Writer) int {
	fail := func(category string) int { fmt.Fprintln(stderr, category); return 1 }
	fs := flag.NewFlagSet("prepare-research-prompt", flag.ContinueOnError)
	fs.SetOutput(io.Discard)
	document := fs.String("document", "", "")
	hash := fs.String("sha256", "", "")
	kind := fs.String("kind", "", "")
	input := fs.String("input", "", "")
	if fs.Parse(args) != nil || fs.NArg() != 0 || *document == "" || *hash == "" || *kind == "" || *input == "" {
		return fail("invalid_arguments")
	}
	d, e := os.ReadFile(*document)
	if e != nil {
		return fail("document_read_failed")
	}
	in, e := os.ReadFile(*input)
	if e != nil {
		return fail("input_read_failed")
	}
	out, e := factoryprompt.Assemble(d, *hash, *kind, in)
	if e != nil {
		return fail(e.Error())
	}
	if _, e = stdout.Write(out); e != nil {
		return fail("output_write_failed")
	}
	return 0
}
