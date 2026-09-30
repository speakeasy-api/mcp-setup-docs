---
research_version: 1
slug: x-docs
researched_at: 2026-07-29T20:05:42Z
---

# X Docs — Research Dossier

## Server facts

- **Remote URL:** `https://docs.x.com/mcp`.
- **Purpose:** X's hosted Docs MCP Server searches and reads public X API
  documentation. It is separate from the X API MCP Server at
  `https://api.x.com/mcp`.
- **Transport:** Streamable HTTP. A direct, unauthenticated MCP `initialize`
  request returned HTTP 200 as `text/event-stream`, negotiated protocol
  version `2025-06-18`, and identified the server as `X` version `1.0.0`.
- **Authentication Option:** open. X's published configuration contains only
  the remote URL, and direct initialization succeeded without credentials.
  No X account, developer app, API access, token, OAuth client, or callback
  URL is required.
- **Plan or licensing gate:** none documented for this public documentation
  server.

## Credential flow

There is no credential flow. The Speakeasy AI Control Plane needs no
provider-created value, and `{{ gram.oauth.callback_url }}` is not used.

## Console walkthrough

X requires no account enrollment, developer-console navigation, or credential
creation for this MCP Server. External setup consists of confirming the
documented fixed URL before proceeding to the Speakeasy AI Control Plane.

### Confirm the X Docs server {#confirm-x-docs-server}

- Use the fixed remote URL `https://docs.x.com/mcp`. Do not substitute
  `https://api.x.com/mcp`; X documents that as a separate MCP Server for
  calling the X API.
- Values entered or copied during External setup: none.
- Transition: proceed directly to adding **X Docs** from the Speakeasy MCP
  Catalog.
- Screenshot exception: there is no provider console or meaningful visual
  state for this public-URL confirmation.

## Speakeasy setup

Per-guide values rendered into the canonical
`doctrine/speakeasy-setup.md` skeleton (gram `main` `68b3f78`):

- Provider and catalog title: X Docs.
- Remote URL: `https://docs.x.com/mcp` (shared public endpoint; not tenanted).
- Add-server path: `speakeasy_add_server: catalog`. The Speakeasy MCP Catalog
  search on 2026-09-30 returned `com.pulsemcp.mirror/x-docs`, title `X Docs`.
  Render only the catalog path.
- Authentication Option: open → identity mode **No Identity**. No
  External-setup step produces a credential, and no **Upstream headers** are
  added.
- Probe outcome (2026-09-30): `POST https://docs.x.com/mcp` `initialize`
  without credentials → 200 `text/event-stream`, protocol `2025-06-18`,
  server `X` `1.0.0`. `https://docs.x.com/.well-known/oauth-protected-resource/mcp`
  returns 404, so there is no PRM, issuer, or registration to record.
- Registration choice and scope string: not applicable.
- Identity default at creation: the catalog dialog preselects **No
  Identity** because the entry does not support OAuth client registration.
  The Guide tells readers to keep it. No authentication-challenge warning
  applies because the server answers 200 unauthenticated.
- Server Availability: not rendered; **No Identity** creation does not leave
  the server **Disabled**.
- Further-reading URL: `https://docs.x.com/tools/mcp`.

### Add the server in Speakeasy {#add-server-in-speakeasy}

In the Speakeasy AI Control Plane sidebar, under **MCP Gateway**, select
**MCP**, then click **Add new** to open **Add MCP server**. Choose **From the
catalog**. On the **MCP Catalog** page, enter `X Docs` in **Search MCP
servers...**, open the **X Docs** entry, and click **Add**. In the **Add to
Project** dialog, keep **Identity** set to **No Identity**, add no
**Upstream headers**, and click **Add to Project**. When the dialog offers a
**Guardrails** step, finish it or click **Skip for now**. After **Server
added successfully**, click **Configure MCP settings** to open the server.

Screenshot note: the X Docs **Add to Project** dialog with **No Identity**
selected; no credential values need redaction.

### Connect your credentials {#connect-speakeasy-credentials}

No credential connection is required because the X Docs MCP Server is public.
The server's **Settings > Identity** section stays on **No Identity**.

Screenshot exception: there is no credential form to complete for this open
Authentication Option.

This guide covers setup only. For anything beyond it — billing, tool behavior,
limits — see X's MCP documentation at `https://docs.x.com/tools/mcp`.

## Open questions

None.

## Provenance

### Source inventory

- **Developer documentation:** `docs.x.com`, including the MCP overview at
  `https://docs.x.com/tools/mcp`, the MCP Server at
  `https://docs.x.com/mcp`, and the machine-readable index at
  `https://docs.x.com/llms.txt`. On 2026-07-29 the canonical pages returned
  HTTP 403 and the Mintlify preview property `https://x-preview.mintlify.app/`
  was used instead; on 2026-09-30 the canonical pages returned HTTP 200 and
  are now the cited locators.
- **Developer product/admin documentation:** `developer.x.com` was swept. It
  returned HTTP 403 to the page fetch and is not needed for this public server,
  because X's MCP documentation requires no developer app or credential.
- **Support KB:** `help.x.com` was swept. It returned HTTP 403 to the page
  fetch; no MCP-specific setup fact was drawn from it.
- **Speakeasy MCP Catalog:** the catalog search on 2026-09-30 returned
  `com.pulsemcp.mirror/x-docs`, title `X Docs`.
- **Speakeasy product doctrine:** `doctrine/speakeasy-setup.md`, used for the
  fixed Speakeasy-side flow and anchors.

### Fact sources

- `https://docs.x.com/mcp` — observed `2026-09-30T00:00:00Z` (re-probed;
  first observed `2026-07-29T20:05:42Z`). Official MCP
  Server URL supplied by the operator and directly probed without
  credentials. Backs the remote URL, successful unauthenticated Streamable
  HTTP initialization, protocol version, server identity, and capabilities.
  The absent protected-resource metadata (404 at
  `https://docs.x.com/.well-known/oauth-protected-resource/mcp`) was
  observed the same day.
- `https://docs.x.com/tools/mcp` — observed `2026-09-30T00:00:00Z`
  (first read from `https://x-preview.mintlify.app/tools/mcp` on
  `2026-07-29T20:05:42Z`).
  Official X documentation. Backs the distinction between the Docs MCP and X
  API MCP servers, the Docs MCP purpose and URL, and its URL-only client
  configuration.
- `https://docs.x.com/llms.txt` — observed `2026-09-30T00:00:00Z` (first
  read from `https://x-preview.mintlify.app/llms.txt` on
  `2026-07-29T20:05:42Z`).
  Official X documentation index. Backs the documentation-property sweep and
  primary MCP documentation locator.
- Pulse registry key `com.pulsemcp.mirror/x-docs`, title `X Docs` — observed
  `2026-09-30T00:00:00Z`; `source: pulsemcp`, mirror record. Backs catalog
  presence and the catalog-only add-server path.
- `doctrine/speakeasy-setup.md` (gram `main` `68b3f78`) — observed
  `2026-09-30T00:00:00Z`. Backs the fixed `add-server-in-speakeasy` and
  `connect-speakeasy-credentials` anchors, exact Speakeasy labels, catalog
  flow with the **No Identity** choice, and closing-pointer form.
