package guides

import "embed"

// Publishable guide tree. The generator only copies meta.yaml, external.md,
// speakeasy.md, and schema-declared assets into generated/guides, so embedding
// the directory is safe and keeps screenshots reachable via Guide.Assets.
//
//go:embed generated/guides
var embedded embed.FS
