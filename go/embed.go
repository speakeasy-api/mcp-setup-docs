package guides

import "embed"

// Core publishable guide files. Asset PNGs, when present, are listed
// explicitly in generated/embed_gen.go (a zero-match glob is a compile error).
//
//go:embed generated/guides/*/meta.yaml
//go:embed generated/guides/*/external.md
//go:embed generated/guides/*/speakeasy.md
var embedded embed.FS
