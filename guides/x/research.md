---
research_version: 1
slug: x
researched_at: 2026-07-29T19:57:31Z
---

# X — Research Dossier

## Server facts

- **Remote URL:** `https://docs.x.com/mcp`.
- **Purpose:** X's hosted documentation MCP Server searches and retrieves
  public X developer documentation. It is separate from the authenticated X
  API MCP Server at `https://api.x.com/mcp`.
- **Transport:** Streamable HTTP. An unauthenticated MCP `initialize` request
  returned HTTP 200 as `text/event-stream`, negotiated protocol version
  `2025-06-18`, and identified the server as `X` version `1.0.0`.
- **Authentication Option:** open; X's published configuration supplies only
  the remote URL, and a direct unauthenticated initialization succeeded. No
  provider account, app, API credits, token, OAuth client, or callback URL is
  required for this documentation server.
- **Behavior relevant to setup:** the initialized server reports tool and
  resource capabilities and describes itself as read-only except for a
  documentation-feedback tool. The runtime-advertised tool list remains the
  source of truth, so this Guide does not catalog tools.

## Credential flow

There is no credential flow. The Speakeasy AI Control Plane needs no
provider-created values, and `{{ gram.oauth.callback_url }}` is not used.

## Console walkthrough

X requires no account enrollment, developer-console navigation, or credential
creation for this MCP Server. External setup consists only of confirming that
the server is public and uses the fixed URL `https://docs.x.com/mcp`.

### Confirm the public documentation server {#confirm-public-docs-server}

- Use the fixed remote URL `https://docs.x.com/mcp`. Do not substitute
  `https://api.x.com/mcp`; that is X's separate API MCP Server and requires
  authentication.
- Values entered or copied: none during External setup.
- Transition: proceed directly to adding X from the Speakeasy MCP Catalog.
- Screenshot exception: there is no provider console or meaningful visual
  state for this plain public-URL confirmation.

## Speakeasy setup

Per-guide values rendered into the canonical
`doctrine/speakeasy-setup.md` skeleton:

- Provider: X.
- Remote URL: `https://docs.x.com/mcp`.
- Transport: `streamable-http`; the **Transport** field is read-only.
- Catalog status: present. Pulse matched registry
  `name="com.pulsemcp.mirror/xdevplatform-xmcp"` with title `X`; render only
  the catalog path.
- Authentication Option: open. No External-setup step produces a credential,
  and there is no header or identity provider to configure.
- Further-reading URL: `https://docs.x.com/tools/mcp`.

### Add the server in Speakeasy {#add-server-in-speakeasy}

In the Speakeasy AI Control Plane sidebar, under **Connect**, select
**Sources**, then click **Add Source**. Choose **3rd-party server**. On the
**MCP Catalog** page, enter `X` in **Search MCP servers...**, open the X entry
with **View**, and click **Add**. In the **Add to Project** dialog, click
**Add to Project**.

This creates the hosted MCP server and opens its **Overview** page.

Screenshot note: capture the X catalog entry or the **Add to Project** dialog;
no credentials need redaction.

### Connect your credentials {#connect-speakeasy-credentials}

No credential connection is required because the X documentation MCP Server
is public. Do not add an upstream header or attach an identity provider.

Screenshot exception: there is no credential form to complete for this open
Authentication Option.

This guide covers setup only. For anything beyond it — billing, tool behavior,
limits — see X's MCP documentation at `https://docs.x.com/tools/mcp`.

## Open questions

None.

## Provenance

### Source inventory

- **Developer documentation:** `docs.x.com`, including the documented MCP
  overview at `https://docs.x.com/tools/mcp`, the public MCP Server at
  `https://docs.x.com/mcp`, and the machine-readable index at
  `https://docs.x.com/llms.txt`. The documentation pages returned HTTP 403 to
  this research fetch, while the same official MCP overview remained
  available from X's Mintlify preview property at
  `https://x-preview.mintlify.app/tools/mcp`.
- **Developer product/admin documentation:** X's developer-console
  documentation was swept in the prior run. It does not apply to the public
  Docs MCP setup because this server requires no developer app or credential.
- **Support KB:** `help.x.com` was identified and swept in the prior run; no
  MCP-specific setup page was found and no facts were drawn from it.
- **Speakeasy MCP Catalog:** Pulse tenant lookup reported the matched X entry
  as present.
- **Speakeasy product doctrine:** `doctrine/speakeasy-setup.md`, used for the
  fixed Speakeasy-side flow and anchors.

### Fact sources

- `https://docs.x.com/mcp` — observed `2026-07-29T19:57:31Z`. Official remote
  supplied by the operator and directly probed without credentials. Backs the
  remote URL, successful unauthenticated Streamable HTTP initialization,
  protocol version, server identity, capabilities, and public/read-only
  documentation scope.
- `https://x-preview.mintlify.app/tools/mcp` (canonical page:
  `https://docs.x.com/tools/mcp`) — observed `2026-07-29T19:57:31Z`. Official
  X documentation. Backs the distinction between the Docs MCP and X API MCP
  servers, the Docs MCP URL, its hosted documentation-search purpose, and the
  URL-only client configuration.
- `https://docs.x.com/llms.txt` — observed `2026-07-29T19:57:31Z`. Official
  documentation index; the canonical host returned HTTP 403 during this run
  and was used as a documentation-property locator rather than a fact source.
- Pulse registry key `com.pulsemcp.mirror/xdevplatform-xmcp`, title `X` —
  observed `2026-07-29T19:57:31Z`; `source: pulsemcp`, mirror record. Backs
  catalog presence and the catalog-only add-server path.
- `doctrine/speakeasy-setup.md` — observed `2026-07-29T19:57:31Z`. Backs the
  fixed {#add-server-in-speakeasy} and
  {#connect-speakeasy-credentials} anchors, exact Speakeasy labels,
  catalog-path flow, and closing-pointer form.
