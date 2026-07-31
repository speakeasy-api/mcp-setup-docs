---
research_version: 1
slug: hubspot
researched_at: 2026-07-31T20:16:37Z
---

# HubSpot — Research Dossier

## Server facts

- **Remote URL:** `https://mcp.hubspot.com`. HubSpot's implementation overview and general-client section identify this shared hosted URL. The MCP Inspector example also uses `https://mcp.hubspot.com/`; the trailing slash is equivalent, and Metadata uses the provider's headline form without it.
- **Transport:** Streamable HTTP. HubSpot's MCP Inspector settings explicitly pair **Transport Type: Streamable HTTP** with the URL. A direct unauthenticated request observed this run returned `401` plus a Bearer challenge pointing to protected-resource metadata, consistent with a remote HTTP MCP Server.
- **Authentication:** OAuth with a manually created HubSpot **MCP auth app**. The Speakeasy AI Control Plane needs the app's **Client ID** and **Client secret**. PKCE with S256 is mandatory. HubSpot's live authorization-server metadata advertises authorization-code and refresh-token grants, `client_secret_post`, and `S256`; it does not advertise a registration endpoint, corroborating manual client registration.
- **Authorization metadata:** protected-resource metadata at `https://mcp.hubspot.com/.well-known/oauth-protected-resource` names `https://mcp.hubspot.com` as both resource and authorization server. Authorization-server metadata at `https://mcp.hubspot.com/.well-known/oauth-authorization-server` publishes issuer `https://mcp.hubspot.com`, authorization endpoint `https://mcp.hubspot.com/oauth/authorize/user`, and token endpoint `https://mcp.hubspot.com/oauth/v3/token`.
- **Access model:** actions run with the connecting user's existing HubSpot permissions. The app creator does not select fixed scopes: available permissions are determined by the MCP Server's tools at installation time and by what the connecting user grants. HubSpot says an account admin must connect first so other users in that account can connect afterward.
- **Account/platform access:** the remote server requires HubSpot's latest Developer Platform. Access to **Development** requires a **Developer Seat** on seat-based accounts or the **Developer tools access** permission on accounts without seat-based pricing; super admins and partner admins have this access by default. The developer-seat documentation says Developer seats do not incur additional subscription cost. HubSpot does not document a separate paid-plan gate for the remote server.
- **Setup-relevant restrictions:** accounts with Sensitive Data enabled cannot expose activity objects (calls, emails, meetings, notes, and tasks) through this MCP Server. Users can only view or change records their HubSpot permissions allow. These restrictions do not alter credential creation, but they explain a successful connection with less data than expected.
- The separately documented local Developer MCP server is out of scope; this Guide covers the remote server for CRM account data.

## Credential flow

An administrator with access to HubSpot's latest Developer Platform creates an **MCP auth app** in the HubSpot account. In its creation dialog, the administrator enters an app name and pastes `{{ gram.oauth.callback_url }}` into **Redirect URL**. **Description** and **Icon** are optional. HubSpot creates an OAuth app and opens its details page, which shows the **Client ID**, **Client secret**, and redirect URLs. Those two credentials are pasted into the Speakeasy AI Control Plane's manual OAuth sheet.

HubSpot does not ask the administrator to select scopes while creating this app. During the first connection, use an account administrator to select the HubSpot account, grant the requested permissions, and authorize the connection; HubSpot's product overview says the account admin must connect first before other users can connect.

## Console walkthrough

The transition-complete documented route starts in the normal HubSpot account UI. A direct documented deep link, `https://app.hubspot.com/l/mcp-auth-apps/`, is also available if the navigation entry is difficult to find.

### Open MCP Auth Apps {#open-mcp-auth-apps}

- Sign in to the HubSpot account in which the connection will be authorized.
- In the main navigation bar, select **Development**. In the left sidebar, select **MCP Auth Apps**. This opens the MCP auth apps page.
- Access requirement: if **Development** is unavailable, a super admin must provide a **Developer Seat** (seat-based pricing) or enable **Developer tools access** (accounts without seat-based pricing). Super admins and partner admins have developer-platform access by default.
- Next transition: click **Create MCP auth app** in the upper right; this opens the app-details dialog.
- Screenshot note: capture the HubSpot **Development** area with **MCP Auth Apps** selected and **Create MCP auth app** visible. HubSpot's MCP page publishes screenshots of both the navigation item and MCP Auth Apps page.

