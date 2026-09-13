package main

import (
	"fmt"
	"github.com/speakeasy-api/mcp-setup-docs/go/internal/factorytranscript"
	"os"
)

func main() {
	if len(os.Args) != 4 {
		fmt.Fprintln(os.Stderr, "factory finalization: invalid arguments")
		os.Exit(2)
	}
	if factorytranscript.Finalize(os.Args[1], os.Args[2], os.Args[3], []string{os.Getenv("OPENROUTER_API_KEY")}) != nil {
		fmt.Fprintln(os.Stderr, "factory finalization: incomplete")
		os.Exit(1)
	}
}
