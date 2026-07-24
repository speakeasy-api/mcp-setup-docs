# Pipeline lockfile contract (v1)

Normative semantics for `guides/<slug>/pipeline.lock.json`. The JSON Schema is
[`schema/pipeline-lock.v1.schema.json`](../../schema/pipeline-lock.v1.schema.json).

This contract records, per guide, the **input fingerprints** that produced the
current artifacts so a later drafting run can **skip** steps whose inputs did
not change. The Cursor SDK workflow (`scripts/cursor-sdk`) honors these rules;
`--force` bypasses skips. `--overwrite` / `-y` only skips the guide-exists
prompt and still honors the lock.

## Location

Committed next to the guide bundle:

```
guides/<slug>/
  research.md
  meta.yaml
  setup.md
  pipeline.lock.json   ← this contract
```

`slug` in the lockfile must match the directory name.

## Step ids

| Key | Always run? | Skippable? |
| --- | --- | --- |
| `research` | yes | no (record only) |
| `draft` | no | yes |
| `review.fidelity` | no | yes |
| `review.achievability` | no | yes |

Deterministic **lint** (I4 grammar / meta schema) runs every review round and
is not a lock step — it is cheap and must see the current `setup.md`.

Legacy lock keys `review.voice`, `review.formatting`, and `review.concision`
may still appear in older `pipeline.lock.json` files; the workflow no longer
runs those dimensions (Writer self-check owns voice/formatting/concision).

**Out of v1 skip surface:** `revise`. It runs only when this run’s review
phase produces blockers. After a successful converge, the lock is rewritten
for `research`, `draft`, and all current `review.*` entries from the final
on-disk artifacts.

## Digests

All digests use the form `sha256:` + 64 lowercase hex digits (same as asset
`content_hash` in `schema/guide.v1.schema.json`).

### Stable content digests

`stable_digest(path)`:

- **`meta.yaml`:** parse YAML, recursively omit every `observed_at` key,
  canonicalize the remaining structure, then sha256 the canonical bytes.
  Research refreshes always bump `observed_at`; stripping it is what makes
  “research yielded nothing new” detectable.
- **`research.md` / `setup.md`:** sha256 of the file bytes as stored (no
  stripping). If frontmatter later gains volatile fields, that is a v2 concern.
- **Reading-list files** (doctrine, persona): sha256 of file bytes as stored.

### Paths

- **Reading list:** repo-relative (`CONTEXT.md`, `docs/agents/writer.md`, …).
- **Artifacts and outputs:** guide-relative (`research.md`, `meta.yaml`,
  `setup.md`). Never absolute `repoRoot` paths — digests must be portable
  across machines.

### `input_digest`

Canonical hash of the step’s `inputs` object after **normalized serialization**:

1. Omit keys with value `null` (do not emit them).
2. Sort object keys lexicographically at every level.
3. Serialize as UTF-8 JSON with no insignificant whitespace (compact form).
4. Arrays keep their declared order (reading lists and artifact lists are
   ordered).
5. `input_digest` = `sha256:` + hex(sha256(utf8_bytes)).

Implementations must recompute `input_digest` from `inputs` the same way;
storing a mismatched pair is invalid.

### `prompt_digest`

Hash of the prompt **template** with volatile assignment fields removed.
Slug, provider, guide directory, persona, and notes belong in `params` /
`reading_list`, not in the template digest. Never include `observed_at` or the
run `timestamp`. Reviewer templates must also exclude round number and `prior`
JSON — those are per-round runtime context, not lock inputs.

The contract only requires a stable byte sequence; hashing the template source
in the workflow is an implementation detail.

## Declared inputs per step

| Step | `model` | `reading_list` | `artifacts` | `params` |
| --- | --- | --- | --- | --- |
| `research` | resolved default model | `CONTEXT.md`, `docs/agents/shared.md`, `docs/agents/technical-research.md`, `docs/speakeasy-setup.md` | `[]` (sources are external) | `provider`, `notes` |
| `draft` | resolved default model | `CONTEXT.md`, `docs/agents/shared.md`, `docs/agents/writer.md`, `docs/personas/<id>.md` | stable digests of `research.md`, `meta.yaml` | `provider`, `notes`, `persona` |
| `review.<dim>` | resolved model for that dimension (default vs light/`sonnet` slot) | `CONTEXT.md`, `docs/agents/shared.md`, role doc (`fidelity.md` or `review.md`), plus persona file when the dimension uses a persona | stable digests of `research.md`, `meta.yaml`, `setup.md` | `provider`, `notes`, `persona`, `dimension` |

`model` is always the **resolved** model id (e.g. `claude-fable-5`), never a
slot alias like `sonnet`.

