# Speakeasy setup

### Add the server in Speakeasy {#add-server-in-speakeasy}

1. In the Speakeasy AI Control Plane sidebar, under **Connect**, select
   **Sources**.
2. Select **Add Source**.
3. Choose **3rd-party server**.
4. On the **MCP Catalog** page, enter `Zapier` in **Search MCP servers...**.
5. On the **Zapier** entry, select **View**.
6. Select **Add**.
7. In the **Add to Project** dialog, select **Add to Project**.

This creates the hosted MCP server and opens its **Overview** page.

<!-- screenshot: the Add Source menu open on the Sources page, or the Zapier catalog entry -->

### Connect your credentials {#connect-speakeasy-credentials}

1. From the server's **Overview** page, open **Settings**.
2. Under **Authentication**, select **Use Discovered** when offered;
   otherwise, select **Configure Manually**.

This opens the **Attach Remote Identity Provider** sheet. OAuth discovery
uses Zapier's metadata without requiring you to paste an issuer.

3. Keep the auto-derived **Slug**.
4. Keep the auto-derived **Display name (optional)**.
5. Under **Endpoints**, select **Discover** to fill the authorization, token,
   and registration endpoints.
6. Under **Session Client**, keep **Client Type** set to **Dynamic Client
   Registration (DCR)**.
7. Keep **Token Endpoint Auth Method** at its discovered default.
8. Leave **Scope (override)** empty.
9. Leave **Audience (optional)** empty.
10. Select **Attach Identity Provider**.

The Speakeasy AI Control Plane registers the OAuth client with Zapier. You do
not need to paste a **Client ID** or **Client Secret**.

11. When provider access is first requested, sign in to Zapier with the account
   whose app connections should be available.
12. Complete Zapier's on-screen authorization prompts.

<!-- screenshot: the Attach Remote Identity Provider sheet after discovery, showing Dynamic Client Registration (DCR) and the discovered endpoints, with account-specific values redacted -->

This guide covers setup only. For anything beyond it — billing, tool behavior, limits — see Zapier's MCP documentation at https://docs.zapier.com/mcp/get-started/connect.
