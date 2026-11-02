# Speakeasy setup

### Add the server in Speakeasy {#add-server-in-speakeasy}

1. In the Speakeasy AI Control Plane sidebar, under **MCP Gateway**, select **MCP**.
2. Click **Add new** to open **Add MCP server**.
3. Choose **Hosted remotely**.
4. On **New remote MCP server**, paste the URL you recorded in [Find your Amplitude region](external.md#find-amplitude-region) into **MCP server URL**.

   United States (default):

   ```text
   https://mcp.amplitude.com/mcp
   ```

   EU Residency:

   ```text
   https://mcp.eu.amplitude.com/mcp
   ```

5. Optionally enter a **Display name (optional)**, for example one that names the region.
6. Leave **User session issuer** at its default.
7. Click **Verify connectivity**.
8. Under **Identity**, keep the preselected **User Identity**.
9. If **Guardrails** appears, leave it off.
10. Click **Save**. This creates the server and opens its **Overview** page.

On save, Speakeasy discovers Amplitude's identity provider and registers a client automatically. When that works, the server is ready. When it cannot, the server is kept **Disabled** and the result says to finish setup in **Settings > Identity**.

If your organization uses both regions, add one server per region.

<!-- screenshot: New remote MCP server after Verify connectivity, with an Amplitude URL entered and User Identity selected -->

### Connect your credentials {#connect-speakeasy-credentials}

Open the server's **Settings** and find the **Identity** section. If creation already configured the identity, **User Identity** is selected with the Amplitude provider and **Auto-Configure**; skip to step 5.

1. Select **User Identity**.
2. Under **Choose an identity provider**, confirm the preselected provider uses the issuer for your region. A provider that does not exist yet shows **Will be created**.

   United States:

   ```text
   https://mcp.amplitude.com
   ```

   EU Residency:

   ```text
   https://mcp.eu.amplitude.com
   ```

   If a different provider is preselected, open the picker with **Search identity providers…** and choose the one for your region's issuer.

3. Keep **Auto-Configure** selected. There is no **Client ID** or secret to paste.
4. Click **Save**.
5. If the server shows **Disabled**, open **Settings > Danger Zone > Server Availability** and turn on **Enable MCP server** so it shows **Enabled**.

When a person first uses the server, Amplitude prompts them in the browser:

1. Sign in to Amplitude with the intended account. Stay signed in to only one Amplitude organization during this flow; being signed in to several can make authorization fail.
2. Approve the access request.
3. If the authorization page keeps loading after you approve, close the tab.

To confirm the connection, ask the server which Amplitude projects you can access. If it returns no projects or a tool call fails, check [Check organization MCP access](external.md#check-mcp-access) and [Check MCP role actions](external.md#check-mcp-role-actions).

<!-- screenshot: Settings > Identity with User Identity selected, the Amplitude provider, and Auto-Configure; values redacted -->

This guide covers setup only. For anything beyond it — billing, tool behavior, limits — see [Amplitude's MCP documentation](https://amplitude.com/docs/amplitude-ai/amplitude-mcp).
