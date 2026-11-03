# Speakeasy setup

### Add the server in Speakeasy {#add-server-in-speakeasy}

1. In the Speakeasy AI Control Plane sidebar, under **MCP Gateway**, select **MCP**.
2. Click **Add new** to open **Add MCP server**.
3. Choose **Hosted remotely**. Use this path in both regions, because the server URL depends on your data region.
4. On **New remote MCP server**, paste the server URL from [Identify your data region](external.md#identify-data-region) into **MCP server URL**.
5. Leave **User session issuer** at its default.
6. Click **Verify connectivity**.
7. Under **Identity**, keep **User Identity** selected.
8. If **Guardrails** appears, leave it off.
9. Click **Save**.

On save, Speakeasy discovers the Amplitude identity provider for your region and registers a client automatically. When that works, the server is ready. When it cannot, the server is kept **Disabled** and the result says to finish setup in **Settings > Identity**.

<!-- screenshot: New remote MCP server after Verify connectivity, with an Amplitude server URL entered and User Identity selected -->

### Connect your credentials {#connect-speakeasy-credentials}

Open the server's **Settings** and find the **Identity** section. If creation already configured the identity, **User Identity** is selected with the Amplitude provider and **Auto-Configure**; skip to the last step.

1. Select **User Identity**.
2. Confirm that the preselected provider uses the issuer for your region. A provider that does not exist yet shows **Will be created**.
   - US: `https://mcp.amplitude.com`
   - EU: `https://mcp.eu.amplitude.com`
3. If a provider for the other region is preselected, open the provider picker and choose the one for your region's issuer.
4. Keep **Auto-Configure** selected. There is no **Client ID** or secret to paste.
5. Click **Save**.
6. If the server shows **Disabled**, open **Settings > Danger Zone > Server Availability** and turn on **Enable MCP server** so it shows **Enabled**.

When a person first uses the server, Amplitude prompts them in the browser:

1. Sign in with the Amplitude account for the intended organization. Stay signed in to only one Amplitude organization during this step; Amplitude says being signed in to several can make authentication fail.
2. Approve the authorization request.
3. If the page keeps spinning after you approve, close the tab. Authentication is complete.

If tool calls fail after sign-in, recheck [Confirm MCP access](external.md#confirm-mcp-access).

<!-- screenshot: Settings > Identity with User Identity selected, the Amplitude provider for the region, and Auto-Configure; values redacted -->

This guide covers setup only. For anything beyond it — billing, tool behavior, limits — see [Amplitude's MCP documentation](https://amplitude.com/docs/amplitude-ai/amplitude-mcp).
