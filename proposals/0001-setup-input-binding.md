# 0001 — Setup input binding

**Status:** Proposed · **Date:** 2026-08-01

Let a downstream consumer render its own input controls inside a setup guide,
positioned next to the step that produces each value — without changing a byte
of the markdown, and without any consumer that doesn't want inputs having to
know the feature exists.

---

## The ask

The Speakeasy AI Control Plane renders these guides in a side panel while the
user configures a server. Today the guide says:

> **Copy the Client ID and Client Secret** {#copy-client-credentials}
>
> 1. Copy the **Client ID**.
> 2. Store the **Client ID** for [Speakeasy setup](speakeasy.md#connect-speakeasy-credentials).
> 3. Copy the **Client Secret**.
> 4. Store the **Client Secret** like a password for [Speakeasy setup](speakeasy.md#connect-speakeasy-credentials).

— `guides/box/external.md:69`

Steps 2 and 4 exist only because the reader has nowhere to put the value yet.
They are a workaround for a missing product affordance: the reader is holding a
secret in their clipboard, reading a panel, and the field that wants it is three
scroll-lengths away in another document. We want an input right there, so the
paste lands where the copy happened.

The same markdown is published on the marketing docs site
(`speakeasy.com/docs/ai-control-plane/guides/<slug>`), where inputs would be
meaningless. Nothing about this feature may degrade that surface, and the
marketing site must not have to opt out — it must simply be unaffected.

## The short version

**We are not adding a markdown construct. We are finishing a data model that is
already 80% built.**

`meta.yaml` already declares, per credential field, which anchored section of the
guide teaches the reader how to obtain it:

```yaml
fields:
  - id: client-id
    label: Client ID
    setup:
      - external.md#copy-client-credentials
```

That is a *placement binding* — field identity joined to a document location. It
is schema-pinned, lint-verified against the real markdown, and doctrinally
protected as invariant **I3** (the anchor contract). It is also silently
discarded before it reaches any consumer.

The proposal is: publish it, sharpen it, and extend it to the one input class it
doesn't yet cover (tenant/server URLs). Consumers that want inputs read the
binding and render their own controls. Consumers that don't, ignore a field they
never asked for. The markdown never changes.

---

## Why not new markdown syntax

We tested this empirically rather than assuming. Every candidate carrier was
rendered through CommonMark (`marked`, `commonmark.js`), `markdown-it` with
`html:false`, GitHub's sanitizer allowlist, Markdoc with the tag undefined, and
MDX v3 compile.

| Candidate | CommonMark/GFM | `html:false` | GitHub | Markdoc (undefined) | MDX |
|---|---|---|---|---|---|
| `::field{#client-id}` (remark-directive) | literal text | literal | literal | literal | parse error |
| `{% field id="client-id" /%}` (Markdoc tag) | literal text | literal | literal | dropped cleanly | parse error |
| `<!-- field: client-id -->` | invisible | **escaped, visible** | stripped | **escaped, visible** | parse error |
| `<gram-field name="client-id">` | invisible | **escaped, visible** | stripped | escaped, visible | compiles |
| Sidecar binding (this proposal) | **n/a — no markdown change** | n/a | n/a | n/a | n/a |

**There is no syntax that costs zero renderers.** Every in-band option breaks at
least one consumer we already have or plausibly will have. An out-of-band
binding costs none, because there is nothing in the file to break.

Two further findings from the same research:

- **Our markdown already doesn't compile as MDX.** Both `{#anchor}` and
  `<!-- screenshot: … -->` are hard MDX parse errors. Any future MDX-based
  consumer must preprocess our files today. Adding a *fifth* non-standard
  construct deepens a hole we're already in.
- **Nobody does inline writable inputs in portable markdown.** Surveying Stripe,
  Twilio, Auth0, AWS, Vercel/Supabase, and Backstage: everyone either substitutes
  *read-only* variables into prose, or keeps a JSON-Schema-driven form *beside*
  the prose and joins it by field ID. Backstage is the closest analogue and is
  squarely the second pattern. Our existing `meta.yaml` design is already that
  pattern — we just never shipped the join key.

The formal grounding for the approach is the [W3C Web Annotation Data
Model](https://www.w3.org/TR/annotation-vocab/), whose entire purpose is
attaching structured payloads to locations inside an immutable document. Its
`FragmentSelector` is exactly `external.md#copy-client-credentials`.

---

## Design

### Principle: the guide binds, the host renders

The guide answers one question — *where in this document does this value get
produced?* — and stops. It does not describe the input.

We do **not** model `type`, `required`, `sensitive`, `placeholder`, `pattern`,
validation, or submission. The host already owns all of it and owns it better:
the Control Plane knows a client secret is secret (`EnvironmentEntry.is_secret`,
`RemoteMcpServerHeader.is_secret`), knows which sheet the value belongs to, and
owns persistence and validation. A form schema in `meta.yaml` would be a second,
worse copy of that knowledge, permanently drifting from the real one.

This is also what makes the feature un-forced. A binding is inert data. A form
schema invites consumers to render forms.

The join is `(option.kind, option.client_registration, field.id)` → the host's
own field. The existing derived `speakeasy_setup` value (`manual-oauth`, `dcr`,
`headers`, `none`) already tells a host which surface it's configuring, so the
mapping a host needs is three rows:

| `speakeasy_setup` | `field.id` | Control Plane destination |
|---|---|---|
| `manual-oauth` | `client-id` | Attach Remote Identity Provider → **Client ID** |
| `manual-oauth` | `client-secret` | Attach Remote Identity Provider → **Client Secret** |
| `headers` | any | Upstream header value |

### The capture site is derived, not stored

`setup` is an *ordered narrative* list of the sections a reader passes through to
obtain the value. The **last** entry is where they actually hold it.

```yaml
setup:
  - external.md#create-oauth-client      # they make the client here
  - external.md#copy-client-credentials  # they hold the value here  ← capture site
```

All 46 `setup` entries in the corpus conform: the eight Google guides use the
two-element form above, every other guide uses a single entry that is already the
copy step. No new schema key is needed — this follows the schema's existing
derive-don't-store doctrine, the same rule that keeps `speakeasy_setup` out of
the file. It gets written down in the schema description and in
`doctrine/roles/technical-research.md`, and becomes a lint rule.

### Section granularity is exactly right — and that's a measurement, not a guess

An anchor names an H3 section. Sections run to the next H3. The corpus makes this
unusually clean: **every guide's anchors are H3-only, no guide contains a single
H2, and every H3 carries an anchor.**

The obvious worry is that a section is too coarse — that we'd want the input
beside step 4 rather than after the section. We checked. **In every guide in the
corpus, all fields captured in a section are captured together in that one
section.** Box, all eight Google guides, Snowflake, GitHub, HubSpot, Intercom,
Asana all produce Client ID and Client Secret in the same copy step; Salesforce
and X produce a single value in a single step. There is no guide where
step-granularity would place two inputs differently than section-granularity
does.

So the contract is: *this section captures these fields.* Where inside the
section the host draws them — after the last block, pinned to the heading,
floating — is the host's layout decision, which is where it belongs. If
step-granularity is ever genuinely needed, the escape hatch is additive and
well-trodden: a `quote` refinement on the ref (the Hypothesis re-anchoring
pattern). We should not build it now.

### What this looks like end to end

```
meta.yaml                     Go module                    Host
─────────                     ─────────                    ────
fields:                       CredentialField{             anchor → [fields]
  - id: client-id               ID: "client-id"            renders its own
    label: Client ID            Label: "Client ID"         <Input> after the
    setup:                      Setup: [...]               matching section
      - …#copy-client-credentials  }.Capture()
                                → external.md#copy-client-credentials
```

The marketing site does none of this and changes in no way.

---

## Changes

### Phase 1 — publish the binding (no guide edits, no schema change)

`credential_setup.options[].fields[]` is parsed by the generator and thrown away.
`go/internal/gen/main.go:41-46` declares `credentialOptionMeta` without a
`Fields` member, so yaml.v3 drops it silently. 16 of 18 guides declare fields;
none reach a consumer except as raw `Guide.Meta` YAML bytes.

Add to `go/guides.go`:

```go
// SetupFile is one of the two setup documents a SetupRef can point into.
type SetupFile string

const (
    SetupExternal  SetupFile = "external.md"
    SetupSpeakeasy SetupFile = "speakeasy.md"
)

// SetupRef points at an anchored section of a guide's setup markdown.
// The anchor is a kebab-case H3 heading id; the section runs to the next H3.
type SetupRef struct {
    File   SetupFile
    Anchor string
}

func (r SetupRef) String() string // "external.md#copy-client-credentials"

// CredentialField is one credential value the reader obtains during setup,
// bound to the guide sections that teach them how.
type CredentialField struct {
    ID    string // stable within the option: "client-id", "client-secret"
    Label string // the destination field's label in the Control Plane
    Setup []SetupRef // ordered narrative; the last ref is the capture site
}

// Capture is the section where the reader ends up holding the value — the
// natural place for a host to offer an input. It is the last Setup ref.
func (f CredentialField) Capture() SetupRef

// CapturesByAnchor groups the option's fields by the section that captures
// them. This is the map a renderer wants: walk the document, and at each
// anchored section, render inputs for the fields keyed to it.
func (o CredentialOption) CapturesByAnchor() map[SetupRef][]CredentialField
```

and `Fields []CredentialField` on `CredentialOption`.

`SetupRef` being parsed rather than a raw string is the whole DX difference
between "here is some YAML, good luck" and an API a consumer can hold. Splitting
on `#` is a thing every consumer would otherwise write, slightly differently.

Cost: purely additive, three files (`gen/main.go` structs, `gen/index.go`
emitter, `guides.go` type + `lookup()` copy), CI's drift check catches a
half-done edit. Index growth is negligible against 412 KiB used of a 5 MiB
budget. No existing consumer breaks.

### Phase 2 — fix `label`, pin the vocabulary

`label` means *the label of the destination field in the Control Plane*. Salesforce
proves the intent: `id: client-id`, `label: Client ID`, while the provider calls
it Consumer Key and the guide prose correctly says "Copy **Consumer Key**. You
will use it as the Speakeasy **Client ID**."

Ten guides drift from this — six naming the field the way the *provider* does,
three differing only in casing, one carrying UI chrome:

| Guides | Current `label` | Should be |
|---|---|---|
| google-big-query, google-calendar, google-compute-engine, google-drive, google-people, google-sheets | `OAuth client ID` / `OAuth client secret` | `Client ID` / `Client Secret` |
| asana, github, hubspot | `Client secret` | `Client Secret` |
| intercom | `Client Secret (optional)` | `Client Secret` |

Seven distinct labels currently express three fields. Normalizing costs 16 line
edits and makes `label` mean one thing. The `(optional)` suffix in particular is
chrome from one version of one sheet — it does not belong in a published data
model.

Field `id` is already consistent (`client-id` ×15, `client-secret` ×14,
`bearer-token` ×1) but nothing enforces it, and the moment a guide invents
`consumer-key` or `oauth-client-id`, every host's mapping table silently misses.
Document the vocabulary in the schema description and add a lint **nit** (not a
blocker) for ids outside it — new providers will legitimately need new ids, and a
nit surfaces the decision without blocking the guide.

### Phase 3 — tenant and server URL inputs

This is the real modelling gap, and the one the request named directly.
`credential_setup` covers credentials only. Reader-supplied *URL* values are
either unmodeled or modeled as a placeholder string:

```yaml
# guides/snowflake/meta.yaml:36
url: "https://<account_url>/api/v2/databases/<mcp_database>/schemas/<mcp_schema>/mcp-servers/<mcp_server_name>"
tenanted: true
```

Four values the reader must supply, zero of them structured — their labels and
their capture sections exist only as prose. Intercom is the same story in a
different shape: two remotes (`us`, `eu`) both `tenanted: true`, where the reader
is choosing rather than typing.

Add `url_fields` to a remote, shaped exactly like `credential_field` so there is
one binding concept rather than two:

```yaml
remotes:
  - id: cortex-agent-mcp
    url: "https://<account_url>/api/v2/databases/<mcp_database>/…"
    tenanted: true
    url_fields:
      - id: account-url          # ⇒ substitutes <account_url>
        label: Account URL
        setup:
          - external.md#create-cortex-agent-mcp-server
      - id: mcp-database         # ⇒ substitutes <mcp_database>
        label: Database
        setup:
          - external.md#create-cortex-agent-mcp-server
```

The placeholder token is **derived from the id**, not stored: `account-url` ⇒
`<account_url>`. That gives a lint rule with teeth — every `<token>` in a
tenanted remote's URL must have exactly one `url_fields` entry and vice versa, so
a URL template and its inputs cannot drift apart. Go gets `Remote.URLFields
[]URLField` with `Token()` and `Capture()`.

The choose-a-region case (Intercom) needs nothing new: hosts already have
`Remotes` and pick among them.

Phase 3 is the only phase that edits guides, and it touches two
(`snowflake`, and `intercom` only if we decide region deserves a label).

### Phase 4 — make the anchor contract a merge gate

`lintGuide` validates that every `setup` ref resolves to a real anchor in the
right file (`pipeline/src/lint-guide.ts:417-480`). It runs in the drafting loop
and from the CLI — **but not in CI on `guides/**` changes**. `pipeline-ci.yml` is
path-filtered to `pipeline/**`, and the workflow that does watch `guides/**` only
runs the Go generator and a size budget.

Today a broken anchor is a docs nit. After this proposal it is a product surface
that fails to render an input. Wire `mise run lint-guide` into
`go-module-guide-validate.yml`. This is a handful of YAML lines and it is the
change that makes the whole design safe to depend on.

Add three lint rules while we're there: capture-ref ordering, the
`url_fields` ↔ URL-token bijection, and the field-id vocabulary nit.

---

## What the host implements

Sketching the Control Plane side to show the cost is small; the specifics belong
to that team.

Its markdown pipeline is `react-markdown` + `remark-gfm` with a custom remark
plugin that already lifts `{#custom-id}` into real heading ids, namespaced per
guide (`setupGuideMarkdown.ts`). That plugin is already walking the mdast and
already resolving anchors — it is the natural and only place this lands. Given
`CapturesByAnchor()`, injecting a node after the section for a matching anchor is
a small addition to a transform that exists.

Server-side, `server/internal/externalmcp/setupdocs.go` maps the Go module onto
the `MCPSetupGuide` wire type returned by `mcpRegistries.getSetupDocs`. That type
carries `external_markdown` and `speakeasy_markdown` but no fields, so Phase 1
also means adding a `credential_options[].fields[]` member to it.

Two host-side choices we should *not* dictate:

- **Suppressing the redundant paste steps.** Once a value is captured inline,
  `speakeasy.md`'s "Paste the **Client ID** into **Client ID**" is noise *in that
  host*. A host that knows it captured a field can collapse the step. On the
  marketing site the same step is exactly right. This is why it stays a host
  decision.
- **Echoing at the consume site.** `external.md` capture sections produce values;
  `speakeasy.md#connect-speakeasy-credentials` consumes them. A host might show a
  read-only chip at the consume site confirming the value is set.

---

## Impact on doctrine

- **I3 (the anchor contract) — strengthened.** Anchors stop being an internal
  cross-reference convention and become a published contract with a product
  surface bound to it. Phase 4 gives it CI enforcement it currently lacks.
- **I4 (the setup grammar) — untouched.** No new construct enters the markdown.
  `{{ gram.oauth.callback_url }}` remains the only template key. This is the
  invariant that rules out every in-band syntax, and it is the right rule.
- **I1/I2 (facts flow one way, provenance) — unaffected.** `url_fields` adds
  labels for values the Dossier already records; they enter through Technical
  Research like every other fact.
- `doctrine/roles/technical-research.md` gains the capture-ordering rule and the
  `url_fields` obligation for tenanted remotes. `doctrine/roles/writer.md` gains
  nothing — the Writer's job does not change.

Once inputs exist, the "Store the **Client ID** for Speakeasy setup" instruction
becomes wrong in one host and right in another. **Leave the prose as it is.** It
is correct standing alone, which is the property that makes the guide portable,
and it is what a host suppressing the step relies on. Prose is the fallback; the
input is the enhancement.

---

## Risks

**A guide edit silently unbinds an input.** An anchor rename that updates
`meta.yaml` in step is fine; one that doesn't is caught by the existing lint —
*if* the lint runs. This is Phase 4's entire justification, and it is why Phase 4
is not optional.

**Section granularity proves too coarse.** Measured against the whole corpus it
isn't, today. If a future guide splits credential capture across two steps, the
refinement is additive and doesn't invalidate anything shipped.

**The host mapping table drifts as guides multiply.** Three rows today. The
field-id vocabulary nit is the early-warning signal; if the table ever exceeds
what a person can hold, that is the point to reconsider — not now.

**Version skew.** A host pinned to an older module sees no fields and renders no
inputs, which is the correct degraded behaviour, not a break. Note that the Go
module patch-bumps automatically on every merge, so a genuinely breaking change
would ship silently — another reason everything here is strictly additive.

## Adjacent defect worth fixing

The research surfaced a live inconsistency in the *outbound* direction of this
same idea. The marketing site substitutes `{{ gram.oauth.callback_url }}` with
the real callback URL; the Control Plane does not handle the key at all and would
render literal braces in the panel. It is currently latent — no `external.md` or
`speakeasy.md` in the corpus uses the key, only `research.md` files and doctrine
do — but doctrine actively instructs Writers to paste it into provider redirect
fields, so the first guide that does will diverge between the two consumers.

Separate fix, but the same shape of problem: a value the host must supply into
the doc, versus a value the reader supplies out of it. Worth resolving alongside,
since this proposal formalizes the inbound half.

---

## Open questions

1. **Phase 3 scope.** Snowflake is the only guide needing `url_fields` today.
   Ship it now for a corpus of one, or land Phases 1–2 and add it when the second
   tenanted-template guide arrives? Building it now means the Control Plane
   implements one binding concept instead of two, six months apart.
2. **Does Intercom's region want a label?** Choosing between `us` and `eu`
   remotes needs no new data, but a host rendering a radio has no human-readable
   name for either. A `label` on `Remote` would be one field and one edit.
3. **Is `label` even load-bearing** if the host owns its own labels? It costs
   nothing to keep and serves consumers building generic inputs, but if the
   Control Plane will always use its own strings, we should say so rather than
   maintain a field nobody reads.
