# Speakeasy setup

Use an account with access to **Sources** and **Authentication** in the Speakeasy AI Control Plane.

### Add the server in Speakeasy {#add-server-in-speakeasy}

1. In the Speakeasy AI Control Plane sidebar, under **Connect**, select **Sources**.
2. Click **Add Source**.

- If Google Sheets is in the catalog:
  1. Choose **3rd-party server**.
  2. On **MCP Catalog**, find Google Sheets with **Search MCP servers...**.
  3. Open its entry with **View**.
  4. Click **Add**.
  5. In **Add to Project**, click **Add to Project**.
- If Google Sheets is not in the catalog:
  1. Choose **Custom remote server**.
  2. On **Add a custom remote MCP server**, paste this URL into **Remote MCP server URL**:

     ```text
     https://sheetsmcp.googleapis.com/mcp/v1
     ```

  3. Click **Add server**.

Either path creates the hosted MCP server and opens its **Overview** page.

<!-- screenshot: The Add Source menu or Google Sheets catalog entry; project values redacted -->

### Connect your credentials {#connect-speakeasy-credentials}

1. From **Overview**, open **Settings**.
2. Under **Authentication**, click **Configure Manually**.
3. In **Attach Remote Identity Provider**, enter `https://accounts.google.com` in **Issuer URL** if the issuer is not already set.
4. If the endpoints are not already set, under **Endpoints**, click **Discover**. If discovery does not supply them, use the endpoint values below.
5. Set **Client Type** to **Manual**.
6. Confirm that **Redirect URI** matches `{{ gram.oauth.callback_url }}` from [Create the OAuth client](external.md#create-oauth-client).
7. In **Client ID**, paste the **Client ID** from [Create the OAuth client](external.md#create-oauth-client).
8. In **Client Secret (optional)**, paste the **Client Secret** from the same step.
9. In **Scope (override)**, set the four scopes below with the visible scope-entry controls:

   ```text
   https://www.googleapis.com/auth/drive.readonly
   https://www.googleapis.com/auth/drive.file
   https://www.googleapis.com/auth/spreadsheets.readonly
   https://www.googleapis.com/auth/spreadsheets
   ```

10. Click **Attach Identity Provider**.

If discovery does not supply the endpoints, use these values in the corresponding endpoint fields before you attach the identity provider:

Authorization endpoint:

```text
https://accounts.google.com/o/oauth2/v2/auth
```

Token endpoint:

```text
https://oauth2.googleapis.com/token
```

For **External Testing**, authorization and the refresh token expire seven days after consent. Another sign-in is then necessary.

At first connection, complete Google's browser sign-in and consent prompts with an [eligible account that has spreadsheet access](external.md#grant-user-access). This lets the client obtain the refresh token. The Speakeasy AI Control Plane automatically requests Google offline access and consent. You do not enter these parameters or copy a refresh token.

<!-- screenshot: Attach Remote Identity Provider with Manual client type, Google issuer, Redirect URI, credentials, and scopes; values redacted -->

This guide covers setup only. For billing, tool behavior, and limits, see [Google's Sheets MCP documentation](https://developers.google.com/workspace/sheets/api/guides/configure-mcp-server).
