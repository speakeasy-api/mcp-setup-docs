# Speakeasy setup — canonical file

The single source for every Guide's `speakeasy.md`: the steps a reader
follows in the Speakeasy AI Control Plane after finishing External setup
(`external.md`). This file is doctrine — maintained by a human, read-only
to pipeline agents (constitution I7), changed only per invariant I8.
Technical Research transcludes the skeleton below into each guide's
Research Dossier and records the per-guide values it renders with; the
Writer renders `speakeasy.md` from the Dossier like any other facts.
Consumers may omit this file when Speakeasy setup is already in context
(for example an installed MCP server's detail page showing only
`external.md`).

UI facts below are drawn from the product source
(`speakeasy-api/gram`, `client/dashboard`, branch `main`), commit
`8fa18729608e34de305e789b53f36eb2c6c853c9` (observed 2026-09-17).
Navigation and creation: `pages/mcp/MCP.tsx`, `pages/mcp/add/AddMcpServer.tsx`,
`pages/sources/remote-mcp/CreateRemoteMcp.tsx`, and `pages/catalog/`.
Authentication: `pages/mcp/x/tabs/settings/sections/authentication/`.
Labels are code-level strings; a rendered-UI spot check is still worthwhile.
Controls depend on configuration state and write permission. No role may
invent a label this file does not carry.

## Per-guide values (recorded in the Dossier's Speakeasy setup section)

- `<remote URL>` — from `meta.yaml` `remotes`. The Control Plane
  proxies remote servers over streamable-http. Mark each remote
  `tenanted: true` when the reader must paste a region, instance, or
  org-specific URL rather than a single shared public endpoint. When the
  URL is shared but the guide must still skip the catalog (unreliable
  mapping, multi-endpoint selection), set guide-level
  `speakeasy_add_server: custom-remote` instead of mislabeling remotes
  as tenanted.
- Optional `speakeasy_add_server`: `auto` (default), `catalog`, or
  `custom-remote`.
- The Authentication Option the guide documents, which External-setup
  step produced each credential field, and — for OAuth options — any
  scopes the provider requires. For every OAuth option, record the
  **Issuer URL**, discovery support, and documented authorization/token
  endpoints when discovery is unavailable; DCR also needs a registration
  endpoint. Do not assume the remote MCP URL is the OAuth issuer. Missing
  provider-specific issuer/endpoint evidence is an open question, not a
  value the Writer may invent.
- `<further-reading URL>` — the provider's primary MCP documentation
  page, for the closing pointer.

## Add-server path selection

There are two add-server paths. Pick **exactly one** when the path is
resolved; keep both only when Pulse presence is unresolved **and** no
override applies.

1. **Tenanted** — any `remotes[].tenanted: true` → **Custom remote only**
   (treat as non-registry), even if Pulse lists the provider.
2. Else **`speakeasy_add_server`**:
   - `custom-remote` → Custom remote only
   - `catalog` → catalog only
   - `auto` / omitted → Pulse catalog presence in operator notes:
     - **present** → catalog (**From the catalog**) only
     - **absent** → Custom remote only
     - **ambiguous** / **skipped** / no lookup → both bullets + soft
       catalog-presence open question

Do not keep the alternate path or a catalog-presence open question when
the path is resolved (tenanted, `speakeasy_add_server` override, present,
or absent).

## The skeleton (anchors are fixed; carry them verbatim)

Both bullets below are **source material**. Research emits only the
matching imperative path (or both when unresolved). Writer renders what
the Dossier chose — not the conditional "If … is in the catalog" framing
when presence is known.

### Add the server in Speakeasy {#add-server-in-speakeasy}

In the Speakeasy AI Control Plane sidebar, under **MCP Gateway**, select
**MCP**, then click **Add new** to open **Add MCP server**.

**Catalog path** (Pulse **present** with `auto`, or
`speakeasy_add_server: catalog`; never when tenanted or
`custom-remote`): choose **From the catalog**. On the **MCP Catalog**
page, find <Provider> using **Search MCP servers...**, open its catalog
entry, and click **Add**. In the **Add to Project** dialog, click
**Add to Project**. Wait for installation to complete, then click
**Configure MCP settings** to open the created server.

**Custom remote path** (tenanted, `speakeasy_add_server: custom-remote`,
or Pulse **absent**): choose **Hosted remotely**. On **New remote MCP
server**, paste `<remote URL>` into **MCP server URL**. Optionally enter
**Display name (optional)**. Click **Verify connectivity**, then, after
verification succeeds, click **Save**. This creates the hosted MCP server
and opens its **Overview** page.

**Dual conditional** (Pulse **ambiguous** / **skipped** only, `auto`,
and not tenanted / not forced) — keep both as bullets:

