# Design: conversational feedback on factory pull requests

**Status:** agreed, not built.
**Branch:** `walker/interactive-unconverged-feedback`.
**Date:** 2026-08-11.

This document records a design that Walker and Claude agreed in conversation.
No code implements it yet. Read it before you change the feedback surface.

---

## 1. The problem

The drafting pipeline starts from the `guide:draft` label on a GitHub issue.
Each run ends with one status. Two statuses need an answer from Walker before
the guide ships.

| Exit | Status | What the factory posts today |
| --- | --- | --- |
| 0 | `converged` | Ready-for-review pull request, plus a **Pipeline review** comment |
| 2 | `unconverged`, `blocked`, `failed` | Draft pull request, plus a **Pipeline review** comment |
| 3 | `awaiting_scope` | Draft pull request, plus a **Scope check** comment |

The factory posts every question at once, in one comment on the issue. Walker
calls this a wall of text. He gave the reason:

> This wall of text is not great. It means I have to scroll back and forth
> between the PR/body and my comment. It would be great if questions could be
> answered one-by-one. Almost conversationally.

Live examples: issue
[#142](https://github.com/speakeasy-api/mcp-setup-docs/issues/142) and pull
request [#143](https://github.com/speakeasy-api/mcp-setup-docs/pull/143).

Four separate defects make the comment worse than the work behind it.

**The comment lists more questions than the run found.** The Scope check on
issue #142 lists 9 questions. `guides/hubspot/research.md` on branch
`guide/issue-142-hubspot` holds only 5, at lines 406, 415, 423, 428 and 434.
The extra 4 are truncated copies of the same 5 topics.

**Every open-question bullet loses its body.** The regex at
`pipeline/src/scope-gate.ts:71` matches one line. Every open-question bullet in
this repository wraps onto a continuation line. A scan of all 18 `research.md`
files with an `## Open questions` section found 53 bullets, and all 53 wrap.
The extractor therefore truncates 53 of 53. One example reads: `The MCP Auth
Apps UI was announced as`.

**The merge step cannot join a fragment to its full sentence.**
`mergeOpenQuestions` (`pipeline/src/scope-gate.ts:77`) keys on the exact
lowercase text. A truncated fragment and the full sentence produce different
keys, so both survive.

**One path has no duplicate suppression at all.**
`partitionFindings` (`pipeline/src/factory/format-pipeline-review.ts:99`)
removes duplicates by `target` plus `locus`. `format-scope-check.ts` has no
equivalent step anywhere in the file.

Two more problems sit outside the formatters.

**Walker receives no notification.** The factory posts as `walker-tx`, which is
a `User` account, not a bot. `guide-draft.yml:24` sets
`GH_TOKEN: ${{ secrets.AGENT_PAT || secrets.GITHUB_TOKEN }}`. GitHub does not
notify a person about their own actions, so the comment arrives silently.

**The reply protocol does not match how Walker replies.**
`parsedDecisionNumbers` (`pipeline/src/scope-gate.ts:96`) matches
`/Decision\s+(\d+)\s*:/`. Walker's real replies on issue #51 do not match it:

```
1 - ignore the catalog mcp server. Follow the docs...
2 - Ignore this.
3 - not sure what to make of this? follow the oauth setup per #1.
```

He also states policy that attaches to no numbered question at all:

```
For this guide, we should ignore the catalog MCP server. We should act as if it doesn't exist.
```

---

## 2. How often this path runs

Size the machinery against the real load. A count over the 60 records in
`retro/runs/` gives:

| Status | Records |
| --- | --- |
| `converged` | 46 |
| `unconverged` | 11 |
| `awaiting_scope` | 1 |
| `blocked` | 1 |
| `failed` | 1 |

Only **12 runs of 60** need an answer. The 11 unconverged runs carry these
unresolved counts: 1, 1, 1, 1, 2, 2, 3, 3, 5, 9, 9. The median is **2**.

Two more counts shape the design:

- 39 of the 46 converged runs still carry `open_questions`.
- **0** converged runs carry any `unresolved` finding.

So the common case is a converged guide with soft questions that block nothing.
The design must stay quiet in that case.

---

## 3. The target experience

Walker answers one question at a time, in place, with a reply box next to the
question. He never matches an answer to a number by hand. He sees a count of
what remains open. Each run adds to the same conversation instead of replacing
it.

---

## 4. The design in two steps

**Step 1 repairs the current comment.** It adds no new API surface, no model
call and no application token. It is worth shipping on its own.

**Step 2 moves the questions into review threads.** Build it after step 1 ships
and after the spike in section 6 returns an answer.

---

## 5. Step 1 — deterministic repairs

Each item below is a pure function with a test. The 60 committed run records
make good fixtures. `npm test` runs `tsx --test "src/**/*.test.ts"`.

### 5.1 Keep the whole bullet

**File:** `pipeline/src/scope-gate.ts:71`, in `extractOpenQuestionsFromResearch`.

**Defect:** the regex `/^\s*[-*]\s+(.+?)\s*$/` captures one line. It drops every
continuation line.

**Fix:** collect the continuation lines into the same bullet. A continuation
line is indented, is not empty, and does not start a new bullet. Stop the bullet
at the next bullet marker, at a blank line, or at the next `##` heading.

**Test:** feed a wrapped bullet and assert the whole sentence returns.

### 5.2 Merge a fragment into its full sentence

**File:** `pipeline/src/scope-gate.ts:77`, in `mergeOpenQuestions`.

**Defect:** the key is the exact lowercase text, so a truncated fragment never
matches the full sentence.

**Fix:** treat a question as a duplicate when one text is a prefix of the other,
after both are normalised. Keep the longer text. Fix 5.1 first, because it
removes most of the fragments at the source.

**Test:** use the real pair from `retro/runs/2026-07-24T17:26:32Z-salesforce.json`.
The `soft` array there holds both `Salesforce's April 2026 GA announcement says
Hosted MCP Servers are` and its longer form.

### 5.3 Drop a finding that the run itself refuted

**Defect:** the factory turns a finding into a question even when the same run
disputed it.

**Evidence:** `retro/runs/2026-07-28T19:30:59Z-snowflake.json` reports
`external.md is missing` and `speakeasy.md is missing`. The `history[].disputed`
array in the same record states: `external.md exists and contains the
provider-side setup`. So 2 of the 5 questions in that run are false.

**Fix:** before you format, remove any finding that a `history[].disputed` entry
refutes. Match on the same anchor or on strong token overlap.

**Test:** load the snowflake record and assert 3 questions, not 5.

### 5.4 Add duplicate suppression to the scope path

**File:** `pipeline/src/factory/format-scope-check.ts`.

**Defect:** the file has no duplicate suppression. `partitionFindings` protects
only the Pipeline review path.

**Fix:** extend the `partitionFindings` approach to the scope path, or normalise
both paths through one shared helper.

**Test:** load the hubspot run record and assert 5 questions, not 9.

### 5.5 Shrink both long copies

The same long text appears in two places today:

- `pipeline/src/factory/cmd-pr.ts:93-108` appends it to the pull request body.
- `pipeline/src/factory/cmd-comments.ts:54-103` posts it as an issue comment.

**Fix:** reduce both to a summary plus a link. The summary states the counts,
for example `3 decisions, 2 soft questions, 7 nits`.

**Warning — do not delete the full formatter.** `runMarkBlocked`
(`cmd-comments.ts:106`) calls `formatPipelineReview` at lines 142 and 154. A
hard failure opens no pull request, so that path has nothing to link to. Write a
comment in the code that says so, or somebody deletes the formatter later.

### 5.6 Keep the nits collapsed

Nits stay in the summary. They never become a thread. A collapse already exists
at `format-pipeline-review.ts:337-342`, but it triggers only when the run
produces more than 12 nits. Lower that threshold, or always collapse.

---

## 6. The spike — results

The spike ran on 2026-08-11 against the live repository
`speakeasy-api/mcp-setup-docs`. All of the results below are measured. None of
them is a guess.

The spike held no approval to push to a live branch. It therefore used a
throwaway pull request for each step that needs a push.

The spike ran in two places:

- **Pull request #143**, head `guide/issue-142-hubspot`, head sha
  `3653e348138a6aa92942f335b7093ac638dedc6f`. Only review comments went here.
  The spike pushed **no** commit to this branch, because that branch is the
  live resume source for issue #142.
- **Pull request #155**, a throwaway draft on branch
  `spike/review-thread-outdated-check`, cut from `main` at
  `ebf2637853f198ca8d8a8c80c0e6932e40386906`. The Outdated test needs a push,
  so it ran here. The test file was `docs/spike-scratch.md`. No workflow
  triggers on `docs/**`; `actions/runs` for that branch reported
  `total_count` 0 after all three commits.

The spike deleted every comment and closed pull request #155 with its branch.
`gh api repos/speakeasy-api/mcp-setup-docs/pulls/comments` returns `[]` again.
`main` stayed at `ebf2637853f198ca8d8a8c80c0e6932e40386906`.

### 6.1 The required field set

A file-level thread needs **four** fields. `POST /repos/{owner}/{repo}/pulls/{n}/comments`
rejects the request with HTTP 422 if you omit any one of them.

| Field | Required | Note |
| --- | --- | --- |
| `body` | Yes | Plain string. |
| `commit_id` | Yes | The head sha. |
| `path` | Yes | Must appear in the pull request diff. See 6.2. |
| `subject_type` | Yes | The value is `file`. Omit it and the endpoint asks for a line. |
| `line`, `side`, `position` | No | The spike sent none of them and the request passed. The spike did not test whether the endpoint accepts them together with `subject_type: "file"`. |

The error body carries a `message` field. This is the verbatim `message` text
for each omission.

Omit `commit_id`:

```
Invalid request.

No subschema in "oneOf" matched.
"positioning" wasn't supplied.
"commit_id", "position" weren't supplied.
"in_reply_to" wasn't supplied.
"subject_type" is not a permitted key.
"commit_id", "line" weren't supplied.
"commit_id" wasn't supplied.
```

Omit `path`:

```
Invalid request.

No subschema in "oneOf" matched.
"positioning" wasn't supplied.
"path", "position" weren't supplied.
"in_reply_to" wasn't supplied.
"subject_type" is not a permitted key.
"line", "path" weren't supplied.
"path" wasn't supplied.
```

Omit `body`:

```
Invalid request.

No subschema in "oneOf" matched.
"body", "positioning" weren't supplied.
"body", "position" weren't supplied.
"body", "in_reply_to" weren't supplied.
"subject_type" is not a permitted key.
"body", "line" weren't supplied.
"body" wasn't supplied.
```

Omit `subject_type`:

```
Invalid request.

No subschema in "oneOf" matched.
"positioning" wasn't supplied.
"position" wasn't supplied.
"in_reply_to" wasn't supplied.
"line" wasn't supplied.
"subject_type" wasn't supplied.
```

The last error shows the fallback. Without `subject_type`, the endpoint reads
the request as a line-level comment and demands `line` or `position`. So
`subject_type: "file"` is what removes the line requirement.

### 6.2 The path must appear in the diff

This is confirmed. A `path` that exists in the repository but sits outside the
diff is rejected. The spike sent `path=pipeline/src/scope-gate.ts` with a valid
`commit_id`. That file exists at that sha, 5540 bytes, blob
`38fca650c19ea90133bd924f1dd347624cea5104`. It is not one of the 3 changed
files of #143. The response was HTTP 422 with this verbatim body:

```json
{"message":"Validation Failed","errors":[{"resource":"PullRequestReviewComment","code":"invalid","field":"pull_request_review_thread.path","message":"could not be resolved"}],"documentation_url":"https://docs.github.com/rest/pulls/comments#create-a-review-comment-for-a-pull-request","status":"422"}
```

The `gh` CLI prints only `Validation Failed (HTTP 422)`. Read the `errors`
array to get the real cause. This result confirms the fallback rule in section
7.2: when the finding's `target` file is outside the diff, the thread must move
to a file that is inside the diff.

### 6.3 The identifiers the API returned

A file-level thread posted correctly on #143 with all four fields:

| Field | Value |
| --- | --- |
| `id` | `3761689313` |
| `node_id` | `PRRC_kwDOTgiw8M7gNtLh` |
| `path` | `guides/hubspot/research.md` |
| `subject_type` | `file` |
| `position` | `1` |
| `original_position` | `1` |
| `line` | `1` |
| `original_line` | `1` |
| `side` | `RIGHT` |
| `diff_hunk` | `""` (empty) |
| `commit_id` | `3653e348138a6aa92942f335b7093ac638dedc6f` |
| `original_commit_id` | `3653e348138a6aa92942f335b7093ac638dedc6f` |
| `pull_request_review_id` | `4910723715` |

GitHub wrapped the comment in a review object on its own. The spike did not
create a review first. Deletion of the comment also removed that review:
`repos/{owner}/{repo}/pulls/143/reviews` returns `[]` again. Step 2 must expect
a review object that it did not ask for.

GraphQL showed the same thread as a `PullRequestReviewThread`:

| Field | Value |
| --- | --- |
| `id` | `PRRT_kwDOTgiw8M6YYECF` |
| `subjectType` | `FILE` |
| `isOutdated` | `false` |
| `isResolved` | `false` |
| `isCollapsed` | `false` |

Note that `position` and `line` are `1` for a file-level thread. They are not
`null`. Do not read a non-null `position` as proof that a thread anchors to a
line. Read `subject_type` instead.

### 6.4 A file-level thread does not go Outdated

**A file-level thread does not go Outdated after a commit rewrites the file.**
A line-level thread on the same file does.

The spike put two threads on `docs/spike-scratch.md` in pull request #155 at
commit `3d23e78449893899a7b5f9d0831d82728c3a38e1`:

- A file-level thread, comment `3761699649`, node `PRRC_kwDOTgiw8M7gNvtB`,
  thread `PRRT_kwDOTgiw8M6YYFxv`.
- A line-level control thread at line 2, comment `3761699739`, node
  `PRRC_kwDOTgiw8M7gNvub`, thread `PRRT_kwDOTgiw8M6YYFyw`.

Both threads started at `isOutdated: false`.

The spike then pushed commit `ea009caefa0bcced0727080566a6d91db89a5383` to
`spike/review-thread-outdated-check`. That commit rewrote every line of
`docs/spike-scratch.md`, from 3 lines to 4 different lines. Results after the
push:

| Thread | `isOutdated` | REST `line` | REST `position` | REST `commit_id` |
| --- | --- | --- | --- | --- |
| File-level `3761699649` | `false` | `1` | `1` | moved to `ea009cae` |
| Line-level `3761699739` | **`true`** | **`null`** | `1` | stayed at `3d23e784` |

The control thread proves the test works. GitHub does mark threads Outdated on
this repository and on this pull request. It just does not mark the file-level
one.

The spike then pushed a third commit,
`b24421353466443e86976f1330804716d232489e`, which rewrote the file again to 2
new lines. The file-level thread stayed `isOutdated: false`. The line-level
thread stayed `isOutdated: true`. So the result holds across more than one
rewrite. This is the case that matters, because a later run resumes on the
same branch and pushes again.

**Correction to an assumption.** REST `position` does **not** become `null`.
It stayed `1` on both threads, including the line-level thread that GitHub
marked Outdated. The REST field that reports Outdated is `line`, which became
`null`. Do not test `position` for this. Prefer the GraphQL `isOutdated` field,
because it is unambiguous.

One minor observation, recorded but not relied on: the file-level comment's
`commit_id` moved to the second commit but did not move again to the third.
`original_commit_id` never moved. The design must not depend on `commit_id`
tracking the head sha.

### 6.5 Verdict

**Section 7.3 survives with no change.** A file-level thread keeps its
identity, stays `isOutdated: false`, and stays visible and repliable after
later commits rewrite the file under it.

---

## 7. Step 2 — review threads

### 7.1 Surface

Use **review threads on the factory pull request**. A comment on an issue is a
flat list and cannot thread. A review thread gives an inline reply box, a
**Resolve conversation** control, an unresolved counter, and automatic collapse
when resolved. That set of controls is the whole feature.

### 7.2 Placement

Attach each thread at file level, with `subject_type: "file"`. Do not anchor to
a line.

**Reason:** the question lines usually sit outside the diff. None of the 5 open
questions in `guides/hubspot/research.md` falls inside a diff hunk of pull
request #143. The hunks cover lines 1-7, 20-30, 103-137, 242-249, 275-281,
360-374, 440-446, 462-487 and 519-552. The questions sit at lines 406, 415, 423,
428 and 434.

Choose the file this way:

- Use the finding's `target` file when that file appears in the diff.
- Otherwise use the run record. A run record is always new, so it is always in
  the diff. In pull request #143,
  `retro/runs/2026-08-11T15:40:29Z-hubspot.json` is `added`, 79 lines added and
  0 removed.

Paste the relevant guide text into the thread body instead of anchoring to it.
`format-pipeline-review.ts:130` already holds `quoteSection` for this. Export it.

### 7.3 Thread identity across runs

A later run resumes on the same branch and the same pull request. It writes new
findings. The threads from the earlier run are still there. The factory must
recognise a question it already asked.

**Carry a hidden marker in the thread body**, for example:

```html
<!-- factory-thread: hubspot#enroll-developer-account -->
```

**Key the marker on the anchor alone.** Do not include `target`, because
`target` drifts between runs.

**Evidence that the anchor holds and the wording does not.** In
`retro/runs/2026-07-23T22:43:32Z-x.json`, round 1 says `The enrollment flow
omits the exact field and submission-control labels.` Round 3 says `The
first-time enrollment path lacks the required field labels and final
submission-control label.` Both carry the anchor `#enroll-developer-account`.

**A finding with no anchor posts a new thread.** Accept the duplicate. The
alternative keys on drifting text and pairs the wrong answer to the wrong
question, which is worse. `extractAnchor`
(`format-pipeline-review.ts:66`) needs a literal `#`; when it finds none,
`locus` falls back to `where.slice(0, 80)`, and that value drifts.

### 7.4 Thread lifecycle

| State | Meaning |
| --- | --- |
| Unresolved | The guide cannot ship until you answer. |
| Resolved | For information. Unresolve the thread and reply to steer the next run. |

**Every run posts threads, including a converged run.** A converged run posts
its threads **already resolved**. Each resolved thread carries one line that
tells the reader to unresolve it and reply. This keeps one surface for all
feedback and gives Walker a way to steer a guide that the pipeline thinks is
finished. Section 2 shows why this matters: 39 of 46 converged runs still carry
open questions.

The factory never resolves a thread on Walker's behalf. Only Walker resolves a
thread.

### 7.5 Thread body

Write four parts, in this order:

1. The question, in plain words.
2. The context. Quote the guide text with `quoteSection`.
3. A recommendation.
4. One hint line that tells the reader to reply in the thread and to resolve it
   when the answer is complete.

Do not print a fixed reply menu. The current menu at
`format-scope-check.ts:66-75` offers `Decision N: verified — …`,
`Decision N: drop this branch` and `Decision N: hedge — …`. Drop it. Walker does
not use that form, as section 1 shows.

Drop the `Decision N:` numbering wherever a thread exists. The thread pairs the
answer to the question, so the number does no work.

### 7.6 The recommendation rule

This rule is strict, because `doctrine/constitution.md` rule I1 says the Dossier
is the fact ceiling.

- **Always give a disposition.** For example: hedge this, drop this branch, or
  document the conditional path.
- **Give a fact only when the agent can cite a locator.** Rule I2 requires a
  documentation locator and an observed date.
- **Never state a fact that the model produced from nothing.** A visible gap
  beats an invisible patch.

### 7.7 Who writes the recommendation

A light model call on the factory side writes each thread body at comment time.
Model it on `pipeline/src/resolve-issue.ts`. That file already makes one
OpenRouter chat completion with an injectable `ChatCompletion` type at line 40
and `DEFAULT_LIGHT_MODEL = 'openai/gpt-5.6-sol'` at line 37.

**Keep the call on the factory side, not in the pipeline.** `FACTORY.md` warns
that the model identifier feeds `input_digest`. A new pipeline phase would go
cold against every committed lock file.

### 7.8 Feeding the answers back

`cmd-distill.ts:41` reads `repos/${repo}/issues/${n}/comments`. That endpoint
does **not** return review comments on a pull request.

Extend `cmd-distill.ts` to also read `repos/${repo}/pulls/${pr}/comments`.
Filter to Walker's replies by author. Fold both sources into the same notes
string that already feeds `--notes`.

**Never let raw question text reach `notes`.** `notesDisposeOfQuestion`
(`scope-gate.ts:111`) needs 2 token overlaps of 5 characters or more between the
answer and the question. If the question text lands in the notes blob, the
helper finds each question's own tokens there and clears the whole gate.

### 7.9 Bridging the thread to the scope gate

The gate must decide which questions Walker answered.

- **Where an anchor exists, use a deterministic key.** The thread marker already
  carries the anchor, so the match needs no model. This covers the unconverged
  path, where findings carry anchors.
- **Where no anchor exists, fall back to the model.** Scope questions have no
  anchor.

The existing deterministic helper alone is not enough.
`notesDisposeOfQuestion` provably fails on the `x.json` case: the answer `I have
no console access for X, hedge everything` shares zero tokens with the
enrollment question.

### 7.10 Bot identity

Mint a token from the existing `gram-bot` application, so the threads arrive
from a bot and Walker gets a notification. The application is already installed
on `mcp-setup-docs`.

Copy the pattern at `.github/workflows/go-module-consumer-bump.yml:33-44`. It
uses `actions/create-github-app-token` with the secrets `GRAM_BOT_APP_ID` and
`GRAM_BOT_PRIVATE_KEY`. Note that the existing step scopes the token to
`repositories: gram`. A new step needs `repositories: mcp-setup-docs`.

---

## 8. What this design rejects

Do not resurrect these. Each one was agreed at some point and then killed.

**A serial loop that asks one question and waits.** The GitHub Actions path has
no terminal and no human present. The pipeline cannot block on an answer.

**A listener workflow that reacts to a reply.** Walker keeps the `guide:draft`
label as the go button. A listener adds a moving part and a race for no gain.

**Automatic start when the last thread resolves.** Same reason. Walker decides
when the next run starts.

**A model that resolves threads.** Only Walker resolves a thread. A model that
resolves the wrong thread loses an answer silently, and rule I6 forbids that.

**The `pull_request_review_thread` trigger.** It is not a GitHub Actions event.
The workflow schema at `https://json.schemastore.org/github-workflow.json` lists
34 events. Only four concern pull request reviews: `pull_request`,
`pull_request_review`, `pull_request_review_comment` and `pull_request_target`.
An unknown key under `on:` fails **silently**.

**Line-anchored review comments.** Section 7.2 gives the evidence.

**Wipe and repost the threads each run.** It discards Walker's answers.

**A terminal or a Claude Code skill as the surface.** Walker works in GitHub.

---

## 9. Risks and open items

**The spike is complete and it passed.** A file-level thread does not go
outdated after a commit rewrites the file. Section 7.3 needs no change. Read
section 6 for the measured results.

**An anchorless finding posts a duplicate thread.** This is accepted, not
solved. Watch how often it happens.

**Nothing blocks a merge mechanically.** `main` has no branch protection, so an
unresolved thread stops nobody. The unresolved state is a signal, not a gate.

**The gate reads the previous run's answers.** Distill runs at the start of run
N and reads the threads from run N-1. `evaluateScopeGate`
(`pipeline/src/workflow.ts:1108`) then matches against the list that run N's
research just produced. This mismatch exists today and this design does not fix
it.

**Doctrine constrains the change.** Rule I7 says pipeline agents never commit;
the factory command-line tool commits. If any change touches `doctrine/`, use
the `/tune-pipeline` skill. Rule I8 requires a human-approved diff and an entry
in `doctrine/CHANGELOG.md`.

---

## 10. Documentation to change

Step 2 makes these wrong. Change them in the same pull request.

- `FACTORY.md:49-50` describes the `Decision N: …` protocol.
- `FACTORY.md:59-62` tells the reader to reply on the issue.
- `FACTORY.md:184` states that the gate needs `Decision N:` replies in the notes.
- `format-scope-check.ts:127` prints `Reply on **this issue**`.

---

## 11. Definition of done

**Step 1 is done when:**

- The hubspot record produces 5 questions, not 9.
- The snowflake record produces 3 questions, not 5.
- No open-question bullet ends mid-sentence.
- The pull request body and the issue comment each hold a summary and a link.
- The spike result is written into section 6.

**Step 2 is done when:**

- An unconverged run posts one unresolved thread per question.
- A converged run posts its threads resolved.
- A second run on the same branch adds no duplicate thread for an anchored
  question.
- `cmd-distill.ts` folds Walker's thread replies into the notes.
- The threads arrive from `gram-bot` and Walker gets a notification.

---

## 12. House rules

- The product is the **Speakeasy AI Control Plane**, or **Speakeasy**. Never
  call it "Gram".
- Write all prose in ASD-STE100 Simplified Technical English.
- Do not commit or push unless Walker asks.
- Run `unset GITHUB_TOKEN GH_TOKEN;` before each `gh` command. A stale
  environment variable hides valid keyring authentication.
