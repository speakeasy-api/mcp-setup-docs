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
`68b3f78ffec0ab6072ece4b7cc2ee3868c6a7c06` (observed 2026-09-30).
Navigation and creation: `pages/mcp/MCP.tsx`, `pages/mcp/add/AddMcpServer.tsx`,
`pages/sources/remote-mcp/CreateRemoteMcp.tsx`,
`pages/catalog/AddServerDialog.tsx`, and
`pages/mcp/x/tabs/settings/sections/authentication/CreationIdentityChoice.tsx`.
Identity: `pages/mcp/x/tabs/settings/sections/authentication/RemoteMcpIdentitySection.tsx`
and `lib/remote-identity/` (`IdentityModeCards.tsx`, `ProviderRow.tsx`,
`CredentialFields.tsx`, `drafts/useIdentityDraft.ts`). Custom providers:
`pages/remote-identity-providers/`. Server availability:
`pages/mcp/x/tabs/settings/sections/DangerZoneSection.tsx`.
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
  step produced each credential field, and — for OAuth options — the
  scopes the provider app is configured for. Map the option to an
  identity mode: OAuth → **User Identity**; one shared API key or token
  → **Service Account**; no upstream credential → **No Identity**.
- For every OAuth option, record: the probe outcome of the remote URL
  (401 with a `resource_metadata` challenge, 401 without one, or 200
  unauthenticated); the issuer the protected-resource metadata (PRM)
  names; whether that issuer advertises CIMD
  (`client_id_metadata_document_supported`) or a `registration_endpoint`,
  and whether anonymous registration actually succeeds; and, when
  discovery is unavailable, the documented **Issuer URL**, authorization,
  and token endpoints. Do not assume the remote MCP URL is the OAuth
  issuer. Missing provider-specific issuer/endpoint evidence is an open
  question, not a value the Writer may invent.
- The registration choice that works: **Auto-Configure** (and **CIMD**
  or **DCR** when both are offered) or **Manual**. Record Manual whenever
  automatic registration is advertised but fails, because the dashboard
  defaults to **Auto-Configure** whenever it is advertised.
- For **Manual**, the exact scope string to enter under **Advanced >
  Scope**, space-separated on one line. A blank **Scope** requests every
  scope the PRM advertises, which is often broader than the provider app
  allows; record the PRM scope list so the Writer can say whether blank
  is safe.
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

Both path bullets below are **source material**. Research emits only the
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
entry, and click **Add**. The **Add to Project** dialog shows **Server
name**, any **Upstream headers** the catalog entry declares, and an
**Identity** choice of **User Identity**, **Service Account**, or **No
Identity**. It preselects **User Identity** only when the catalog entry
supports OAuth client registration; otherwise it preselects **No
Identity**. Select the identity mode the Dossier records (see below),
then click **Add to Project**. When the dialog offers a **Guardrails**
step, finish it or click **Skip for now** (guardrails are out of guide
scope). After **Server added successfully**, click **Configure MCP
settings** to open the created server. When identity still needs setup,
there is no success banner: the server's result reads "Added, but
disabled until identity is set up." and **Finish setup** opens its
**Settings**.

**Custom remote path** (tenanted, `speakeasy_add_server: custom-remote`,
or Pulse **absent**): choose **Hosted remotely**. On **New remote MCP
server**, paste `<remote URL>` into **MCP server URL**. Optionally enter
**Display name (optional)**. Leave **User session issuer** at its
default. Click **Verify connectivity**. After verification succeeds, the
page shows the **Identity** choice. It preselects **User Identity** only
when the server answered with a 401 that names its PRM; otherwise it
preselects **No Identity**. Select the identity mode the Dossier records,
leave **Guardrails** off unless the reader wants one, then click
**Save**. This creates the server and opens its **Overview** page.

**Dual conditional** (Pulse **ambiguous** / **skipped** only, `auto`,
and not tenanted / not forced) — keep both as bullets, each with the
identity selection above:

- If <Provider> is in the catalog: choose **From the catalog**. Find
  <Provider> using **Search MCP servers...**, open its catalog entry,
  and click **Add**. In **Add to Project**, select the identity mode,
  then click **Add to Project**. After installation, click **Configure
  MCP settings**.
- If it is not: choose **Hosted remotely**. On **New remote MCP server**,
  paste `<remote URL>` into **MCP server URL**. Click **Verify
  connectivity**, select the identity mode, then click **Save**. This
  opens the server's **Overview** page.

Do not describe catalog installation as automatically opening Overview.

Identity at creation, by Authentication Option:

