---
research_version: 1
slug: google-sheets
researched_at: 2026-07-31T20:38:04Z
---

# Google Sheets — Research Dossier

## Server facts

- Google operates a dedicated Google Sheets remote MCP Server at `https://sheetsmcp.googleapis.com/mcp/v1`.
- Google describes the transport as HTTP. A public protocol probe against that URL successfully negotiated MCP protocol version `2025-06-18` over an HTTP `POST`, confirming the streamable-HTTP transport used in Metadata.
- The server uses OAuth 2.0 with a manually registered web client. The Speakeasy AI Control Plane needs the resulting **Client ID** and **Client Secret**.
- The server is in Developer Preview. Access requires membership in the Google Workspace Developer Preview Program. An applicant supplies a Google Workspace account and Google Cloud project information; after Google verifies the account and registers the project, Google says final confirmation normally arrives within a couple of days.
- A Google Cloud project is required. The project must have both the **Google Sheets API** (`sheets.googleapis.com`) and **Google Sheets MCP API** (`sheetsmcp.googleapis.com`) enabled.
- Google documents no paid plan requirement for the Sheets MCP Server. Google does not state the exact Google Cloud IAM roles needed to enable the services or configure OAuth on the MCP page.
- The MCP Server inherits the connected user's permissions and data-governance controls. OAuth consent requests four scopes: `https://www.googleapis.com/auth/drive.readonly`, `https://www.googleapis.com/auth/drive.file`, `https://www.googleapis.com/auth/spreadsheets.readonly`, and `https://www.googleapis.com/auth/spreadsheets`.

## Credential flow

An administrator uses one Developer Preview-registered Google Cloud project, enables the Sheets API and Sheets MCP API, configures the Google Auth Platform consent screen and the four required scopes, then creates an OAuth 2.0 client with **Application type** set to **Web application**. In **Authorized redirect URIs**, the administrator adds `{{ gram.oauth.callback_url }}` directly. The creation result supplies the **Client ID** and **Client Secret** that are pasted into the Speakeasy AI Control Plane.

Google's Sheets-specific page demonstrates this same client-registration flow for other MCP hosts, each with that host's callback URL. The callback template above is the Speakeasy-specific value prescribed by `doctrine/speakeasy-setup.md`; it substitutes to the **Redirect URI** shown later by the Control Plane.

## Console walkthrough

The transition-complete browser path is: open or create the Google Cloud project to be registered; join the preview program with that project's information and wait for registration; return to the Cloud console and select the registered project; use Google's direct enablement links for the two services; open **Google Auth Platform > Branding** and complete first-time configuration; open **Audience** if test users are needed; open **Data Access** and add scopes; then open **Clients > Create Client** to register the Control Plane callback and collect the credentials.

### Open the registered Google Cloud project {#open-cloud-project}

- Sign in at `https://console.cloud.google.com/` with an account that can manage the project to be registered for Developer Preview, then select that project from the project selector.
- If no project exists yet, open `https://console.cloud.google.com/projectcreate`. On **New Project**, enter the project name, choose the required organization or parent location, click **Create**, and select the new project.
- Use this project's information in the Developer Preview application in the next step.
- Transition note: Google's MCP page requires a Cloud project and its preview page requires the project in the application, but it does not spell out the project-selector clicks. Selecting the project before opening each direct service link is a flagged inference from the project-scoped Cloud console flow.
- Screenshot note: capture the Cloud console header with the project's name in the project selector; exclude identifiers if the capture policy treats them as sensitive.

### Join the Developer Preview Program {#join-developer-preview}

- Open `https://developers.google.com/workspace/preview` and select **Apply to join the Developer Preview Program**.
- Read and accept the linked **Program Terms**, then submit the application form with the requested Google Workspace account and the Google Cloud project information from the previous step. The account must be able to accept an invitation to a Google Group.
- Wait for Google's final confirmation that the Workspace account was verified and the Cloud project was registered. Google says the process should complete within a couple of days. Do not continue with an unregistered project because the Sheets MCP Server is a Developer Preview feature tied to the project supplied in the application.
- Return to `https://console.cloud.google.com/` and select the now-registered project from the project selector before continuing.
- Screenshot note: capture the Developer Preview page with the Sheets MCP Server listed under **MCP SERVERS** and the **Apply to join the Developer Preview Program** button visible; do not capture application answers.

### Enable the Google Sheets API {#enable-sheets-api}

- With the registered project selected, open Google's **Enable the APIs** link: `https://console.cloud.google.com/flows/enableapi?apiid=sheets.googleapis.com`.
- Confirm the selected project is the Developer Preview-registered project and enable the **Google Sheets API**. Google's generic API-enablement documentation names the final control **Enable**.
- The next screen is reached by opening the separate MCP-service enablement link below; Google does not document an in-console click between these two flows.
- Screenshot note: capture the **Google Sheets API** enablement page with the project name and **Enable** control visible.