### Create the MCP auth app {#create-mcp-auth-app}

- In the dialog, enter an organization-recognizable name in **App name**.
- Optionally fill **Description** and **Icon** according to organization policy.
- Paste `{{ gram.oauth.callback_url }}` into **Redirect URL**. This must match the Redirect URI shown later in the Speakeasy AI Control Plane. If multiple redirect URLs are entered, HubSpot uses the first as the default.
- Click **Create**. HubSpot creates the OAuth app and redirects to its details page.
- No scope-selection step is required: HubSpot determines available permissions from current MCP tools and what the connecting user grants during installation.
- Screenshot note: capture the **Create MCP auth app** dialog with **App name**, optional **Description**, **Redirect URL**, optional **Icon**, and **Create** visible; redact any organization-specific values.

### Copy the client credentials {#copy-client-credentials}

- On the app details page, copy the displayed **Client ID** and **Client secret** into the organization's password manager for transfer to the Speakeasy AI Control Plane.
- The same page shows the configured redirect URLs. **Edit info** in the upper right reopens editable app information if the callback value needs correction before first connection.
- Destination: both values go into the matching fields in the Speakeasy AI Control Plane's **Attach Remote Identity Provider** sheet.
- Screenshot note: capture the MCP auth app details page with the client-credential and redirect-URL areas visible, with both credential values fully redacted. HubSpot publishes a screenshot of this page.

## Speakeasy setup

Per-guide rendering values:

