# Guide factory operations

## Failed Kit diagnostics

When `Run Kit` fails or reports a factory failure (even with a successful step),
the workflow uploads the validated
`factory-diagnostics.json` file as a repository-access-controlled artifact. The
issue failure comment remains a safe summary that links to the workflow run; it
does not read or inline diagnostics.

Download and inspect a bundle with:

```bash
gh run download RUN_ID \
  --repo speakeasy-api/mcp-setup-docs \
  --name guide-factory-diagnostics-RUN_ID-RUN_ATTEMPT
jq . factory-diagnostics.json
```

Artifacts expire after seven days. They contain no raw transcript or tool
payloads. If runtime-event parsing fails, rejected events are discarded; the
bundle still retains independently validated failure metadata and the outer Kit
invocation status. The workflow log records the parser failure. If bundle
validation itself fails closed, the workflow safely skips the missing artifact.