### Enable the Google Sheets MCP API {#enable-sheets-mcp-api}

- Open Google's **Enable the MCP services** link: `https://console.cloud.google.com/flows/enableapi?apiid=sheetsmcp.googleapis.com`.
- Confirm the selected project and enable the **Google Sheets MCP API**. The underlying service name is `sheetsmcp.googleapis.com`; the generic final control is **Enable**.
- Next, open `https://console.cloud.google.com/auth/branding` for the same project.
- Screenshot note: capture the **Google Sheets MCP API** enablement page with the project name and **Enable** control visible.

### Configure the OAuth consent screen {#configure-oauth-consent}

- In the Google Cloud console, go to **Google Auth Platform > Branding**, or use `https://console.cloud.google.com/auth/branding`.
- If **Google Auth Platform not configured yet** appears, complete first-time configuration: click **Get Started**; under **App Information**, enter `Sheets MCP Server` in **App name**, select your email address or an appropriate Google group in **User support email**, and click **Next**; under **Audience**, select **Internal** or, if unavailable, **External**, then click **Next**; under **Contact Information**, enter an **Email address** for project-change notifications and click **Next**; under **Finish**, review the Google API Services User Data Policy and, if accepted, select **I agree to the Google API Services: User Data Policy**, click **Continue**, then click **Create**.
- If **External** was selected during first-time configuration, open **Audience**. Under **Test users**, click **Add users**, enter the intended users' email addresses, and click **Save**. This returns to the configured Google Auth Platform, from which **Data Access** is available.
- If Google Auth Platform is already configured, open **Audience**. If **User type** is **External** and **Publishing status** is **Testing**, under **Test users**, click **Add users**, enter the intended Google account's email address, and click **Save**. Then continue at **Add the Google Sheets scopes**.
- Screenshot note: capture the first-time **Google Auth Platform not configured yet** state with **Get Started**, or the configured **Branding** page. Do not capture email addresses.

### Add the Google Sheets scopes {#add-google-sheets-scopes}

- In Google Auth Platform, select **Data Access**, then **Add or Remove Scopes**.
- In the panel, under **Manually add scopes**, paste these four values:
  - `https://www.googleapis.com/auth/drive.readonly`
  - `https://www.googleapis.com/auth/drive.file`
  - `https://www.googleapis.com/auth/spreadsheets.readonly`
  - `https://www.googleapis.com/auth/spreadsheets`
- Click **Add to Table**, then **Update**.
- Back on **Data Access**, click **Save**. Then open **Clients > Create Client**, or go directly to `https://console.cloud.google.com/auth/clients/create`.
- Screenshot note: capture the scope panel with **Manually add scopes**, **Add to Table**, and the four entered scope rows visible.

### Create the OAuth client {#create-oauth-client}

- In Google Auth Platform, open **Clients > Create Client**.
- Select **Web application** as the application type and enter an administrator-chosen **Name** (for example, `Speakeasy Google Sheets`).
- In **Authorized redirect URIs**, click **+ Add URI** and enter `{{ gram.oauth.callback_url }}` in the **URIs** field.
- Click **Create**. Copy the resulting **Client ID** and **Client Secret** for the Speakeasy AI Control Plane. Google's page tells the reader to copy both values after creation but does not describe a one-time-only display or a first-connect recovery procedure.
- Screenshot note: capture the create-client form with **Web application**, **Authorized redirect URIs**, and the template callback visible; redact any created credential values.

## Speakeasy setup

Catalog lookup was reported **absent**, so only the Custom remote server path is rendered. Do not include a catalog alternative or a catalog-presence open question.

### Add the server in Speakeasy {#add-server-in-speakeasy}

In the Speakeasy AI Control Plane sidebar, under **Connect**, select **Sources**, then click **Add Source**. Choose **Custom remote server**. On **Add a custom remote MCP server**, paste `https://sheetsmcp.googleapis.com/mcp/v1` into **Remote MCP server URL** and click **Add server**. This creates the hosted MCP server and opens its **Overview** page.

Screenshot note: capture the **Add a custom remote MCP server** page with the Google Sheets remote URL entered.

### Connect your credentials {#connect-speakeasy-credentials}

From the server's **Overview**, open **Settings**. Under **Authentication**, click **Configure Manually**. In **Attach Remote Identity Provider**, set **Client Type** to **Manual**. The sheet displays a **Redirect URI** with a copy button; confirm it matches the `{{ gram.oauth.callback_url }}` value registered in [Create the OAuth client](#create-oauth-client). Paste the **Client ID** and **Client Secret (optional)** produced by that step, then click **Attach Identity Provider**.

