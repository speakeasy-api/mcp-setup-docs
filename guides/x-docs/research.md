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
`doctrine/speakeasy-setup.md` skeleton:

- Provider and catalog title: X Docs.
- Remote URL: `https://docs.x.com/mcp`.
- Transport: `streamable-http`; the **Transport** field is read-only.
- Add-server path: catalog only. The Speakeasy MCP Catalog lookup was present
  and matched `name="com.pulsemcp.mirror/x-docs"` with title `X Docs`.
- Authentication Option: open. No External-setup step produces a credential,
  and no upstream header or identity provider is configured.
- Further-reading URL: `https://docs.x.com/tools/mcp`.

### Add the server in Speakeasy {#add-server-in-speakeasy}

In the Speakeasy AI Control Plane sidebar, under **Connect**, select
**Sources**, then click **Add Source**. Choose **3rd-party server**. On the
**MCP Catalog** page, enter `X Docs` in **Search MCP servers...**, open the
**X Docs** entry with **View**, and click **Add**. In the **Add to Project**
dialog, click **Add to Project**.

This creates the hosted MCP server and opens its **Overview** page.

Screenshot note: capture the **X Docs** catalog entry or the **Add to
Project** dialog; no credential values need redaction.

### Connect your credentials {#connect-speakeasy-credentials}

No credential connection is required because the X Docs MCP Server is public.
Do not add an upstream header or attach an identity provider.

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
  `https://docs.x.com/llms.txt`. The canonical documentation pages returned
  HTTP 403 to the page fetch during this run; the same official MCP overview
  and index were available from X's Mintlify preview property at
  `https://x-preview.mintlify.app/`.
- **Developer product/admin documentation:** `developer.x.com` was swept. It
  returned HTTP 403 to the page fetch and is not needed for this public server,
  because X's MCP documentation requires no developer app or credential.
- **Support KB:** `help.x.com` was swept. It returned HTTP 403 to the page
  fetch; no MCP-specific setup fact was drawn from it.
- **Speakeasy MCP Catalog:** the supplied tenant lookup reported a present
  match for `com.pulsemcp.mirror/x-docs`, title `X Docs`.
- **Speakeasy product doctrine:** `doctrine/speakeasy-setup.md`, used for the
  fixed Speakeasy-side flow and anchors.

### Fact sources

- `https://docs.x.com/mcp` — observed `2026-07-29T20:05:42Z`. Official MCP
  Server URL supplied by the operator and directly probed without
  credentials. Backs the remote URL, successful unauthenticated Streamable
  HTTP initialization, protocol version, server identity, and capabilities.
- `https://x-preview.mintlify.app/tools/mcp` (canonical page:
  `https://docs.x.com/tools/mcp`) — observed `2026-07-29T20:05:42Z`.
  Official X documentation. Backs the distinction between the Docs MCP and X
  API MCP servers, the Docs MCP purpose and URL, and its URL-only client
  configuration.
- `https://x-preview.mintlify.app/llms.txt` (canonical index:
  `https://docs.x.com/llms.txt`) — observed `2026-07-29T20:05:42Z`.
  Official X documentation index. Backs the documentation-property sweep and
  primary MCP documentation locator.
- Pulse registry key `com.pulsemcp.mirror/x-docs`, title `X Docs` — observed
  `2026-07-29T20:05:42Z`; `source: pulsemcp`, mirror record. Backs catalog
  presence and the catalog-only add-server path.
- `doctrine/speakeasy-setup.md` — observed `2026-07-29T20:05:42Z`. Backs the
  fixed `add-server-in-speakeasy` and `connect-speakeasy-credentials` anchors,
  exact Speakeasy labels, catalog flow, and closing-pointer form.
