# Actual-binary synthetic notification

`background-notification.jsonl` is the unmodified schema-3 Notification record
from Kit `61708db0397ee19fa05058b071dce9cdd5c3e258`, image
`factory-kit-dev:61708db-schema5` (`sha256:a0a9bd2a235463691796b5abed8200ea3ada7a1b4e3a8e74966d1d3ecd206e1d`).
A local deterministic HTTP mock with a fake key and fresh HOME drove background
compose → native acp.kit child → shell → response → follow-up → close → resumed
parent. No provider requests or private workspaces were used.

Contract: agentkit `8e4ee26`, agentkit-loop/src/lib.rs:3307-3348 serializes each
ToolResult into a StructuredPart within a Notification; agentkit-core/src/lib.rs:
780-795 defines value/schema/metadata. This is not a schema-5 child record.
