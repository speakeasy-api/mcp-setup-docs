---
research_version: 1
slug: gmail
researched_at: 2026-08-20T19:49:41Z
---

# Gmail — Research Dossier

## Server facts

- Gmail operates a global remote MCP server at `https://gmailmcp.googleapis.com/mcp/v1`.
- Google describes the transport as HTTP. The endpoint is an HTTP MCP endpoint and the tool examples negotiate `application/json` and `text/event-stream`; represent it as `streamable-http` in Metadata.
- Authentication is OAuth 2.0 with a manually registered web-application client ID and client secret. Google and Google Cloud remote MCP servers do not support Dynamic Client Registration or OAuth Client ID Metadata Documents.
- The Gmail MCP server is in **Developer Preview** and requires membership in the Google Workspace Developer Preview Program. Before enrolling, an administrator who does not already have a Google Cloud project must ask the organization's Google Cloud administrator to provide an existing project and its project number, and to grant permission to enable services. Open the [Google Workspace Developer Preview Program page](https://developers.google.com/workspace/preview), submit its enrollment form with a Google Workspace account and the Google Cloud project number, and wait for Google to verify the account, add the applicant to the program Google Group, and register the project before continuing.
- Setup also requires permission to enable services in that Google Cloud project. Google's Service Usage documentation identifies **Service Usage Admin** (`roles/serviceusage.serviceUsageAdmin`) as the role needed to enable APIs. A project creator already has the needed permissions.
- The Google Cloud project must have both **Gmail API** (`gmail.googleapis.com`) and **Gmail MCP API** (`gmailmcp.googleapis.com`) enabled.
- The OAuth consent configuration must allow these two Gmail scopes:
  - `https://www.googleapis.com/auth/gmail.readonly`
  - `https://www.googleapis.com/auth/gmail.compose`
- Google documents no paid plan requirement for the Gmail MCP server. The Developer Preview membership gate is the material availability restriction.

## Credential flow

An administrator enables the Gmail and Gmail MCP APIs in the allowlisted Google Cloud project, configures the project's Google Auth consent settings, and creates an OAuth client with **Application type** set to **Web application**. In that client, the administrator adds `{{ gram.oauth.callback_url }}` under **Authorized redirect URIs** by clicking **+ Add URI**. The resulting **Client ID** and **Client Secret** are pasted into the Speakeasy AI Control Plane's manual OAuth sheet.

Google's Gmail MCP page documents the same client-creation flow for other MCP hosts, each with that host's callback URI. The Speakeasy callback template is therefore the per-client value used in the documented **Authorized redirect URIs** field. Google Cloud's support documentation says the full client secret is visible and downloadable only at creation; store it securely before closing the dialog.

## Console walkthrough