- **User Identity** (OAuth): Speakeasy tries to configure the identity
  provider and register a client automatically when it saves. When that
  works, the server is ready and no credential step remains. When it
  cannot (no discoverable metadata, or the provider needs a client
  registered by hand), the server is kept **Disabled** and the result
  says to finish setup in **Settings > Identity**. Guides whose Dossier
  records **Manual** must say this is expected.
- **Service Account** (API key / token): the **Identity** choice shows a
  credential format (**Bearer**, **Basic**, or **Manual**). Choose the
  format the provider needs and paste the value from External setup into
  **Token** (Bearer), **Username** and **Password** (Basic), or **Header
  value** (Manual). Speakeasy sends it as the `Authorization` header.
- **No Identity**: nothing further. When the server answered with an
  authentication challenge, the dashboard warns that requests may fail;
  do not tell readers to ignore that warning.

<!-- screenshot: Add MCP server choices, or the provider's catalog entry with the Identity choice -->

### Connect your credentials {#connect-speakeasy-credentials}

Open the server's **Settings** and find the **Identity** section. The
Writer renders only the variant matching the guide's Authentication
Option, names the guide's actual fields, and cross-links each value to
the External-setup step that produced it. When creation already
configured the identity (Auto-Configure succeeded, or a Service Account
credential was entered), say so and keep only the confirmation and
**Server Availability** steps. Changes require write permission and are
committed with the section's **Save** button.

For OAuth, select **User Identity**. The provider picker (**Choose an
identity provider**) preselects the provider the server's PRM names; a
provider that does not exist yet is badged **Will be created** and is
created from the upstream's metadata on save. Confirm the preselected
provider matches the Dossier's issuer, or open the picker (**Search
identity providers…**) and choose it. When a provider already exists on
the same host but is the wrong issuer, say which one to pick.

When discovery is unavailable (the Dossier records no PRM or wrong
metadata), the picker cannot create the provider. Render this route
instead: open the picker, click **Create a custom identity provider**,
which opens **Remote Identity Providers**; click **New Remote Identity
Provider**; enter the Dossier's **Issuer URL** and, under **Endpoints**,
**Authorization Endpoint** and **Token Endpoint** (click **Discover**
first when the issuer publishes metadata); keep the derived **Slug**;
click **Create**. Then use the provider's **Add Client** to create the
client (**Client Type** **Manual**, **Client ID**, **Client Secret
(optional)**, and **Scope (override)**, comma-separated), confirm the
displayed **Redirect URI** matches `{{ gram.oauth.callback_url }}`, and
click **Create**. Return to the server's **Settings > Identity**, select
that provider, choose **Existing client**, and pick the client under
**Client**.

Under the provider, choose how the server gets a client. The dashboard
preselects **Existing client** when the provider already has one,
otherwise **Auto-Configure** when the provider advertises CIMD or DCR,
otherwise **Manual**. Render the Dossier's choice explicitly, and name
the switch when it differs from the default:

- **Existing client**: pick it under **Client**. Reusing a client uses
  its stored credentials and scopes; do not tell readers to re-enter
  them. Choose it only when the Dossier says an existing client matches.
- **Auto-Configure**: Speakeasy registers a new client when you save.
  When both are supported, **Advanced > Registration method** offers
  **CIMD** (default) and **DCR**; name a method only when the Dossier
  records that one fails. There is no **Client ID** or secret to paste,
  and readers do not register `{{ gram.oauth.callback_url }}` on the
  provider for this path.
- **Manual**: paste the **Client ID** and **Client secret** from External
  setup. The secret field's "Optional" placeholder does not make a secret
  optional when the provider requires it. Under **Advanced > Scope**,
  enter the Dossier's scopes space-separated on one line, and tell
  readers not to leave it blank when the PRM advertises more than the
  provider app grants. The token endpoint auth method is chosen
  automatically from the issuer's metadata; there is no control for it.
  This surface does not display the redirect URI, so the External-setup
  step that registers `{{ gram.oauth.callback_url }}` carries that check.

Click **Save**. Replacing a client or switching mode asks for
confirmation (**Save changes**). When a person first uses the server,
the provider's browser authorization prompt appears; exact prompt labels
are provider-specific.

For an API key / token on an existing server, select **Service Account**,
fill **Service Account credential** as described under creation above,
and click **Save**. Do not add the key under **Custom Headers**; that
area is for other upstream headers.

When creation left the server **Disabled**, finish with **Settings >
Danger Zone > Server Availability**: turn on the switch (**Enable MCP
server**) so it shows **Enabled**.

<!-- screenshot: Settings > Identity with User Identity selected, the provider picker, and the registration choice; values redacted -->

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
