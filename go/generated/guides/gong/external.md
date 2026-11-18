---
setup_version: 1
---

# Set up Gong

Sign in to Gong as a **tech admin**. The MCP server is available on any Gong plan, but each person who connects needs a paid Gong seat. Collaborator seats cannot connect. Make sure your organization has Gong credits if users will run [tools that consume credits](https://help.gong.io/docs/how-mcp-server-tools-and-apis-consume-credits).

You create an integration in Gong to approve the Speakeasy redirect URI. Speakeasy registers its OAuth client automatically, so you do not have to copy a client ID or secret.

### Register the Speakeasy integration {#register-speakeasy-integration}

1. In the Gong sidebar, click **Admin center**.
2. In the **Settings** tab, under **Ecosystem**, click **MCP**.
3. Open the **MCP servers** tab and click **New MCP server integration**.
4. In **Integration name**, enter `Speakeasy AI Control Plane`.
5. In **Redirect URI**, enter the following URL on its own line:

   ```
   {{ gram.oauth.callback_url }}
   ```

6. Under **Registration type**, select **Automatic**.
7. Under **Authorization context**, select **Personal access** so each person can access only the data their Gong permissions allow. Do not select **Shared access** for this setup.
8. Click **Save**. Gong does not let you change the registration type or authorization context after you save.

<!-- screenshot: Gong's New MCP server integration form with the redirect URI, Automatic registration, and Personal access selected -->

If Gong rejects the connection because of a redirect URI mismatch, [edit the integration](https://help.gong.io/docs/manage-mcp-server-integrations) and check that **Redirect URI** matches the Speakeasy callback exactly.
