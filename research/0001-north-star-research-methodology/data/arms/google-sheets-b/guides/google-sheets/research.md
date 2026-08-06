---
research_version: 1
slug: google-sheets
researched_at: 2026-07-31T20:38:49Z
---

# Google Sheets — Research Dossier

Google's current, purpose-built **Configure the Sheets MCP server** page is the north star. It was last updated 2026-07-27 UTC and describes a Google-hosted remote MCP server. The service is in **Developer Preview** and requires participation in the Google Workspace Developer Preview Program.

## Server facts

- **Remote URL:** `https://sheetsmcp.googleapis.com/mcp/v1`.
- **Transport:** HTTP, represented as `streamable-http` in Metadata. Google's north star labels the transport **HTTP**. A direct MCP `initialize` POST to the documented URL on 2026-07-31 returned an MCP JSON-RPC response using protocol version `2025-03-26`, confirming that the URL is a live HTTP MCP endpoint.
- **Authentication:** OAuth 2.0 using a manually registered web client. Google explicitly says its Google and Google Cloud remote MCP servers do not support Dynamic Client Registration or OAuth Client ID Metadata Documents. The Speakeasy AI Control Plane therefore needs a **Client ID** and **Client Secret** created in the Google Cloud console.
- **Authorization:** The MCP server acts with the signed-in user's permissions and Google Workspace data-governance controls. The consent configuration declares these four scopes:
  - `https://www.googleapis.com/auth/drive.readonly`
  - `https://www.googleapis.com/auth/drive.file`
  - `https://www.googleapis.com/auth/spreadsheets.readonly`
  - `https://www.googleapis.com/auth/spreadsheets`
- **Availability gate:** The server is a **Developer Preview**, available through the **Google Workspace Developer Preview Program**. Before setup, open `https://developers.google.com/workspace/preview`, select **Join the program**, sign in with the Google Workspace account that will participate, complete and submit the enrollment form, and wait for Google's acceptance email. The acceptance email is the provider-documented confirmation that the account has program access. A Google Cloud project is also required.
- **Project permissions:** Enabling each service requires `serviceusage.services.enable` on the project and `servicemanagement.services.bind` on the service. Google documents these as the permissions for the Service Usage `services.enable` method. The exact predefined role needed to configure Google Auth Platform and create the OAuth client is not stated in the fetched setup docs; see Open questions.
- **Security caveat during use:** Google warns that Sheets content can carry indirect prompt injection and that the MCP host can read, modify, and delete data available to the user. This is operational safety context, not an extra first-connect setup step.

## Credential flow

An administrator works in one Google Cloud project, enables both the **Google Sheets API** (`sheets.googleapis.com`) and **Google Sheets MCP API** (`sheetsmcp.googleapis.com`), configures Google Auth Platform, declares the four required scopes, and creates an OAuth client whose **Application type** is **Web application**.

Values needed by the Speakeasy AI Control Plane:

| Value | Origin |
| --- | --- |
| Client ID | Google displays it after the web OAuth client is created in {#create-oauth-client}. |
| Client Secret | Google displays it after the same client is created in {#create-oauth-client}. |
| Redirect URI | Enter `{{ gram.oauth.callback_url }}` directly in the OAuth client's **Authorized redirect URIs** > **URIs** field in {#create-oauth-client}. |

The north star demonstrates this registration flow for third-party MCP clients with client-specific callback URLs. For this Guide, the Speakeasy AI Control Plane is that client, so its callback template replaces the example callback URL. The Attach sheet later displays the substituted **Redirect URI** for confirmation.

For an **Internal** audience, users must belong to the Google Workspace organization associated with the project. If **Internal** is unavailable, the north star says to choose **External** and add intended users under **Audience** > **Test users**. Google notes that apps used only internally do not require further review for sensitive or restricted scopes; broader external deployment can invoke Google's app-review requirements. The documented test-user path is enough for first connection by listed users.

## Console walkthrough

The browser-only path starts by obtaining Developer Preview access. Before opening the Google Cloud console, go to `https://developers.google.com/workspace/preview`, select **Join the program**, sign in with the Google Workspace account that will participate, complete and submit the enrollment form, and wait for Google's acceptance email. Continue only after that email confirms acceptance.

If the operator does not already have a suitable Google Cloud project, they must obtain the project name from the Google Cloud project owner before continuing. Keep the same project selected throughout; API enablement, consent configuration, and OAuth credentials are project-scoped. The north star provides direct console links for both APIs, **Branding**, and client creation. Those links are the documented transition where a general console menu path is not supplied.

### Open the Google Cloud project {#open-google-cloud-project}

- Before opening the project selector, obtain the name of an existing suitable project from the Google Cloud project owner if the operator does not already have one.
- Sign in at `https://console.cloud.google.com/` and select that Google Cloud project from the project selector in the console header. The project is a documented prerequisite; Google does not state an exact selector label in the north star.
- Confirm that the operator can enable services and can open Google Auth Platform. Enabling requires `serviceusage.services.enable` on the project and `servicemanagement.services.bind` on the service.
- Values entered: none. Values copied: none.
- Screenshot note: the Google Cloud console header with the intended project selected; omit project identifiers from the capture.

### Enable the Google Sheets API {#enable-sheets-api}

- From the selected project, open Google's documented **Enable the APIs** link: `https://console.cloud.google.com/flows/enableapi?apiid=sheets.googleapis.com`.
- Use the enable flow for **Google Sheets API**. The provider page names the destination service and direct flow but does not state the final button label.
- Stay in the same project. After completion, proceed to the separate MCP service flow below.
- Values entered: none. Values copied: none.
- Screenshot note: the enable-API flow showing **Google Sheets API** and the selected project before confirmation.

### Enable the Google Sheets MCP API {#enable-sheets-mcp-api}

- Open Google's documented **Enable the MCP services** link: `https://console.cloud.google.com/flows/enableapi?apiid=sheetsmcp.googleapis.com`.
- Use the enable flow for **Google Sheets MCP API** in the same project. The provider page does not state the final button label.
- When the service is enabled, open `https://console.cloud.google.com/auth/branding`; this is the north star's **Go to Branding** transition into Google Auth Platform.
- Values entered: none. Values copied: none.
- Screenshot note: the enable-API flow showing **Google Sheets MCP API** and the selected project before confirmation.

### Configure the OAuth consent screen {#configure-oauth-consent}

- At **Google Auth Platform** > **Branding**, first determine whether the page says **Google Auth Platform not configured yet**.
- If it is not configured, click **Get Started** and complete the documented sequence:
  1. Under **App Information**, enter `Sheets MCP Server` in **App name**.
  2. In **User support email**, select an appropriate email address or Google group, then click **Next**.
  3. Under **Audience**, select **Internal** only if every intended user belongs to the Google Workspace organization associated with the project. Otherwise, select **External**, then click **Next**.
  4. Under **Contact Information**, enter an **Email address** that should receive project-change notifications, then click **Next**.
  5. Under **Finish**, review the **Google API Services User Data Policy**. If accepted, select **I agree to the Google API Services: User Data Policy**, then click **Continue** and **Create**.
- If Google Auth Platform was already configured, review the existing settings on **Branding**, **Audience**, and **Data Access** rather than running **Get Started**. Ensure its audience is suitable for the intended users.
- If **External** was selected, click **Audience**. Under **Test users**, click **Add users**, enter every user who must complete first connection, and click **Save**.
- From the resulting Google Auth Platform navigation, click **Data Access** > **Add or Remove Scopes**. This opens the scopes panel used in the next step.
- Values entered: app display name, support contact, audience, and notification contact. Obtain organizational contact choices from the application or cloud-security owner.
- Screenshot note: the **Audience** screen showing **Internal** or **External** and, when applicable, the **Test users** section; redact email addresses.

### Add the Google Sheets scopes {#add-google-sheets-scopes}

- In the **Add or Remove Scopes** panel, under **Manually add scopes**, paste these four scope URLs:
  - `https://www.googleapis.com/auth/drive.readonly`
  - `https://www.googleapis.com/auth/drive.file`
  - `https://www.googleapis.com/auth/spreadsheets.readonly`
  - `https://www.googleapis.com/auth/spreadsheets`
- Click **Add to Table**, then **Update**.
- Back on **Data Access**, click **Save**.
- Open `https://console.cloud.google.com/auth/clients/create`, Google's documented **Go to Create Client** transition.
- Values entered: the four provider-prescribed scope strings. Values copied: none.
- Screenshot note: the **Manually add scopes** area with all four Sheets/Drive scope URLs entered, before **Add to Table**.

### Create the OAuth client {#create-oauth-client}

- The direct link opens **Google Auth Platform** > **Clients** > **Create Client** in the selected project.
- Select **Web application** as **Application type**.
- Enter a recognizable **Name**, such as `Speakeasy AI Control Plane`.
- Under **Authorized redirect URIs**, click **+ Add URI** and enter `{{ gram.oauth.callback_url }}` in **URIs**.
- Before continuing, be ready to copy both generated values into a password manager or directly into the Speakeasy AI Control Plane.
- Click **Create**, then copy the displayed **Client ID** and **Client Secret**. These are the two credential fields used in {#connect-speakeasy-credentials}.
- Recovery: if the creation result is dismissed before the secret is captured, reopen the client from **Google Auth Platform** > **Clients**. Google's general credentials guide confirms that created OAuth clients remain listed under **OAuth 2.0 Client IDs**, but the fetched docs do not explicitly document the secret-redisplay behavior; do not rotate or create another secret unless the console requires it.
- Screenshot note: the **Create Client** form showing **Web application**, **Name**, and **Authorized redirect URIs**, with the callback value redacted.

## Speakeasy setup

Operator override: use the Custom remote server path because the Speakeasy MCP Catalog mapping for queries `google-sheets` and `google sheets` is unreliable or unsuitable. Render only the resolved Custom remote server path; do not mention or offer the catalog path. Metadata retains `speakeasy_add_server: custom-remote`.

### Add the server in Speakeasy {#add-server-in-speakeasy}

In the Speakeasy AI Control Plane sidebar, under **Connect**, select **Sources**, then click **Add Source**. Choose **Custom remote server**. On the **Add a custom remote MCP server** page, paste `https://sheetsmcp.googleapis.com/mcp/v1` into **Remote MCP server URL** and click **Add server**. This creates the hosted MCP server and opens its **Overview** page.

<!-- screenshot: the Add Source menu open on the Sources page, or the provider's catalog entry -->

### Connect your credentials {#connect-speakeasy-credentials}

From the server's **Overview**, open **Settings**. Under **Authentication**, click **Configure Manually**. In the **Attach Remote Identity Provider** sheet, set **Client Type** to **Manual**. The sheet shows a **Redirect URI** with a copy button; confirm that it matches the value substituted for `{{ gram.oauth.callback_url }}` in {#create-oauth-client}. Paste the **Client ID** and **Client Secret (optional)** copied in {#create-oauth-client}, then click **Attach Identity Provider**.

The Authentication Option is `oauth-client`, with manual client registration. Google does not support Dynamic Client Registration. No scope override is documented for the Speakeasy sheet; the four scopes are declared in Google Auth Platform during External setup.

<!-- screenshot: the Attach Remote Identity Provider sheet (Manual with Redirect URI); values redacted -->

Further-reading URL for the closing pointer: `https://developers.google.com/workspace/sheets/api/guides/configure-mcp-server`.

Canonical Speakeasy facts above come from `doctrine/speakeasy-setup.md`, observed for this Guide at `2026-07-31T20:38:49Z`.

## Open questions

- Google's setup docs do not state the exact Google Cloud predefined IAM role(s) required to configure Google Auth Platform and create the OAuth client. They do document the two permissions required to enable each API. Confirm project policy grants the operator access to Google Auth Platform, or involve the Google Cloud project owner.
- Google's API enable-flow docs provide direct links but do not name the final confirmation button in those flows. Follow the service-specific page for **Google Sheets API** and **Google Sheets MCP API** without relying on an undocumented button label.

## Provenance

### Source inventory and ruling

- North star: Google for Developers, **Configure the Sheets MCP server**. It backs the complete product-specific flow, URL, HTTP transport, OAuth model, service names, scopes, console labels, and Developer Preview gate.
- Google Workspace, **Google Workspace Developer Preview Program**, fills the enrollment and acceptance-verification path for that gate.
- Google Cloud, **Authenticate to Google and Google Cloud MCP servers**, fills the named authentication gap by confirming manual OAuth client registration and the lack of DCR/OAuth Client ID Metadata Documents.
- Google Workspace, **Configure the OAuth consent screen and choose scopes**, fills audience, test-user, and verification implications.
- Google Cloud Service Usage, **Access control with IAM**, fills the API-enable permission gap.
- Live endpoint observation confirms that the documented URL speaks MCP over HTTP. It does not replace provider documentation for authentication or setup.
- `doctrine/speakeasy-setup.md` backs only the Speakeasy AI Control Plane UI path and labels.

No material conflict was found. The general Google Workspace MCP page agrees with the product-specific north star on the Sheets URL, HTTP transport, OAuth, APIs, and scopes. The product-specific page wins as the current purpose-built procedure.

### Source records

- **Locator:** `https://developers.google.com/workspace/sheets/api/guides/configure-mcp-server`
  - **Observed:** `2026-07-31T20:38:49Z`
  - **Backs:** hosted remote URL; HTTP transport; OAuth 2.0; Developer Preview availability; required project; Sheets and Sheets MCP service enablement; consent flow; exact scope set; web-client creation fields and labels; manual Client ID and Client Secret; product behavior and security warning.
- **Locator:** `https://developers.google.com/workspace/guides/configure-mcp-servers`
  - **Observed:** `2026-07-31T20:38:49Z`
  - **Backs:** corroborating Sheets endpoint, transport, authentication, required APIs, scopes, and user-permission inheritance.
- **Locator:** `https://developers.google.com/workspace/preview`
  - **Observed:** `2026-07-31T20:38:49Z`
  - **Backs:** Developer Preview Program enrollment link, participating-account sign-in, application submission, and acceptance-email verification.
- **Locator:** `https://docs.cloud.google.com/mcp/authenticate-mcp`
  - **Observed:** `2026-07-31T20:38:49Z`
  - **Backs:** OAuth client ID/secret suitability for third-party applications; user-delegated access; explicit DCR and OAuth Client ID Metadata Document limitations.
- **Locator:** `https://developers.google.com/workspace/guides/configure-oauth-consent`
  - **Observed:** `2026-07-31T20:38:49Z`
  - **Backs:** Google Auth Platform navigation and labels; Internal/External audience behavior; test users; internal-app review behavior; consent-screen permanence.
- **Locator:** `https://developers.google.com/workspace/guides/create-credentials`
  - **Observed:** `2026-07-31T20:38:49Z`
  - **Backs:** general **Google Auth platform** > **Clients** web-client flow, **Authorized redirect URIs**, and continued listing under **OAuth 2.0 Client IDs**.
- **Locator:** `https://docs.cloud.google.com/service-usage/docs/access-control`
  - **Observed:** `2026-07-31T20:38:49Z`
  - **Backs:** `serviceusage.services.enable` and `servicemanagement.services.bind` permissions for enabling services.
- **Locator:** `https://sheetsmcp.googleapis.com/mcp/v1` (direct MCP `initialize` observation; no credentials supplied)
  - **Observed:** `2026-07-31T20:38:49Z`
  - **Backs:** live HTTP MCP behavior at the documented endpoint and protocol response `2025-03-26`.
- **Locator:** `doctrine/speakeasy-setup.md`
  - **Observed:** `2026-07-31T20:38:49Z`
  - **Backs:** fixed Speakeasy add-server and manual OAuth labels, transitions, credential attachment, and anchors.