- If <Provider> is in the catalog: choose **From the catalog**. Find
  <Provider> using **Search MCP servers...**, open its catalog entry,
  and click **Add**. In **Add to Project**, click **Add to Project**.
  After installation, click **Configure MCP settings**.
- If it is not: choose **Hosted remotely**. On **New remote MCP server**,
  paste `<remote URL>` into **MCP server URL**. Click **Verify
  connectivity**, then **Save** after verification succeeds. This opens
  the server's **Overview** page.

Do not describe catalog installation as automatically opening Overview.

<!-- screenshot: Add MCP server choices, or the provider's catalog entry -->

### Connect your credentials {#connect-speakeasy-credentials}

Open the server's **Settings**. The Writer renders only the variant
matching the guide's Authentication Option, names the guide's actual
fields, and cross-links each value to the External-setup step that
produced it. Include provider-specific issuer and endpoint values from
the Dossier where needed, rather than making readers guess.

For OAuth, under **Authentication**:

- If authentication is not configured, choose **Use Discovered** when
  available; otherwise choose **Configure Manually**.
- If authentication is already configured, find **Connected services**.
  If no provider is attached, click **Add provider**. If the intended
  provider is already attached, review its existing configuration instead
  of attaching it again. Adding another provider is not available for
  every server type. Changes require write permission.

In **Attach Remote Identity Provider**, choose **Select existing** to
reuse the intended project provider, or **Add new** to configure one.
The selector appears when existing providers are available; otherwise
the new-provider form is shown directly. For a new provider, enter the
provider's **Issuer URL** when not already populated, retain the derived
**Slug**, and optionally set **Display name (optional)**. A discovered
issuer starts endpoint discovery automatically. Verify the populated
endpoints; if entering or changing the issuer manually, click **Discover**
under **Endpoints** when available. If discovery is unavailable, use the
documented authorization and token endpoints (and registration endpoint
for DCR).

Under **Session Client**, reuse the intended existing client with
**Select existing**, or choose **Add new** when that selector is shown.
Reusing a client uses its stored credentials, scopes, and audience; do
not instruct readers to re-enter new-client fields in this branch.
Confirm its read-only configuration matches the guide. If it does not,
choose **Add new** rather than implying the attach sheet can edit a reused
client. For a pre-registered client, check the provider's registered
callback against `{{ gram.oauth.callback_url }}` before attachment;
**Redirect URI** is not displayed when selecting an existing client. Then click **Attach Identity Provider**. The
following credential variants apply to a **new** session client:

- OAuth with a pre-registered client: set **Client Type** to **Manual**.
  Paste the **Client ID** and **Client Secret (optional)** from External
  setup, and any provider-required overrides. **Scope (override)** takes
  comma-separated scopes. The label does not make a
  secret optional when the provider requires it. Before clicking
  **Attach Identity Provider**, confirm the displayed **Redirect URI**
  matches the callback URL registered during External setup
  (`{{ gram.oauth.callback_url }}`). Readers receive the rendered callback
  URL, not the literal template key. Successful attachment closes the
  sheet, so do not put this check after attachment.
- OAuth with Dynamic Client Registration (DCR): verify the registration
  endpoint is populated, then set **Client Type** to **Dynamic Client
  Registration (DCR)**. Keep **Token Endpoint Auth Method** at the
  discovered default unless the Dossier records a required override.
  Leave **Scope (override)** and **Audience (optional)** empty unless
  the Dossier records values to enter. Click **Attach Identity Provider**.
  The Control Plane registers the OAuth client at the provider's
  registration endpoint — there is no **Client ID** or **Client Secret**
  to paste, and readers do not register `{{ gram.oauth.callback_url }}`
  on the provider for this path. When a client first needs provider
  access, complete the provider's browser authorization prompts with the
  intended account (exact prompt labels are provider-specific).

For an API key / token, under **Upstream Headers**, click **Add header**,
enter the **Header name** (for example `Authorization`), leave **Value
source** as **Static value**, paste the value from External setup, check
**Secret**, and click **Save**. Catalog installs may collect these headers
earlier in **Add to Project** under **Upstream headers**; do not add them
a second time.

<!-- screenshot: Attach Remote Identity Provider with new/existing selection and Manual or discovered DCR fields, or Upstream Headers; values redacted -->

## The closing pointer

The guide's final line — plain prose after the last Speakeasy step in
`speakeasy.md`:

> This guide covers setup only. For anything beyond it — billing, tool
> behavior, limits — see [<Provider>'s MCP documentation](<further-reading URL>).

Rendered as a normal sentence, not a blockquote; the quote above is
template text.

## Out of scope (operator note)

The server's Settings also carry the hosted **Server URL**, publishing,
and plugin surfaces (the dashboard's readiness checklist runs Server URL
→ Authentication → Source → Included in Plugin). Guides stop after
credentials; extend this file deliberately if distribution steps should
ever join guide scope.