The four Google scopes recorded above are required for the provider client. Google's public MCP documentation does not state that the MCP Server publishes discoverable OAuth metadata, so use **Configure Manually**, not **Use Discovered**.

Screenshot note: capture **Attach Remote Identity Provider** with **Client Type** set to **Manual** and all credential values redacted.

This guide covers setup only. For anything beyond it — billing, tool behavior, limits — see Google's MCP documentation at https://developers.google.com/workspace/sheets/api/guides/configure-mcp-server.

## Open questions

- Google's public Developer Preview documentation does not publish the application form's exact field labels or submission-control label. The walkthrough therefore describes the requested Google Workspace account and Google Cloud project information without inventing console labels.
- Which exact Google Cloud IAM roles or permissions does an administrator need to enable both APIs and configure Google Auth Platform? Google's public Sheets MCP page does not specify them.
- Does Google expose OAuth protected-resource metadata at another well-known URL that would allow **Use Discovered**? A public request to `https://sheetsmcp.googleapis.com/.well-known/oauth-protected-resource` did not return metadata, and the provider documentation only describes manually registered OAuth clients.

## Provenance

### Source inventory sweep

- Google for Developers / Google Sheets developer documentation (`developers.google.com/workspace/sheets`): primary product-specific MCP documentation found and used. No `/llms.txt` index was available at either `https://developers.google.com/llms.txt` or `https://developers.google.com/workspace/llms.txt` (both returned 404 pages).
- Google Workspace developer guides (`developers.google.com/workspace`): shared MCP, OAuth consent, project-creation, and Developer Preview documentation found and used.
- Google Cloud documentation (`cloud.google.com`, canonicalized to `docs.cloud.google.com`): generic API enablement and project-management documentation found and used for UI labels omitted by the MCP page.
- Google Workspace Admin Help (`support.google.com/a`): support property found through the MCP page's troubleshooting link, but it only covers later OAuth-log investigation and was not used in the first-connection walkthrough. `https://support.google.com/llms.txt` redirected to the general Google Help portal rather than an index.
- Google Workspace product site (`workspace.google.com`): product property found; no MCP setup documentation or `/llms.txt` index was found there.

### Source records

- `https://developers.google.com/workspace/sheets/api/guides/configure-mcp-server` — observed 2026-07-31T20:38:04Z. Backs Developer Preview status, requirements, service names, remote URL, HTTP transport, OAuth model, consent-screen labels and values, required scopes, client type and credential labels, and last-updated state (2026-07-27 UTC).
- `https://developers.google.com/workspace/guides/configure-mcp-servers` — observed 2026-07-31T20:38:04Z. Corroborates the product-specific URL, HTTP transport, OAuth model, project service enablement, Google Sheets scopes, and manual OAuth client flow.
- `https://developers.google.com/workspace/preview` — observed 2026-07-31T20:38:04Z. Backs Developer Preview application requirements, Google Group requirement, project registration, expected couple-of-days confirmation, program terms, and the Sheets MCP Server's inclusion in the preview.
- `https://developers.google.com/workspace/guides/configure-oauth-consent` — observed 2026-07-31T20:38:04Z. Corroborates **Google Auth platform > Branding**, **Get Started**, first-time consent configuration labels, **Audience**, **User type**, **External**, **Publishing status**, **Testing**, test-user controls, and **Data Access** behavior.
- `https://cloud.google.com/resource-manager/docs/creating-managing-projects` — observed 2026-07-31T20:38:04Z. Backs **New Project**, project name/organization selection, **Create Project**, and **Create** labels.
- `https://cloud.google.com/endpoints/docs/openapi/enable-api` — observed 2026-07-31T20:38:04Z. Backs the generic API enablement flow's **Enable** label and need to use the intended project.
- `https://sheetsmcp.googleapis.com/mcp/v1` — observed 2026-07-31T20:38:04Z. A no-credential MCP `initialize` POST returned HTTP 200 with protocol version `2025-06-18`, confirming that the documented URL is live and supports streamable HTTP. No secret or user data was sent.
- `https://sheetsmcp.googleapis.com/.well-known/oauth-protected-resource` — observed 2026-07-31T20:38:04Z. Public probe did not return OAuth protected-resource metadata; backs the uncertainty and conservative manual-configuration decision.
- `doctrine/speakeasy-setup.md` — observed 2026-07-31T20:38:04Z. Backs fixed Speakeasy anchors, labels, Custom remote path selected from the operator's `absent` catalog result, callback template behavior, and manual OAuth attachment flow.
