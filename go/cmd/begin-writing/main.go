// begin-writing records phase intent only; all deadlines remain host-owned.
package main

import (
	"flag"
	"fmt"
	"io"
	"os"

	"github.com/speakeasy-api/mcp-setup-docs/go/internal/factoryrun"
)

func run(args []string) int {
	fs := flag.NewFlagSet("begin-writing", flag.ContinueOnError)
	fs.SetOutput(io.Discard)
	dir := fs.String("control-dir", "", "private control directory")
	id := fs.String("run-id", "", "host-assigned run identity")
	if fs.Parse(args) != nil || fs.NArg() != 0 {
		return 2
	}
	c, err := factoryrun.OpenControl(*dir, *id)
	if err != nil {
		return 2
	}
	defer c.Close()
	if c.Publish() != nil {
		return 1
	}
	return 0
}
func main() {
	code := run(os.Args[1:])
	if code != 0 {
		fmt.Fprintln(os.Stderr, "begin-writing: lifecycle signal rejected")
	}
	os.Exit(code)
}
