# Okta research dossier

Observed: 2026-09-25. Audience: `doctrine/personas/it-admin.md`.
Status: draft; provider documentation researched, no live tenant or end-to-end Speakeasy connection tested.

## Identity and scope

This guide covers the **Okta Managed MCP Server**, an official cloud-hosted Early Access service. It does not cover the separate [Okta Open Source MCP Server](https://github.com/okta/okta-mcp-server), nor using Okta to authenticate another provider's MCP server.

- [Managed server overview](https://help.okta.com/mcp/en-us/content/topics/mcpserver/mcpserver.htm): hosted in Okta's cloud; validates OAuth scopes and user permissions on requests.
- [Client configuration overview](https://help.okta.com/mcp/en-us/content/topics/mcpserver/mcp-client-configuration-overview.htm): endpoint `https://{yourOktaDomain}/mcp`; requires MCP protocol version **2025-11-25**. No local server installation is needed.
- [VS Code configuration](https://help.okta.com/mcp/en-us/content/topics/mcpserver/configure-vscode-github-copilot.htm): example `type: http`, URL `https://yourorg.okta.com/mcp`. This is the evidence for the Streamable HTTP transport recorded in metadata. Dynamic client registration is not supported; enter the registered client ID manually. API-key authentication is not supported.
- [Authentication overview](https://help.okta.com/mcp/en-us/content/topics/mcpserver/okta-app-authentication-overview.htm): OIDC with PKCE; HTTPS connectivity and access to the org's endpoints are prerequisites.

Pulse catalog lookup was skipped: no catalog identity or alias is asserted. The remote is tenanted, so canonical doctrine requires Custom remote server regardless of catalog presence. `speakeasy_add_server: custom-remote` makes that choice explicit.

## Requirements

An Early Access-enabled Okta org; administrative permissions to create the OIDC app, assign users/groups, and grant scopes; an assigned account with permissions for the intended operations; HTTPS connectivity to the org; a compatible MCP client. Public pages reviewed do not establish a minimum commercial plan, exact administrator-role combination, or a self-service Early Access enablement path. Ask the org administrator to confirm access rather than inventing one. Approved password-manager storage is an editorial security recommendation.

## Provider steps and anchors

### Find your organization's MCP URL {#find-mcp-url}

Source: client configuration overview above. Obtain the org URL from the org administrator and append `/mcp`, for example `https://yourorg.okta.com/mcp`. Do not use an Admin Console hostname or invent a global Okta MCP endpoint. The guide intentionally asks the administrator for the org URL instead of inferring it from an arbitrary browser address.

Screenshot exception: the URL is assembled from the org URL; the reviewed docs do not show an MCP URL field to copy.

### Create an app integration {#create-app-integration}

Source: [OIDC with PKCE](https://help.okta.com/mcp/en-us/content/topics/mcpserver/oidc-pkce-browser-based.htm).

Documented sequence and labels: **Applications and resources** > **Applications**; **Create App Integration**; **OIDC - OpenID Connect**; select application type; **Next**; **App integration name**; **Grant type** = **Authorization code**; **Sign-in redirect URIs**; **Assignments**; **Save**. Users or groups must be assigned before connecting regardless of scope grants.

Okta documents Native app for MCP clients such as VS Code, Web app for server-side applications, and Single-page app for browser applications. This draft selects **Native app** to follow the documented public-client PKCE/client-ID-only flow. Applying that flow to Speakeasy is an untested adaptation, not a provider-certified integration. If Speakeasy requires a confidential web client, revise this choice and document its client-secret setup before publication.

`Speakeasy AI Control Plane` is a suggested app name. The redirect value `{{ gram.oauth.callback_url }}` is the repository's canonical template, substituted for the client-specific callback in Okta's instructions. Operator must confirm it matches the Attach sheet's Redirect URI.

Screenshot: app creation with Native app, Authorization code, Sign-in redirect URIs, and Assignments; omit unrelated user data.

### Grant scopes and copy the client ID {#grant-scopes-copy-client-id}

Source: OIDC with PKCE above. Open **Okta API Scopes**, click **Grant** for required scopes, then **General**, confirm **Proof Key for Code Exchange (PKCE)**, and copy **Client ID**. Save the granted-scope list. No universal scope bundle is asserted.

[Best practices](https://help.okta.com/mcp/en-us/content/topics/mcpserver/best-practices.htm) directs least privilege and read-only validation before writes. Scope selection is delegated to the org administrator according to intended tasks. The overview confirms user permissions also apply.

Screenshot: intended scope grants and General/PKCE; redact credentials and unrelated org data.

## Speakeasy setup transclusion (resolved path)

Source: `doctrine/speakeasy-setup.md`. Tenant-specific endpoint means Custom remote; authentication option is manual OAuth, not DCR or upstream API-key headers.

### Add the server in Speakeasy {#add-server-in-speakeasy}

In the Speakeasy AI Control Plane sidebar, under **Connect**, select **Sources**, then **Add Source**. Choose **Custom remote server**. On **Add a custom remote MCP server**, paste the provider-step URL into **Remote MCP server URL** and select **Add server**. This creates the hosted MCP server and opens its **Overview** page.

Screenshot: Add a custom remote MCP server with the tenant URL field.

### Connect your credentials {#connect-speakeasy-credentials}

From **Overview**, open **Settings**. Under **Authentication**, select **Configure Manually**. In **Attach Remote Identity Provider**, set **Client Type** to **Manual**. Paste **Client ID** from `external.md#grant-scopes-copy-client-id`. Leave **Client Secret (optional)** empty for the chosen public-client flow. Confirm **Redirect URI** matches the callback registered in `external.md#create-app-integration`, then select **Attach Identity Provider**.

Screenshot: Manual client and Redirect URI, credentials redacted. These UI labels and actions come from canonical doctrine, not an observed Okta/Speakeasy session. Tenant issuer discovery, token authentication, scope requests and PKCE still require operator validation; do not invent manual endpoint overrides.

On first provider access, complete browser authorization with an assigned account. [Verify the connection](https://help.okta.com/mcp/en-us/content/topics/mcpserver/verify-the-connection.htm) recommends a low-risk account-status query and checking granted scopes after authorization errors. Use a real test user appropriate to the granted scopes, not the documentation's example email. Check assignments as required by the app setup page. Best practices recommends checking returned data before writes.

Closing pointer: [Okta's Managed MCP Server documentation](https://help.okta.com/mcp/en-us/content/topics/mcpserver/mcpserver.htm).

## Open questions / publication gate

1. Operator: Does the target Speakeasy deployment negotiate MCP 2025-11-25 and complete this manually registered public-client PKCE flow? If not, stop and revise the application type/authentication path; do not fall back to an API token.
2. Operator: With an enabled test tenant, does Configure Manually discover the correct issuer/endpoints and request the intended granted scopes without additional configuration? Record any required supported UI fields before marking the guide verified.
3. Operator: Confirm callback template substitution and complete a read-only request with an assigned test user. No live authorization or tool invocation was performed during drafting.

These limitations are visible in both setup files. The branch is a reviewable draft, not evidence of a working integration.
