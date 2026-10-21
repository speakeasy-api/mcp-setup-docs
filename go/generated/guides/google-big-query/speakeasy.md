# Speakeasy setup

### Add the server in Speakeasy {#add-server-in-speakeasy}

In the Speakeasy AI Control Plane sidebar, under **MCP Gateway**, select **MCP**, then click **Add new** to open **Add MCP server**.

1. Choose **From the catalog**.
2. On the **MCP Catalog** page, search for `BigQuery` in **Search MCP servers...**.
3. Open the **BigQuery** catalog entry.
4. Click **Add**. This opens the **Add to Project** dialog.
5. Under **Identity**, select **User Identity**. The dialog preselects **No Identity** for this entry, so change it.
6. Click **Add to Project**.
7. If the dialog offers a **Guardrails** step, finish it or click **Skip for now**.
8. When the dialog finishes, the result reads "Added, but disabled until identity is set up." Click **Finish setup** to open the server's **Settings**.

Speakeasy keeps the new server **Disabled** and says to finish setup in **Settings > Identity**. This is expected for BigQuery; continue with the next section.

<!-- screenshot: the BigQuery catalog entry's Add to Project dialog with User Identity selected -->

### Connect your credentials {#connect-speakeasy-credentials}

Open the server's **Settings** and find the **Identity** section.

1. Confirm **User Identity** is selected.
2. Under **Choose an identity provider**, confirm the preselected Google provider (`https://accounts.google.com`). A new provider shows **Will be created**. If a different provider is preselected, open the picker, search in **Search identity providers…**, and choose the Google provider.
3. Choose **Manual**. If **Existing client** is preselected, switch to **Manual** unless that client is the one created in [Create the OAuth client](external.md#create-oauth-client) with the BigQuery scope.
4. Paste the **Client ID** from [Copy the client credentials](external.md#copy-client-credentials) into **Client ID**.
5. Paste the **Client secret** from [Copy the client credentials](external.md#copy-client-credentials) into **Client secret**. Google requires this secret even though the field shows "Optional".
6. Under **Advanced > Scope**, enter this value. Do not leave **Scope** blank.

   ```
   https://www.googleapis.com/auth/bigquery
   ```

7. Click **Save**. If asked to confirm, click **Save changes**.

Turn the server on:

1. Open **Settings > Danger Zone > Server Availability**.
2. Turn on the switch (**Enable MCP server**) so it shows **Enabled**.

At first connection, complete Google's browser authorization with an account granted the roles in [Grant the BigQuery MCP roles](external.md#grant-bigquery-mcp-roles). An **External** app in **Testing** also requires that account under **Test users**.

<!-- screenshot: Settings > Identity with User Identity, the Google provider, and Manual selected; credentials redacted -->

This guide covers setup only. For anything beyond it — billing, tool behavior, limits — see [Google's BigQuery MCP documentation](https://docs.cloud.google.com/bigquery/docs/use-bigquery-mcp).
