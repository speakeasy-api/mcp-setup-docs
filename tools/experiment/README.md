# A/B experiment runner

Does the north-star research methodology make guide production cheaper? Run one
arm per invocation and diff the results.

- **arm `a`** — control. Doctrine exactly as committed.
- **arm `b`** — treatment. `doctrine/roles/technical-research.northstar.md`
  overwrites `doctrine/roles/technical-research.md`.

Each arm runs **cold** (`guides/<slug>/` is deleted first, so research has no
prior dossier to revise) and **isolated** (a throwaway detached worktree under
`/tmp/ns-exp/`). Your working tree is never mutated.

## Run

```bash
export OPENROUTER_API_KEY=sk-or-...     # required — the pipeline runs on pi + OpenRouter
export PULSE_REGISTRY_KEY=...           # optional, passed through
export PULSE_REGISTRY_TENANT=gram-recommended

tools/experiment/run-ab.sh box a
tools/experiment/run-ab.sh box b
```

The script exits with the pipeline's own exit code: `0` converged, `2`
unconverged/blocked/failed, `3` awaiting scope.

## Results

`tools/experiment/results/<slug>-<arm>/` (gitignored):

| file | what |
| --- | --- |
| `guides/<slug>/` | everything the run produced |
| `<timestamp>-<slug>.json` | the run record this run wrote to `retro/runs/` |
| `run.log` | full stdout + stderr, including `npm install` |
| `meta.json` | slug, arm, exit code, wall-clock seconds, repo SHA, SHA256 of the arm's `technical-research.md`, worktree path |

Re-running the same slug+arm never clobbers: the second result lands in
`<slug>-<arm>-<timestamp>/` and the script says so.

Wall-clock timing covers the pipeline run only — `npm install` happens before
the clock starts, so a cold worktree does not inflate the number.

## Worktrees

On exit `0` the throwaway worktree is removed. On any non-zero exit it is left
in place and its path is printed, so you can inspect partial output. Clean up
stragglers with:

```bash
git worktree list | grep /tmp/ns-exp
git worktree remove --force /tmp/ns-exp/<slug>-<arm>-<timestamp>
```

## What the arms actually run

The worktree is created from the **current commit** (`git rev-parse HEAD`), not
from your working tree. Uncommitted changes to `pipeline/` are therefore absent
from both arms — which is what you want for a controlled comparison, but commit
any pipeline fix you need before running.

The one exception is `technical-research.northstar.md`: arm `b` looks for it in
the fresh worktree first and falls back to your working tree, so it works while
that file is still untracked. `meta.json` records the SHA256 that was actually
used — check that arm `a` and arm `b` differ there before trusting a result.
