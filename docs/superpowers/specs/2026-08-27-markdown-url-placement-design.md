# Markdown URL Placement Validator Design

> Superseded for implementation by the Go port design in
> `docs/superpowers/specs/2026-08-27-markdown-url-placement-go-port-design.md`.
> The policy and regression rationale remain historical context; the final
> authoritative checker is Go.

## Purpose

Make URL formatting in published setup guides deterministic and agent-checkable. Every rendered HTTP or HTTPS URL must be presented according to reader intent: as a Markdown link when the reader should open it, or in a fenced code block when the reader should copy it.

## Scope

Extend the existing `pipeline` `lint-guide` command. Check only `external.md` and `speakeasy.md` in each guide directory. Exclude `research.md`, doctrine, repository documentation, metadata, and generated Go copies.

## Rule

Outside fenced code blocks, every `http://` or `https://` URL must be a Markdown link destination, autolink, reference-link destination, or image destination. Bare prose URLs and URLs in inline code spans are blocker findings. URLs inside fenced code blocks are valid regardless of language tag or surrounding code.

The finding uses the stable rule identifier `url-placement`, identifies the target and source location, includes the offending URL, and advises: URLs should either be Markdown links or appear in fenced code blocks. Use a link when the reader should open the URL; use a fenced code block when the reader should copy it.

No suppression mechanism is included initially. A narrow, reason-bearing local suppression may be designed later if a legitimate exception appears.

## Parsing approach

Parse Markdown with CommonMark's structural event stream rather than approximating Markdown with line-oriented regular expressions. Classify source ranges using micromark events so valid link, image, reference-definition, autolink, and fenced-code destinations are distinguished from rendered labels, titles, inline code, indented code, raw HTML, and prose. Preserve parser source offsets to produce actionable line and column findings.

Use Node 24, TypeScript 7, `tsx`, the Node test runner, and `micromark` 4.x in `pipeline`. Standardize the pipeline's engine declaration, local mise runtime, GitHub Actions jobs, README requirement, and Node type definitions on Node 24; upgrade the compiler to TypeScript 7.0.2 or newer within major version 7. Keep URL policy in a small independently tested module and integrate its findings into `lintGuide`.

## CLI behavior

Retain existing `lint-guide` behavior: exit 0 when clean, exit 1 for findings, exit 2 for usage errors, accept one or more guide slugs or paths, and support human-readable and JSON output. Add an optional rule identifier to the finding shape so the new finding is machine-addressable without forcing an unrelated migration of existing rules.

## Doctrine

Update `doctrine/personas/it-admin.md` and `doctrine/roles/writer.md` to remove the length threshold. State that opened URLs are links, copied URLs each occupy their own fenced code block, and URLs are never bare prose or inline code. Multiple separately copied URLs require separate fenced blocks.

## Verification

Focused tests cover Markdown links, images, autolinks, reference links, fenced blocks with and without language tags, inline-code URLs, bare URLs, multiple URLs, query strings, fragments, parentheses, both published targets, and exclusion of `research.md`. Run the focused tests, TypeScript typecheck, and the linter against representative guides on Node 24.