Start at the [Google Cloud console](https://console.cloud.google.com/) with the Developer Preview–registered project selected in the project selector. The API Library flow leads from selecting an API to its detail page and **Enable** action. The Gmail setup page also supplies direct **Enable the APIs** and **Enable the MCP services** links.

### Enable the Gmail API {#enable-gmail-api}

- Open the Google Cloud console **APIs & Services** > **API Library** page and confirm the intended project in the resource selector.
- Search **Search for APIs & Services** for `Gmail API`, select **Gmail API**, and click **Enable**.
- The Gmail MCP setup page's **Enable the APIs** link is an equivalent direct entry to the enable flow for `gmail.googleapis.com`.
- Screenshot note: capture the **Gmail API** detail page with the selected project visible and **Enable** ready to click.

### Enable the Gmail MCP API {#enable-gmail-mcp-api}

- Return to **APIs & Services** > **API Library**. Search **Search for APIs & Services** for `Gmail MCP API`, select **Gmail MCP API**, and click **Enable**.
- The Gmail MCP setup page's **Enable the MCP services** link is an equivalent direct entry to the enable flow for `gmailmcp.googleapis.com`.
- If the service is unavailable, confirm that the selected project is the project registered through the Google Workspace Developer Preview Program; public documentation makes preview registration a prerequisite.
- Screenshot note: capture the **Gmail MCP API** detail page with **Enable** and the selected project visible.

### Configure the OAuth consent screen {#configure-oauth-consent}

- In the Google Cloud console, open **Google Auth Platform** > **Branding**.
- If **Google Auth Platform not configured yet** appears, click **Get Started**. Under **App Information**, enter `Gmail MCP Server` in **App name**, choose your email address or an appropriate Google group in **User support email**, and click **Next**.
- Under **Audience**, choose **Internal**. If **Internal** is unavailable, choose **External**, then click **Next**.
- Under **Contact Information**, enter an **Email address** for project notifications and click **Next**.
- Under **Finish**, review the Google API Services User Data Policy. If accepted, select **I agree to the Google API Services: User Data Policy**, click **Continue**, then click **Create**. This returns the administrator to the configured Google Auth Platform.
- If **External** was selected, open **Audience**. Under **Test users**, click **Add users**, enter the email addresses that will authorize the first connection, and click **Save**.
- Open **Data Access** and click **Add or Remove Scopes**. Under **Manually add scopes**, paste these scopes, then click **Add to Table**:

  ```text
  https://www.googleapis.com/auth/gmail.readonly
  https://www.googleapis.com/auth/gmail.compose
  ```

- Click **Update** to return to **Data Access**, then click **Save**.
- If Google Auth Platform was already configured, retain the organization's approved branding and audience rather than replacing them; use **Audience** for test users when applicable and **Data Access** for the required scopes.
- Screenshot note: capture the **Data Access** scope panel with the two Gmail scope rows selected; do not capture user email addresses.

### Create the OAuth client {#create-oauth-client}

- From Google Auth Platform, open **Clients** and click **Create Client**.
- Set **Application type** to **Web application** and enter an organization-approved **Name**, such as `Speakeasy Gmail MCP`.
- Under **Authorized redirect URIs**, click **+ Add URI** and enter:

  ```text
  {{ gram.oauth.callback_url }}
  ```

- Before clicking **Create**, be ready to save the secret in an approved secret manager: Google shows and permits downloading the full client secret only at creation.
- Click **Create**. Copy the **Client ID** and **Client Secret** for the Speakeasy AI Control Plane, and store the secret securely before closing the creation result.
- Screenshot note: capture the client form showing **Web application** and the **Authorized redirect URIs** row, with any organization-specific values redacted.
- Recovery: if the creation result was closed before the full secret was saved, Google does not reveal it again. Reopen **Google Auth Platform** > **Clients**, confirm the same project is selected, and click the client under **OAuth 2.0 Client IDs**. Under **Client secrets**, find the missed secret, click **Disable**, and click the delete button next to the disabled secret. Click **Add Secret**, then immediately copy the new secret to the approved secret manager before continuing; use that new value in Speakeasy.

## Speakeasy setup

Per-guide values:

- Remote URL: `https://gmailmcp.googleapis.com/mcp/v1`
- Transport: `streamable-http` (the **Transport** field is read-only)
- Add-server path: Custom remote server only because the operator set `speakeasy_add_server: custom-remote`; the catalog result is overridden because its mapping is unreliable or unsuitable for this guide.
- Authentication Option: manual OAuth 2.0 (`gmail-oauth`); Google explicitly does not support DCR.
- **Client ID**: produced by [Create the OAuth client](#create-oauth-client).
- **Client Secret (optional)**: produced by [Create the OAuth client](#create-oauth-client); it is required for this documented Gmail flow even though the Speakeasy sheet's generic label says optional.
- Registered callback: `{{ gram.oauth.callback_url }}` in the OAuth client's **Authorized redirect URIs** field.
- Required allowed scopes: `https://www.googleapis.com/auth/gmail.readonly` and `https://www.googleapis.com/auth/gmail.compose`, configured in [Configure the OAuth consent screen](#configure-oauth-consent).
- Further reading: `https://developers.google.com/workspace/gmail/api/guides/configure-mcp-server`
- Provenance for the fixed Speakeasy UI flow: `doctrine/speakeasy-setup.md`, observed 2026-08-20T19:49:41Z.

### Add the server in Speakeasy {#add-server-in-speakeasy}

In the Speakeasy AI Control Plane sidebar, under **Connect**, select **Sources**, then click **Add Source**. Choose **Custom remote server**. On the **Add a custom remote MCP server** page, paste `https://gmailmcp.googleapis.com/mcp/v1` into **Remote MCP server URL** and click **Add server**. This creates the hosted MCP server and opens its **Overview** page.

<!-- screenshot: the Add Source menu open on the Sources page, or the provider's catalog entry -->

### Connect your credentials {#connect-speakeasy-credentials}

From the server's **Overview**, open **Settings**. Under **Authentication**, click **Configure Manually**. In the **Attach Remote Identity Provider** sheet, set **Client Type** to **Manual**. The sheet shows the **Redirect URI** with a copy button—the callback URL registered during External setup. Paste the **Client ID** and **Client Secret (optional)** from [Create the OAuth client](#create-oauth-client), then click **Attach Identity Provider**. Confirm the sheet's **Redirect URI** matches the `{{ gram.oauth.callback_url }}` value registered under **Authorized redirect URIs**; the template value is entered directly during External setup, rather than copied from this sheet. The Gmail flow requires the client secret despite the sheet's generic optional label.

Screenshot note: capture the manual **Attach Remote Identity Provider** sheet with the **Redirect URI** visible and credentials redacted.

This guide covers setup only. For anything beyond it — billing, tool behavior, limits — see [Gmail's MCP documentation](https://developers.google.com/workspace/gmail/api/guides/configure-mcp-server).

## Open questions

None. The public documentation identifies the endpoint, manual OAuth model, required APIs and scopes, current preview gate, console labels, and credential flow. The server documentation says HTTP rather than using the schema's exact `streamable-http` term; the endpoint's HTTP MCP behavior and response media types support that schema mapping.

## Provenance

### Source inventory

- Google for Developers (`developers.google.com`): Gmail MCP setup guide, Gmail MCP reference, Workspace Developer Preview Program, and general Workspace developer guidance. This was the primary developer/product documentation property. No usable `/llms.txt` index was published at the tested developer roots.
- Google Cloud Documentation (`cloud.google.com` / `docs.cloud.google.com`): Google MCP authentication and Service Usage administration. This supplied cross-product authentication limitations and permissions/UI details for enabling services. No usable `/llms.txt` index was published at the tested docs root.
- Google Cloud Platform Console Help (`support.google.com/cloud`): OAuth client administration and one-time client-secret visibility. The generic `support.google.com` root did not expose a product-specific `llms.txt`; it redirected to the support home page.

### Sources

- `https://developers.google.com/workspace/gmail/api/guides/configure-mcp-server` — observed 2026-08-20T19:49:41Z. Backs Developer Preview status; prerequisites; both required services; consent navigation, audience/test-user flow, exact scopes, and UI labels; web OAuth client creation; endpoint, HTTP transport description, OAuth authentication, client ID/secret flow, and primary further-reading URL. Page reported last updated 2026-08-19 UTC.
- `https://developers.google.com/workspace/gmail/api/reference/mcp` — observed 2026-08-20T19:49:41Z. Backs the global Gmail MCP endpoint and its status as the Gmail API MCP server.
- `https://developers.google.com/workspace/preview` — observed 2026-08-20T19:49:41Z. Backs Developer Preview enrollment requirements, the required Google Cloud project number, and the Google Workspace account / Google Cloud project verification and registration process.
- `https://docs.cloud.google.com/mcp/authenticate-mcp` — observed 2026-08-20T19:49:41Z. Backs manual OAuth client ID and secret support and the explicit lack of Dynamic Client Registration and OAuth Client ID Metadata Documents.
- `https://docs.cloud.google.com/service-usage/docs/enable-disable` — observed 2026-08-20T19:49:41Z. Backs **Service Usage Admin**, project selection, **APIs & Services** > **API Library**, **Search for APIs & Services**, API selection, and **Enable**.
- `https://support.google.com/cloud/answer/15549257?hl=en` — observed 2026-08-20T19:49:41Z. Backs **Google Auth Platform** > **Clients**, **Create Client**, the warning that the full client secret is visible/downloadable only when created, and the client-detail controls for disabling, deleting, and replacing a missed secret.
- `https://console.cloud.google.com/` — observed 2026-08-20T19:49:41Z. Official Google Cloud console entry URL.
- `doctrine/speakeasy-setup.md` — observed 2026-08-20T19:49:41Z. Backs fixed Speakeasy add-server and manual OAuth UI labels, transitions, anchors, and closing-pointer format.
- Operator note: Speakeasy MCP Catalog query `gmail` returned `overridden-custom-remote`; observed 2026-08-20T19:49:41Z. Backs the `speakeasy_add_server: custom-remote` override and Custom remote-only path because catalog mapping is unreliable or unsuitable.
