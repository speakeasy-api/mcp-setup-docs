---
setup_version: 1
---

# Set up Egnyte

Sign in to your Egnyte domain with an administrator account. Before you begin, make sure you have:

- An Egnyte plan that includes the MCP Server. Available tools vary by plan: Gen 3 Platform plans without the AI Add-On get only file browsing, advanced search, file content, upload, download, and identity tools.
- OAuth 2.0 enabled for the Egnyte domain.
- An Egnyte user account for each person who will connect, with permission to the files and folders they need.

You create no credentials in Egnyte. Egnyte only lets approved apps connect, so you add the Speakeasy AI Control Plane as an allowed app.

### Allow Speakeasy to connect {#allow-speakeasy-app}

1. Open **Settings**.
2. Select **AI Powered Features**.
3. Select **MCP Server**. If there is no **MCP Server** page, the MCP Server is not available for your domain; contact your Egnyte account executive or Egnyte Support to enable it.
4. Turn on **Allow external LLM clients to connect to Egnyte via MCP** if it is off.
5. In the allowed apps, click **Add**.
6. Enter `Speakeasy AI Control Plane` as the client name. The description is optional.
7. Enter this value as the redirect URL:

   ```
   {{ gram.oauth.callback_url }}
   ```

8. Click **Save**. The custom app now appears in the list.
9. Make sure **Speakeasy AI Control Plane** is selected among the allowed apps. Leave the other allowed apps as they are, and leave **Other web-based AI Apps (unverified)** off.
10. Click **Save changes**. If a confirmation to revoke app access appears, you unchecked an allowed app; restore it unless you mean to revoke it.

<!-- screenshot: Settings > AI Powered Features > MCP Server with Allow external LLM clients to connect to Egnyte via MCP on and the allowed-apps list showing the Speakeasy custom app; a second capture of the custom-app dialog with the client name and redirect URL filled in -->

If a user's connection fails with an error saying access is restricted, AI Safeguards are blocking it. Update the policies under **Settings** > **Configuration** > **AI** > **AI Safeguards** so they allow the connection.

If users connect but see no Egnyte tools, return to **MCP Server** and check **Tool access**. **Restricted** with no users or groups in the list removes the tools from every non-admin user.