Top-level `runtime` (e.g. `cursor-sdk`) is observational and **must not**
appear inside `inputs` or affect `input_digest`.

## Research unchanged

Research **always executes**. After it completes, set in-memory
`research_unchanged` (not a lockfile field) as follows:

1. **No prior outputs** (first run for this guide): `research_unchanged = false`.
2. **Stable digest fast path:** snapshot `research.md` / `meta.yaml` before
   research; after research, if stable digests match the snapshot (or the
   previous lock’s `research.outputs`), `research_unchanged = true`. No judge.
3. **LLM judge path:** if digests differ, a research-change judge compares
   BEFORE vs AFTER. It sets `materially_changed=false` only when AFTER is
   equivalent for drafting (ignore `observed_at` churn and wording/reordering
   that does not change draft-relevant facts, anchors, credentials, remotes,
   prerequisites, or provenance-backed claims).
4. When the judge says not material, the orchestrator **restores** the
   pre-research snapshot on disk so artifact digests still match the lock and
   draft/review skips remain valid. When the judge says material (or returns
   no verdict), keep AFTER and set `research_unchanged = false`.
5. **`--force`:** skip the judge; treat research as changed for skip purposes
   (downstream skips are already bypassed). `--overwrite` does **not** do this.

Run Records may include `research_change: { method, unchanged, notes }` where
`method` is `digest` | `judge` | `none`.

## Skip predicates

A skippable step may be skipped only when **all** of the following hold:

1. Lockfile exists, `schema_version === 1`, `slug` matches the guide directory,
   and the step entry exists.
2. Recomputed `input_digest` equals the lock entry’s `input_digest`.
3. Every path in the lock entry’s `outputs` exists on disk and
   `stable_digest(path)` matches the recorded digest.
4. **No invalidation** this run (below).

Additionally for **`draft`:** `research_unchanged === true` must hold (equivalently:
draft’s artifact digests for research/meta already encode this if research
outputs were rewritten into draft inputs — but the explicit flag avoids
skipping draft when research changed and the lock is stale mid-run).

### Invalidation this run

- Research ran and `research_unchanged === false` → do not skip `draft` or any
  `review.*`.
- Draft ran → do not skip any `review.*`.
- Any `revise` ran → do not skip `review.*` for subsequent rounds in this
  run; after converge, rewrite the lock from final files.

### Review skip behavior

A skipped review dimension contributes **no new findings** this round. Prior
verdicts remain valid because artifacts and that dimension’s inputs are
unchanged.

If **any** dimension runs and returns blockers, enter the revise loop. Do
**not** use the lock to skip mid-loop rounds.

If draft is skipped and **all** `review.*` steps skip → do not run revise;
the run may exit as already satisfied. Run Records may note which steps
were skipped (additive; see `retro/README.md` when implemented).

### Escape hatch

`--force` (CLI) bypasses all skip checks and implies `--overwrite` (no
guide-exists prompt). `--overwrite` / `-y` alone allows non-interactive
overwrite while still honoring the lock. On a successful run, always rewrite
the lock.

## Example

Illustrative `guides/box/pipeline.lock.json` (digests are placeholders):

