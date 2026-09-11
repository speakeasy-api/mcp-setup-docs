package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"github.com/speakeasy-api/mcp-setup-docs/go/internal/factoryresearch"
	"io"
	"os"
	"os/signal"
	"syscall"
	"time"
)

func main() {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	os.Exit(run(ctx, os.Args[1:], os.Stdout, os.Stderr))
}
func run(ctx context.Context, args []string, stdout, stderr io.Writer) int {
	fail := func() int { fmt.Fprintln(stderr, "invalid_research_request"); return 1 }
	if len(args) == 0 {
		return fail()
	}
	fs := flag.NewFlagSet("research-task", flag.ContinueOnError)
	fs.SetOutput(io.Discard)
	w := fs.String("workspace", "", "")
	var o factoryresearch.Options
	var seconds int64
	if args[0] == "run" {
		fs.StringVar(&o.Document, "document", "", "")
		fs.StringVar(&o.SHA256, "sha256", "", "")
		fs.StringVar(&o.Kind, "kind", "", "")
		fs.StringVar(&o.Input, "input", "", "")
		fs.Int64Var(&seconds, "timeout-seconds", 0, "")
	} else if args[0] != "init" {
		return fail()
	}
	if fs.Parse(args[1:]) != nil || fs.NArg() != 0 || *w == "" {
		return fail()
	}
	var v any
	var e error
	if args[0] == "init" {
		v, e = factoryresearch.Init(*w)
	} else {
		if seconds <= 0 || seconds > int64((1<<63-1)/int64(time.Second)) {
			return fail()
		}
		o.Workspace = *w
		o.Timeout = time.Duration(seconds) * time.Second
		v, e = factoryresearch.Run(ctx, o)
	}
	if e != nil {
		return fail()
	}
	if json.NewEncoder(stdout).Encode(v) != nil {
		return 1
	}
	return 0
}