- Remote URL: `https://mcp.hubspot.com`
- Transport: `streamable-http` (the add form's **Transport** field is read-only)
- Authentication Option: `oauth-mcp-auth-app`, OAuth with manual client registration and required PKCE
- **Client ID** source: [Copy the client credentials](#copy-client-credentials)
- **Client Secret** source: [Copy the client credentials](#copy-client-credentials)
- Registered callback source: [Create the MCP auth app](#create-mcp-auth-app), where **Redirect URL** receives `{{ gram.oauth.callback_url }}`
- Discovery: live protected-resource metadata points to issuer `https://mcp.hubspot.com`, and authorization-server metadata is publicly available. The canonical Speakeasy flow may therefore use **Use Discovered** when offered; otherwise use **Configure Manually** and **Client Type: Manual**.
- OAuth scopes: leave the Speakeasy scope override empty. HubSpot documents that the app creator does not explicitly define scopes; permissions are determined during installation.
- Further reading: `https://developers.hubspot.com/docs/apps/developer-platform/build-apps/integrate-with-the-remote-hubspot-mcp-server`
- Add-server decision: catalog path only. Operator lookup found Speakeasy MCP Catalog record name `com.pulsemcp.mirror/hubspot`, title **HubSpot** (`source: pulsemcp`).

### Add the server in Speakeasy {#add-server-in-speakeasy}

In the Speakeasy AI Control Plane sidebar, under **Connect**, select **Sources**, then click **Add Source**. Choose **3rd-party server**. On the **MCP Catalog** page, use **Search MCP servers...** to find **HubSpot**, open its entry with **View**, and click **Add**. In the **Add to Project** dialog, click **Add to Project**. This creates the hosted MCP server and opens its **Overview** page.

Screenshot note: capture the **HubSpot** catalog result or entry with **View** or **Add** visible.

### Connect your credentials {#connect-speakeasy-credentials}

From the server's **Overview**, open **Settings**. Under **Authentication**, click **Use Discovered** when it is offered; otherwise click **Configure Manually**. In the **Attach Remote Identity Provider** sheet, set **Client Type** to **Manual**. Paste the **Client ID** and **Client Secret (optional)** produced in [Copy the client credentials](#copy-client-credentials). Confirm that the sheet's **Redirect URI** matches the `{{ gram.oauth.callback_url }}` value entered in HubSpot's **Redirect URL** field in [Create the MCP auth app](#create-mcp-auth-app), and leave any scope override empty. Then click **Attach Identity Provider**.

When the first user authorizes HubSpot access, use the intended HubSpot account administrator, select the account, grant the requested permissions, and authorize the connection. The exact authorization-prompt control labels are not published in the provider documentation.

Screenshot note: capture the Manual **Attach Remote Identity Provider** sheet with its **Redirect URI**, **Client ID**, and **Client Secret (optional)** fields visible and all values redacted.

Closing pointer: This guide covers setup only. For anything beyond it — billing, tool behavior, limits — see HubSpot's MCP documentation at `https://developers.hubspot.com/docs/apps/developer-platform/build-apps/integrate-with-the-remote-hubspot-mcp-server`.

Provenance for this fixed Speakeasy-side flow: `doctrine/speakeasy-setup.md`, observed 2026-07-31T20:16:37Z. Catalog presence comes from the operator-supplied Pulse tenant lookup recorded below.

## Open questions

- HubSpot documents the authorization sequence (select account, grant permissions, authorize) but not the exact labels of the controls shown in those browser prompts. The Writer should describe the sequence without inventing button labels.

## Provenance

### Source inventory from documentation sweep

- **Developer documentation:** `https://developers.hubspot.com/docs/llms.txt` is the machine-readable index. It lists the remote MCP integration page, local Developer MCP pages, Developer Platform overview, and developer-seat documentation. Used for the remote setup and access requirements.
- **Developer product landing page:** `https://developers.hubspot.com/ai-tools/mcp` (canonical destination of `/mcp`). Used to distinguish the two MCP servers, confirm latest-Developer-Platform standing, and confirm that an account admin connects first.
- **Product/admin documentation:** HubSpot's developer-seat page and Knowledge Base permissions guide document access to **Development**. Used for access requirements.
- **Support Knowledge Base:** `https://knowledge.hubspot.com/` was swept; `/llms.txt` returned 404. The user-permissions guide was relevant and used. No separate remote-MCP setup article was found in the Knowledge Base index/search surfaces.
- **Live MCP endpoint metadata:** protected-resource and authorization-server metadata were fetched to corroborate the auth model and discovery behavior.
- **Speakeasy canonical setup:** `doctrine/speakeasy-setup.md` supplies the fixed Control Plane labels and anchors.
- **Speakeasy MCP Catalog:** operator-supplied Pulse lookup was present for `com.pulsemcp.mirror/hubspot`, title **HubSpot**; therefore only the catalog path is rendered.

### Sources and backed facts

- `https://developers.hubspot.com/docs/llms.txt` — observed 2026-07-31T20:16:37Z — developer documentation inventory and relevant-page discovery.
- `https://developers.hubspot.com/docs/apps/developer-platform/build-apps/integrate-with-the-remote-hubspot-mcp-server` — observed 2026-07-31T20:16:37Z — primary source for remote URL, Streamable HTTP, PKCE, manual MCP auth app creation, exact navigation/button/field labels, redirect behavior, credentials, scope behavior, permissions, Sensitive Data restriction, and authorization sequence. Page reports last modified July 23, 2026.
- `https://developers.hubspot.com/ai-tools/mcp` — observed 2026-07-31T20:16:37Z — remote/local distinction, latest Developer Platform requirement, OAuth overview, and account-admin-first requirement.
- `https://developers.hubspot.com/docs/apps/developer-platform/developer-seats` — observed 2026-07-31T20:16:37Z — Developer Seat, Developer tools access, super-admin/partner-admin defaults, no-additional-cost statement, and **Development** navigation.
- `https://knowledge.hubspot.com/user-management/hubspot-user-permissions-guide` — observed 2026-07-31T20:16:37Z — corroborates the **Developer tools access** permission and its developer-feature access.
- `https://mcp.hubspot.com/.well-known/oauth-protected-resource` — observed 2026-07-31T20:16:37Z — resource, authorization server, documentation locator, and discoverability.
- `https://mcp.hubspot.com/.well-known/oauth-authorization-server` — observed 2026-07-31T20:16:37Z — issuer, authorization/token endpoints, grants, `client_secret_post`, and S256 PKCE; absence of a dynamic-registration endpoint.
- `https://mcp.hubspot.com` — observed 2026-07-31T20:16:37Z — direct unauthenticated HTTP observation of `401` and Bearer protected-resource challenge.
- `doctrine/speakeasy-setup.md` — observed 2026-07-31T20:16:37Z — Speakeasy add-server and manual OAuth flow, exact UI labels, fixed anchors, and closing pointer.
- Pulse tenant lookup, registry name `com.pulsemcp.mirror/hubspot`, title `HubSpot` — observed 2026-07-31T20:16:37Z — Speakeasy MCP Catalog presence and catalog-only path selection (`source: pulsemcp`).
