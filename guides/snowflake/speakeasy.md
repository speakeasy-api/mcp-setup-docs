# Speakeasy setup

### Add the server in Speakeasy {#add-server-in-speakeasy}

1. In the Speakeasy AI Control Plane sidebar, under **Connect**, select **Sources**.
2. Click **Add Source**.
3. Choose **3rd-party server**.
4. On the **MCP Catalog** page, enter `Snowflake` in **Search MCP servers...**.
5. Open the Snowflake result with **View**.
6. Click **Add**.
7. In the **Add to Project** dialog, click **Add to Project**.

This creates the hosted MCP server and opens its **Overview** page.

<!-- screenshot: the Snowflake catalog result and Add to Project dialog -->

### Connect your credentials {#connect-speakeasy-credentials}

1. From the server's **Overview**, open **Settings**.
2. Under **Authentication**, click **Configure Manually**.
3. In the **Attach Remote Identity Provider** sheet, set **Client Type** to **Manual**.
4. Confirm that the displayed **Redirect URI** matches the `{{ gram.oauth.callback_url }}` value registered in [Create the OAuth integration](external.md#create-oauth-integration).
5. Paste the [**Client ID**](external.md#copy-oauth-credentials) into **Client ID**.
6. Paste the [**Client Secret**](external.md#copy-oauth-credentials) into **Client Secret (optional)**.
7. Click **Attach Identity Provider**.

<!-- screenshot: the Attach Remote Identity Provider sheet with labels visible and values redacted -->

When a client first requests Snowflake access, Snowflake's OAuth flow opens in a browser. Each user signs in with their own Snowflake credentials and consents to the non-privileged default role. The resulting session uses that user's `DEFAULT_ROLE`.

This guide covers setup only. For anything beyond it — billing, tool behavior, limits — see [Snowflake's MCP documentation](https://docs.snowflake.com/en/user-guide/snowflake-cortex/cortex-agents-mcp).
