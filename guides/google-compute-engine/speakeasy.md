# Speakeasy setup

### Add the server in Speakeasy {#add-server-in-speakeasy}

In the Speakeasy AI Control Plane sidebar, under **Connect**, select **Sources**, then click **Add Source**.

Choose **3rd-party server**. On the **MCP Catalog** page, search for `Google Compute Engine` in **Search MCP servers...**, open the matched entry with **View**, and click **Add**. In the **Add to Project** dialog, click **Add to Project**.

This creates the hosted MCP server and opens its **Overview** page.

<!-- screenshot: the Add Source menu open on the Sources page, or the Google Compute Engine catalog entry -->

### Connect your credentials {#connect-speakeasy-credentials}

1. From the server's **Overview** page, open **Settings**.
2. Under **Authentication**, click **Configure Manually**. If
   **Use Discovered** is offered, choose **Configure Manually** anyway —
   manual configuration matches the client you created in
   [Create the OAuth client](external.md#create-oauth-client). This opens the
   **Attach Remote Identity Provider** sheet.
3. Set **Client Type** to **Manual**.
4. Confirm the **Redirect URI** the sheet shows matches the URL you
   entered under **Authorized redirect URIs** in
   [Create the OAuth client](external.md#create-oauth-client).
5. Paste the client ID from
   [Copy the client credentials](external.md#copy-client-credentials) into
   **Client ID**.
6. Paste the client secret into **Client Secret (optional)** — despite
   the label, Google requires the secret, so treat the field as
   required.
7. Click **Attach Identity Provider**.

<!-- screenshot: the Attach Remote Identity Provider sheet showing the Redirect URI and credential fields, values redacted -->

Each user who then connects signs in with their own Google account.
For their sign-in to succeed, they need the roles from
[Grant IAM roles](external.md#grant-iam-roles), and — while an External app's
publishing status is **Testing** — a listing under **Test users** in
[Configure the consent screen](external.md#consent-screen).

This guide covers setup only. For anything beyond it — billing, tool
behavior, limits — see Google's Compute Engine MCP documentation at
https://docs.cloud.google.com/compute/docs/use-compute-engine-mcp.
