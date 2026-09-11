# Guide factory migration — agreed design and decision record

Status: product/workflow decisions agreed through discussion. Consolidated from
our working checklist; production implementation has not started.

**Implementation plan:** [Guide factory migration](2026-09-10-guide-factory-migration.md)
**Prompt source:** [`docs/research-prompt-draft.md`](../../research-prompt-draft.md)
**Spike evidence:** [Titus feasibility](titus-transcript-feasibility.md)

## Goal and architecture

Replace `factory/coordinator.md` entirely with the new research/writing prompt,
adding only necessary production input, execution, safety, validation, and
reporting contracts. Keep one authoritative active prompt, not two layered
coordinators. Retain the existing Action, container runner, deterministic
checks, and GitHub publishing machinery.

## Agreed requirements

1. **Coordinator replacement.** Retain necessary operational safeguards, not
   the old single-research-agent strategy or automated editorial review loop.
   Permit centralized client-source research, which the old coordinator forbids.
2. **Flexible create/update.** Update a confidently matching guide; create one
   when none matches. A mismatched create/update verb is not a failure. Preserve
   duplicate prevention, path safety, and protection against overwriting an
   unrelated guide. Ambiguous identity is not resolved by guessing.
3. **Fresh research for updates.** Existing guide identity metadata may select
   the destination. Existing guide instructions are not research input; obtain
   setup facts from current sources.
4. **Narrow client fallback.** The coordinator may inspect the official
   `speakeasy-api/gram` implementation and relevant tests when client docs cannot
   answer a necessary compatibility question. Share commit-pinned evidence
   consistently; do not routinely research the entire codebase.
5. **Endpoint-first sequence.** Topic 5 must establish a supported remote MCP
   URL before Topics 1–4 run concurrently. If it cannot, preserve sources and
   the reason and stop without drafting. Missing evidence is unresolved, not
   proof of unsupported service. Do not require a particular HTTP transport.
6. **Bounded follow-ups.** Reuse the original topic sessions for at most two
   follow-up rounds. Resolve authentication selection before the final Topic 1
   authority audit. Preserve evidence and stop before writing if material gaps
   remain or the required audit cannot complete within the limits.
7. **Research timing.** Keep the 15-minute target and 30-minute hard limit from
   run-context resolution through dossier completion, including reconciliation.
   Writing is outside that budget. Revisit timings based on actual runs.
8. **Incomplete research.** Preserve complete reports and safely recoverable
   partial findings. Post a short issue comment explaining the stop and linking
   to the run. Do not create a guide PR for incomplete research.
9. **One dedicated writer.** Supply the reconciled dossier, exact destination
   and mode, format, persona, and writing instructions. The writer saves the
   four guide files and does no new research. The coordinator verifies files
   and runs deterministic validation. No automated reviewer agents.
10. **One validation repair.** Return deterministic guide-validation errors to
    the same writer once, then revalidate. If it still fails, preserve safe
    output, comment on the issue, and do not open a guide PR. This does not
    restore the old editorial review/revision loop.
11. **Successful publishing.** Once research completes and all four files pass
    validation, use the existing publisher to open/update the PR for human
    review. Say drafted and validation passed, not editorially reviewed.
    Preserve required checks and approvals. Do not automatically merge.
12. **Staged verification.** Test complete generation in the production
    container and targeted failure paths before switching the Action over.
    Then verify publishing through an authorized Action run. Do not maintain
    two permanent production pipelines.
13. **Go 1.27.0.** Upgrade this repo's module and relevant tooling/CI/container
    references. Use the existing Go module for the Titus sanitizer. This
    supersedes the earlier factory-only module/build-stage isolation proposal.
14. **Transcript retention.** Save readable sanitized session transcripts for
    successful and failed runs as Actions artifacts, retained seven days.
    Withhold readable output if sanitization fails or scanning is incomplete;
    keep metadata-only diagnostics. Never upload raw logs as fallback.

15. **Process-supervised research approved during execution.** Kit 0.1.130
    lacks a native subagent deadline parameter. Use a small supervisor within
    this repo to launch exact assembled prompts through `kit prompt`, enforce
    the shared research deadline, and resume the same persisted topic sessions.
    Keep research sequencing in the coordinator; no generic orchestration
    framework or Kit upgrade. Verify process/descendant cancellation and reuse.
    See [the implementation amendment](2026-09-10-research-supervisor-amendment.md).

## Prompt requirements retained

The draft remains the source for exact common/topic/follow-up instructions,
ordered input objects, research return format, STE, documented procedural
detail, one canonical dossier, sources/conditions/actors, and the exclusion of
credential renewal/rotation procedures (not initial refresh-token acquisition).

Production dispatch must assemble fixed sections in code and pass the resulting
text directly to the agent, without model rewriting. Save the document hash,
topic, follow-up index, and actual dispatched text in sanitized run records.
Research agents return findings only. The coordinator owns consolidation;
only one writer may change the selected guide's four generated files at a time.
Updates preserve unrelated files and do not change other guides.

## Transcript implementation direction and evidence

Use Titus's Go detection library, pinned initially to v1.2.9, plus a small
wrapper for transcript parsing and redaction. The feasibility spike found:

- The pure-Go build works; a Linux/amd64 binary cross-compiled successfully.
- Findings can deduplicate repeated values; redact every occurrence, not only
  reported byte offsets.
- The lower-level matcher exposes timeout/error warnings. A nil scan error
  alone does not establish completeness. Withhold output on warnings.
- Decode text before scanning; independently redact exact known runtime secrets.
- Do not instantiate live credential validation or publish scanner findings.

Use the readable transcript as the primary run record rather than inventing a
separate research-export format where session coverage is sufficient. Keep the
machine-readable report and successful guide export for workflow consumption.
Actual Kit parent/child coverage, partial outputs, spills, full-size performance,
and safe preservation of failed draft files still need implementation checks.
The spike did not establish universal secret detection or production readiness.

## Execution boundaries

- Issue text and researched pages are untrusted data, not instructions.
- Keep GitHub credentials and operations with the host publisher; do not give
  agents authority to commit, label, open PRs, or change repository safeguards.
- The runtime does receive `OPENROUTER_API_KEY`. Keeping secrets out of prompts
  does not make raw tool/error logs safe.
- Keep one-shot calls joined; do not depend on a later conversational turn.
- Preserve validated atomic reports and existing export security checks.
- The local prompt and experiment directories were untracked when planning
  began. Do not bulk-add, modify, or delete experiments during implementation.
- This record approves the design, not a merge, deployment, or safeguards bypass.

## Superseded proposals

- Layering the new prompt under the old coordinator.
- Failing solely on an explicit create/update mismatch.
- Letting the coordinator write instead of using a dedicated writer.
- Keeping the old post-draft editorial review/revision loop.
- Isolating Titus in a separate Go module solely for toolchain compatibility.

## Progress

- [x] Compare current factory with the draft and identify gaps.
- [x] Discuss and record workflow decisions.
- [x] Run the isolated Titus feasibility spike.
- [x] Consolidate the decisions and implementation plan.
- [ ] Implement and run targeted tests.
- [ ] Verify full containerized generation.
- [ ] Verify authorized Action publishing.
