# Speakeasy setup

### Add the server in Speakeasy {#add-server-in-speakeasy}

1. In the Speakeasy AI Control Plane sidebar, under **MCP Gateway**, select **MCP**.
2. Click **Add new** to open **Add MCP server**.
3. Choose **From the catalog**.
4. On the **MCP Catalog** page, find **Asana** using **Search MCP servers...**.
5. Open the **Asana** entry and click **Add**.
6. In the **Add to Project** dialog, under **Identity**, select **User Identity**. The dialog may preselect **No Identity**.
7. Click **Add to Project**. If the dialog offers a **Guardrails** step, finish it or click **Skip for now**.

Asana needs a client registered by hand, so the result says to finish setup in **Settings > Identity**, and the server stays **Disabled** for now. This is expected. Click **Finish setup** on the server's result to open its **Settings**.

<!-- screenshot: Asana's catalog entry in Add to Project with User Identity selected -->

### Connect your credentials {#connect-speakeasy-credentials}

In the server's **Settings**, find the **Identity** section.

1. Select **User Identity**.
2. In **Choose an identity provider**, confirm the provider is `https://app.asana.com`. It may be badged **Will be created**. If no provider or a different one is selected, open the picker, search for `app.asana.com` in **Search identity providers…**, and choose it.
3. Under the provider, choose **Manual**.
4. Paste the **Client ID** from [Create the MCP app](external.md#create-mcp-app) into **Client ID**.
5. Paste the **Client secret** from [Create the MCP app](external.md#create-mcp-app) into **Client secret**. Asana requires it, even though the field shows "Optional".
6. Open **Advanced** and enter `default` in **Scope**. Do not add other scopes; Asana rejects them with "Invalid scope(s) requested".
7. Click **Save**.

This section does not show the redirect URI. Asana accepts the connection only if [Configure the OAuth redirect](external.md#configure-oauth-redirect) registered `{{ gram.oauth.callback_url }}`.

Then turn the server on:

1. In **Settings**, open **Danger Zone**.
2. Under **Server Availability**, turn on **Enable MCP server** so it shows **Enabled**.

Each user sees Asana's authorization prompt the first time they use the server.

<!-- screenshot: Settings > Identity with User Identity, the app.asana.com provider, and Manual selected; credential values redacted -->

This guide covers setup only. For anything beyond it — billing, tool behavior, limits — see [Asana's MCP documentation](https://developers.asana.com/docs/using-asanas-mcp-server).
