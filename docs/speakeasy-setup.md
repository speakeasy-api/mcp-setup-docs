# Speakeasy setup — canonical section

The single source for every Setup Guide's `## Speakeasy setup` section:
the steps a reader follows in the Speakeasy AI Control Plane after
finishing the provider-side setup. This file is doctrine — maintained by
a human, read-only to pipeline agents (constitution I7), changed only per
invariant I8. Technical Research transcludes the skeleton below into each
guide's Research Dossier and records the per-guide values it renders
with; the Writer renders the section from the Dossier like any other
facts.

UI facts below are drawn from the product source
(`speakeasy-api/gram`, `client/dashboard`, branch `main`, commit
`96f7f73`, observed 2026-07-23). Labels are verbatim code-level strings;
a rendered-UI spot check on first use is still worthwhile. No role may
invent a label this file does not carry.

## Per-guide values (recorded in the Dossier's Speakeasy setup section)

- `<remote URL>` — from `meta.yaml` `remotes`. (The Control Plane
  proxies remote servers over streamable-http; the add form's
  **Transport** field is read-only.)
- The Authentication Option the guide documents, which Provider-setup
  step produced each credential field, and — for OAuth options — any
  scopes the provider requires.
- `<further-reading URL>` — the provider's primary MCP documentation
  page, for the closing pointer.

## The skeleton (anchors are fixed; carry them verbatim)

### Add the server in Speakeasy {#add-server-in-speakeasy}

In the Speakeasy AI Control Plane sidebar, under **Connect**, select
**Sources**, then click **Add Source**.

- If <Provider> is in the catalog: choose **3rd-party server**. On the
  **MCP Catalog** page, find <Provider> (the search box reads
  **Search MCP servers...**), open its entry with **View**, and click
  **Add**. In the **Add to Project** dialog, click **Add to Project**.
- If it is not: choose **Custom remote server**. On the
  **Add a custom remote MCP server** page, paste `<remote URL>` into
  **Remote MCP server URL** and click **Add server**.

Either path creates the hosted MCP server and opens its **Overview**
page.
<!-- screenshot: the Add Source menu open on the Sources page, or the provider's catalog entry -->

### Connect your credentials {#connect-speakeasy-credentials}

From the server's **Overview**, open **Settings**. The Writer renders
only the variant matching the guide's Authentication Option, names the
guide's actual fields, and cross-links each value to the Provider-setup
step that produced it.

- OAuth with a pre-registered client: under **Authentication**, click
  **Configure Manually** (or **Use Discovered** when offered — the
  Dossier records whether the provider publishes discoverable OAuth
  metadata). In the **Attach Remote Identity Provider** sheet, set
  **Client Type** to **Manual**. The sheet shows the **Redirect URI**
  with a copy button — the callback URL the guide had the reader
  register in Provider setup (`{{ gram.oauth.callback_url }}`).
  <!-- verify(operator): the template key substitutes this same Redirect URI value -->
  Paste the **Client ID** and **Client Secret (optional)** from
  Provider setup, then click **Attach Identity Provider**.
- API key / token: under **Upstream Headers**, click **Add header**,
  enter the **Header name** (for example `Authorization`), leave
  **Value source** as **Static value**, paste the value from Provider
  setup, check **Secret**, and click **Save**. (Catalog installs may
  collect the same headers earlier, in the **Add to Project** dialog's
  **Upstream headers** section.)
<!-- screenshot: the Attach Remote Identity Provider sheet showing the Redirect URI and credential fields, or the Upstream Headers editor, values redacted -->

## The closing pointer

The guide's final line — plain prose after the last Speakeasy step:

> This guide covers setup only. For anything beyond it — billing, tool
> behavior, limits — see <Provider>'s MCP documentation at
> <further-reading URL>.

Rendered as a normal sentence, not a blockquote; the quote above is
template text.

## Out of scope (operator note)

The server's Settings also carry the hosted **Server URL**, publishing,
and plugin surfaces (the dashboard's readiness checklist runs Server URL
→ Authentication → Source → Included in Plugin). Guides stop after
credentials; extend this file deliberately if distribution steps should
ever join guide scope.