```json
{
  "schema_version": 1,
  "slug": "box",
  "persona": "it-admin",
  "runtime": "cursor-sdk",
  "updated_at": "2026-07-23T16:00:00Z",
  "steps": {
    "research": {
      "input_digest": "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      "inputs": {
        "model": "claude-fable-5",
        "prompt_digest": "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        "reading_list": [
          {
            "path": "CONTEXT.md",
            "digest": "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc"
          },
          {
            "path": "docs/agents/shared.md",
            "digest": "sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd"
          },
          {
            "path": "docs/agents/technical-research.md",
            "digest": "sha256:eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"
          },
          {
            "path": "docs/speakeasy-setup.md",
            "digest": "sha256:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
          }
        ],
        "artifacts": [],
        "params": {
          "provider": "Box",
          "notes": ""
        }
      },
      "outputs": [
        {
          "path": "research.md",
          "digest": "sha256:1111111111111111111111111111111111111111111111111111111111111111"
        },
        {
          "path": "meta.yaml",
          "digest": "sha256:2222222222222222222222222222222222222222222222222222222222222222"
        }
      ],
      "completed_at": "2026-07-23T15:50:00Z"
    },
    "draft": {
      "input_digest": "sha256:3333333333333333333333333333333333333333333333333333333333333333",
      "inputs": {
        "model": "claude-fable-5",
        "prompt_digest": "sha256:4444444444444444444444444444444444444444444444444444444444444444",
        "reading_list": [
          {
            "path": "CONTEXT.md",
            "digest": "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc"
          },
          {
            "path": "docs/agents/shared.md",
            "digest": "sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd"
          },
          {
            "path": "docs/agents/writer.md",
            "digest": "sha256:5555555555555555555555555555555555555555555555555555555555555555"
          },
          {
            "path": "docs/personas/it-admin.md",
            "digest": "sha256:6666666666666666666666666666666666666666666666666666666666666666"
          }
        ],
        "artifacts": [
          {
            "path": "research.md",
            "digest": "sha256:1111111111111111111111111111111111111111111111111111111111111111"
          },
          {
            "path": "meta.yaml",
            "digest": "sha256:2222222222222222222222222222222222222222222222222222222222222222"
          }
        ],
        "params": {
          "provider": "Box",
          "notes": "",
          "persona": "it-admin"
        }
      },
      "outputs": [
        {
          "path": "setup.md",
          "digest": "sha256:7777777777777777777777777777777777777777777777777777777777777777"
        }
      ],
      "completed_at": "2026-07-23T15:55:00Z"
    },
    "review.fidelity": {
      "input_digest": "sha256:8888888888888888888888888888888888888888888888888888888888888888",
      "inputs": {
        "model": "claude-fable-5",
        "prompt_digest": "sha256:9999999999999999999999999999999999999999999999999999999999999999",
        "reading_list": [
          {
            "path": "CONTEXT.md",
            "digest": "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc"
          },
          {
            "path": "docs/agents/shared.md",
            "digest": "sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd"
          },
          {
            "path": "docs/agents/fidelity.md",
            "digest": "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
          }
        ],
        "artifacts": [
          {
            "path": "research.md",
            "digest": "sha256:1111111111111111111111111111111111111111111111111111111111111111"
          },
          {
            "path": "meta.yaml",
            "digest": "sha256:2222222222222222222222222222222222222222222222222222222222222222"
          },
          {
            "path": "setup.md",
            "digest": "sha256:7777777777777777777777777777777777777777777777777777777777777777"
          }
        ],
        "params": {
          "provider": "Box",
          "notes": "",
          "persona": "it-admin",
          "dimension": "fidelity"
        }
      },
      "outputs": [
        {
          "path": "setup.md",
          "digest": "sha256:7777777777777777777777777777777777777777777777777777777777777777"
        }
      ],
      "completed_at": "2026-07-23T16:00:00Z"
    },
    "review.achievability": {
      "input_digest": "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      "inputs": {
        "model": "composer-2.5",
        "prompt_digest": "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
        "reading_list": [
          {
            "path": "CONTEXT.md",
            "digest": "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc"
          },
          {
            "path": "docs/agents/shared.md",
            "digest": "sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd"
          },
          {
            "path": "docs/agents/review.md",
            "digest": "sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd"
          },
          {
            "path": "docs/personas/it-admin.md",
            "digest": "sha256:6666666666666666666666666666666666666666666666666666666666666666"
          }
        ],
        "artifacts": [
          {
            "path": "research.md",
            "digest": "sha256:1111111111111111111111111111111111111111111111111111111111111111"
          },
          {
            "path": "meta.yaml",
            "digest": "sha256:2222222222222222222222222222222222222222222222222222222222222222"
          },
          {
            "path": "setup.md",
            "digest": "sha256:7777777777777777777777777777777777777777777777777777777777777777"
          }
        ],
        "params": {
          "provider": "Box",
          "notes": "",
          "persona": "it-admin",
          "dimension": "achievability"
        }
      },
      "outputs": [
        {
          "path": "setup.md",
          "digest": "sha256:7777777777777777777777777777777777777777777777777777777777777777"
        }
      ],
      "completed_at": "2026-07-23T16:00:00Z"
    }
  }
}
```

(Other `review.*` entries follow the same shape as `review.fidelity`, with
their own `dimension`, `model`, role-doc reading list, and digests.)

### Worked skip cases

- **Draft skipped:** research stable outputs match lock → `research_unchanged`;
  draft `input_digest` matches; `setup.md` still matches `draft.outputs`; same
  model, prompt template, reading list, persona, and notes.
- **Only achievability re-runs:** draft skipped as above; `review.achievability`
  model or `prompt_digest` or reading-list digest changed → that dimension
  runs; other `review.*` entries still match → they skip.

## Non-goals (v1)

- Generating lockfiles for existing guides until a successful converge writes one
- Caching revision by input digest
- Hashing live upstream HTTP sources so research itself can be skipped
  (research always runs by design)
- Claude harness (`scripts/draft-guide-workflow.js`) skip wiring (Cursor SDK only)
