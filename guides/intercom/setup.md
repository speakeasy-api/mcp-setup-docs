---
setup_version: 1
---

# Connect Intercom to the Speakeasy AI Control Plane

## Prerequisites

- An Intercom workspace hosted in the US or EU. Australian-hosted workspaces are not supported.
- An Intercom account authorized to access the intended workspace data. The server requests **Read and list users and companies**, **Read conversations**, and **Read and write articles**.

Intercom does not document an MCP-specific plan tier or administrator role.

## Provider setup

### Identify the workspace region {#identify-workspace-region}

1. Sign in to the intended Intercom workspace in your browser.
2. Inspect the hostname in the browser address bar.
3. If the hostname is `app.au.intercom.com`, stop. Intercom does not support the MCP server for Australian-hosted workspaces.
4. Record the matching values:
   - For `app.intercom.com`, use remote URL `https://mcp.intercom.com/mcp` and issuer URL `https://mcp.intercom.com`.
   - For `app.eu.intercom.com`, use remote URL `https://mcp.eu.intercom.com/mcp` and issuer URL `https://mcp.eu.intercom.com`.

<!-- screenshot-exception: the only relevant state is the workspace hostname in the browser address bar; no Intercom MCP settings screen exists for this authentication path -->

## Speakeasy setup

### Add the server in Speakeasy {#add-server-in-speakeasy}

1. In the Speakeasy AI Control Plane sidebar, under **Connect**, select **Sources**.
2. Click **Add Source**.
3. Choose **Custom remote server**.
4. On **Add a custom remote MCP server**, paste the remote URL from [Identify the workspace region](#identify-workspace-region) into **Remote MCP server URL**.
5. Click **Add server**. This opens the server's **Overview** page.

<!-- screenshot: the Add Source menu and the Add a custom remote MCP server page with the matching Intercom remote URL -->

### Connect your credentials {#connect-speakeasy-credentials}

1. From the server's **Overview**, open **Settings**.
2. Locate **Authentication**.

**Use Discovered** should be unavailable. If it appears, stop here. Do not continue with manual configuration.

3. Click **Configure Manually**.
4. In **Attach Remote Identity Provider**, enter the issuer URL from [Identify the workspace region](#identify-workspace-region) in **Issuer URL**.
5. Keep the auto-derived **Slug** unless your project naming policy requires a different value.
6. Keep **Display name (optional)** unless your project naming policy requires a different value.
7. Under **Endpoints**, click **Discover**.
8. Under **Session Client**, keep **Client Type** set to **Dynamic Client Registration (DCR)**.
9. Keep **Token Endpoint Auth Method** set to `client_secret_basic`.
10. Leave **Scope (override)** empty.
11. Leave **Audience (optional)** empty.
12. Click **Attach Identity Provider**.

The Speakeasy AI Control Plane dynamically registers with Intercom. You do not need a Client ID or Client Secret.

<!-- screenshot: Attach Remote Identity Provider after Discover, showing the regional issuer and endpoints with Client Type set to Dynamic Client Registration (DCR) -->

When a client initiates Intercom access, complete the on-screen browser prompts with the intended workspace account.

This guide covers setup only. For anything beyond it — billing, tool behavior, limits — see Intercom's MCP documentation at https://developers.intercom.com/docs/guides/mcp.
