# Speakeasy setup

### Add the server in Speakeasy {#add-server-in-speakeasy}

1. In the Speakeasy AI Control Plane sidebar, under **MCP Gateway**, select **MCP**.
2. Click **Add new** to open **Add MCP server**.
3. Choose **From the catalog**.
4. On the **MCP Catalog** page, use **Search MCP servers...** to find **Box**.
5. Open the **Box** entry and click **Add**.
6. In the **Add to Project** dialog, under **Identity**, select **User Identity**. The dialog may preselect **No Identity**.
7. Click **Add to Project**. If the dialog offers a **Guardrails** step, finish it or click **Skip for now**.

Box needs a client registered by hand, so the result says to finish setup in **Settings > Identity**, and the server stays **Disabled** for now. This is expected. Click **Finish setup** on the server's result to open its **Settings**.

<!-- screenshot: the Box catalog entry in Add to Project with User Identity selected -->

### Connect your credentials {#connect-speakeasy-credentials}

Box's server names its sign-in provider as `https://api.box.com/`, with a trailing slash, while Box's provider metadata says `https://api.box.com`. The provider picker cannot create a provider from that mismatch, so create the Box provider by hand first.

In the server's **Settings**, find the **Identity** section and select **User Identity**. Then create the provider:

1. Open **Choose an identity provider** and click **Create a custom identity provider**. This opens **Remote Identity Providers**.
2. Click **New Remote Identity Provider**.
3. In **Issuer URL**, enter `https://api.box.com`, with no trailing slash.
4. Click **Discover**.
5. Under **Endpoints**, confirm **Authorization Endpoint** and **Token Endpoint** show these values. If they are empty, enter them:

   ```text
   https://account.box.com/api/oauth2/authorize
   ```

   ```text
   https://api.box.com/oauth2/token
   ```

6. Keep the derived **Slug** and click **Create**.

Add the Box client to that provider:

1. On the new provider, click **Add Client**.
2. Set **Client Type** to **Manual**.
3. Paste the [Box Client ID](external.md#copy-client-credentials) into **Client ID**.
4. Paste the [Box Client Secret](external.md#copy-client-credentials) into **Client Secret (optional)**. Box requires it.
5. Leave **Scope (override)** empty. Box then grants the **Access scopes** selected in [Check the Access scopes](external.md#check-access-scopes).
6. Confirm the displayed **Redirect URI** matches the value you entered in [Set the Redirect URI](external.md#set-redirect-uri).
7. Click **Create**.

Connect the server to that client:

1. Return to the server's **Settings > Identity** and select **User Identity**.
2. In **Choose an identity provider**, open the picker and choose the `api.box.com` provider you created.
3. Choose **Existing client**.
4. Under **Client**, pick the client you created.
5. Click **Save**.

Then turn the server on:

1. In **Settings**, open **Danger Zone**.
2. Under **Server Availability**, turn on **Enable MCP server** so it shows **Enabled**.

Each user sees Box's authorization prompt the first time they use the server.

<!-- verify(operator): the template key substitutes this same Redirect URI value -->
<!-- screenshot: Settings > Identity with User Identity, the api.box.com provider, and Existing client selected; credential values redacted -->

This guide covers setup only. For anything beyond it — billing, tool behavior, limits — see [Box's MCP documentation](https://docs.box.com/en/box-mcp/about-box-mcp-server).
