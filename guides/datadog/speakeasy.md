# Speakeasy setup

### Add the server in Speakeasy {#add-server-in-speakeasy}

1. In the Speakeasy AI Control Plane sidebar, under **MCP Gateway**, select **MCP**.
2. Click **Add new** to open **Add MCP server**.
3. Choose **Hosted remotely**.
4. On **New remote MCP server**, paste the endpoint you recorded in [Identify the Datadog site](external.md#identify-datadog-site) into **MCP server URL**.
5. Leave **User session issuer** at its default.
6. Click **Verify connectivity**.
7. Under **Identity**, keep **User Identity** selected.
8. If **Guardrails** appears, leave it off.
9. Click **Save**. This creates the server and opens its **Overview** page.

When it saves the server, Speakeasy discovers Datadog's identity provider and registers a client automatically. There is no **Client ID** or secret to paste. If that cannot complete, the server is kept **Disabled** and the result says to finish setup in **Settings > Identity**.

<!-- screenshot: New remote MCP server after Verify connectivity, with a Datadog endpoint entered and User Identity selected -->

### Connect your credentials {#connect-speakeasy-credentials}

Open the server's **Settings** and find the **Identity** section. It normally shows **User Identity** with your site's Datadog endpoint as the provider and **Auto-Configure** already set; skip to step 5.

1. Select **User Identity**.
2. Confirm the preselected provider is the endpoint you recorded in [Identify the Datadog site](external.md#identify-datadog-site). A provider that does not exist yet shows **Will be created**. If a different provider is selected, open the picker, search for your endpoint's host, such as `mcp.datadoghq.com`, in **Search authorization servers…**, and choose it.
3. Keep **Auto-Configure** selected.
4. Click **Save**.
5. If the server shows **Disabled**, open **Settings > Danger Zone > Server Availability** and turn on **Enable MCP server** so it shows **Enabled**.

The first time each person uses the server, they sign in to Datadog, select the organization, and authorize access. If Datadog's authorization fails, confirm that [Add the Speakeasy redirect URL](external.md#add-oauth-redirect-url) added the callback to **MCP OAuth Redirect URLs**. Each person can reach only what their Datadog roles allow.

<!-- screenshot: Settings > Identity with User Identity selected, the mcp.datadoghq.com provider, and Auto-Configure; values redacted -->

This guide covers setup only. For anything beyond it — billing, tool behavior, limits — see [Datadog's MCP documentation](https://docs.datadoghq.com/mcp_server/).
