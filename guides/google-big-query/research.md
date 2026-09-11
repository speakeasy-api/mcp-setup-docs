# Google BigQuery — Research Dossier

## Research status

Complete for the selected setup path. Observed: 2026-09-11. This recovery reuses the completed, sourced reports from the interrupted trial. It does not use the original guide as evidence. The original Topic 3 dispatch failed and its report was empty. A new Topic 3 session completed that research. The Topic 4 compatibility check used follow-up round 1. The final Topic 1 authority audit used round 2, after authentication selection. Both checks are complete.

Identity: Google BigQuery remote MCP server. Slug: `google-big-query`. Mode: update. Destination: `/workspace/guides/google-big-query/`. Reader: `doctrine/personas/it-admin.md`. Client: Speakeasy AI Control Plane. Use ASD-STE100 Simplified Technical English. Preserve technical terms and exact UI labels.

## Server facts

- Requested remote: `https://bigquery.googleapis.com/mcp`. Shared endpoint; no tenant variables. Google documents HTTP. The client metadata uses `streamable-http` for its remote connection, per the client doctrine. The endpoint gate does not depend on proof of that transport name. Sources: T5-01–03; `doctrine/speakeasy-setup.md`, Per-guide values.
- Enable the BigQuery API if needed. This enables the remote MCP server. New projects have this API enabled automatically. Do not add a separate MCP enablement command. Sources: T1-03, T2-01, T5-03.
- Billing is optional for the documented sandbox procedure, not for all BigQuery workloads. Sources: T1-08, T2-02.
- The Data Transfer, Migration and Cloud CLI servers are separate services. They are not required for this connection. T5-05–06 preserve their addresses and differences in the evidence below.
- Manual OAuth is selected. Google does not support DCR or OAuth Client ID Metadata Documents for these servers. A static bearer token is documented but expires after one hour by default. It is not selected. No local process, bridge, ADC or service-account setup is included. Sources: T4-01, T4-07–08.
- Use the custom remote add-server path. Set `speakeasy_add_server: custom-remote` and `tenanted: false`. This explicitly selects the researched service without depending on an unverified catalog mapping.

## Credential flow

The OAuth administrator creates a Web application client in the selected Google Cloud project. Use OAuth Config Editor (`roles/oauthconfig.editor`) or equivalent permissions, not broad Editor by default. The administrator registers `{{ gram.oauth.callback_url }}` under **Authorized redirect URIs**. The repository renders this template as the callback URL. Its value must match the later **Redirect URI** exactly.

The administrator copies the client ID and client secret to secure storage. The secret is shown only once. The Speakeasy AI Control Plane receives both through Manual OAuth. Use issuer `https://accounts.google.com` and scope `https://www.googleapis.com/auth/bigquery`. The client sends `access_type=offline` and `prompt=consent` automatically, stores the refresh token encrypted and refreshes upstream access on demand. These are client functions, not additional user setup actions. Sources: T4-01–06 and C1–C6 below.

The connecting user supplies Google consent. That user also needs MCP and BigQuery permissions. OAuth scope approval does not grant IAM access. Internal applications require an organization-associated project and users in that organization. Otherwise, the selected External Testing path requires listed test users. It permits up to 100 test users. Its authorization and refresh token expire after seven days. Another sign-in is then required. Production publication and verification are not part of this trial path. Do not imply that an Internal refresh token lasts indefinitely; expiration, revocation or organization policy can require another sign-in. Sources: T2-04, T3-01–07, T4-06.

## Canonical setup actions and authority

Each row combines repeated topic procedures into one action. The complete reports below retain their sources, dates, quotations and conditions. Final audit: T1 recovery report, Final action audit.

| Action | Provider anchor | Requirements and evidence | Actor and access recipient |
| --- | --- | --- | --- |
| A1 | enable-bigquery-api | T1-01, T1-03, T1-08; T2-01–02; T5-01–03 | Project user selects an existing project. A person with `serviceusage.services.enable`, such as Service Usage Admin, enables the API if needed. The project receives service access. |
| A2 | grant-user-access | T1-04, T1-06, T1-09; T3-01–04 | Project IAM Admin or equivalent manages project grants. A resource access administrator with the required grant permissions manages narrower data grants. The connecting identity receives access. |
| A3 | configure-oauth-consent | T1-05, T1-10; T2-04; T3 audience findings; T4-06 | OAuth Config Editor or equivalent configures the application and test users. A person authorized to bind the organization must cover the required agreement. |
| A4 | create-oauth-client | T1-05; T2-03; T4-02 | OAuth administrator creates the client and registers the callback for this connection. |
| A5 | copy-client-credentials | T1-05; T4-02 | OAuth administrator copies the displayed client ID and secret to secure storage for the connection. |
| A6 | add-server-in-speakeasy; connect-speakeasy-credentials | T4-01–06; T5-01; C1–C6; client doctrine | A person with client configuration access adds the source and credentials. The intended Google user grants consent. |
| Conditional policy help | Opening prose, not a new step | T1-07; T2-05; T3 policy findings | Ask the applicable policy owner to approve access if an existing IAM or application restriction blocks this connection. Do not require a routine deny-policy change. |

Do not require Owner, broad Editor, Billing Account Administrator or Organization Administrator for all setup. Distinguish setup authority from permission to use the server. Selecting an existing project does not require Project Creator. Dataset-level BigQuery Data Owner is one documented option to manage dataset access. Do not grant it project-wide merely to support a narrower grant. Resource grant permissions are listed in T1-09. Agreement authority does not follow from an IAM role.

## Console walkthrough

Use the provider's documented level of detail. Do not invent navigation or block writing on missing screenshot details. Console sign-in: `https://console.cloud.google.com/`. Official service procedure: `https://docs.cloud.google.com/bigquery/docs/use-bigquery-mcp`.

### Enable the BigQuery API {#enable-bigquery-api}

Select the existing project. Use **Enable the API** in the BigQuery MCP documentation to enable the BigQuery API if necessary. This is the documented activation procedure. Billing is optional for the sandbox. Sources: A1 and T1-03. Screenshot note: the selected project and BigQuery API status; redact project identifiers.

### Give users access {#grant-user-access}

Ask the applicable access administrator to give the connecting identity **MCP Tool User** (`roles/mcp.toolUser`) and **BigQuery Job User** (`roles/bigquery.jobUser`) on the project. Give **BigQuery Data Viewer** (`roles/bigquery.dataViewer`) on the approved data resources. The documented project-level grant is also an option. Equivalent existing permissions can satisfy access. Other operations can need more permissions. Do not grant permissions for unrelated tasks. Obtain the project ID, identity and approved datasets from their owners. Sources: A2. The provider's role-grant direction is sufficient; do not invent extra console labels. Screenshot note: intended identity and approved roles, with user and project values redacted.

### Configure OAuth consent {#configure-oauth-consent}

If Google Auth platform is not configured, use **Get Started**. Under **App Information**, enter **App name** and **User support email**, then **Next**. Under **Audience**, select Internal if the project and users qualify. Otherwise, use External Testing for this setup. Under **Contact Information**, enter the contact **Email address**, then **Next**. Obtain these values and the audience decision from the application owner.

Under **Finish**, review the policy. An authorized person can select **I agree to the Google API Services: User Data Policy**, then **Continue** and **Create**. Otherwise, obtain approval or help from the organization's authorized representative. For External Testing, use **Audience > Test users > Add users**, enter the connecting users and select **Save**. For use outside the Workspace organization, use **Data Access > Add or Remove Scopes**, select `https://www.googleapis.com/auth/bigquery` and save the configuration. State the seven-day and 100-user limits. Sources: A3; T2-04; T1-10. Screenshot note: audience and BigQuery scope; redact email addresses.

### Create the OAuth client {#create-oauth-client}

Open **Google Auth Platform > Clients > Create client**. Select the project if prompted. Set **Application type** to **Web application**. Enter an application **Name** from the application owner. Under **Authorized redirect URIs**, select **+ Add URI** and enter `{{ gram.oauth.callback_url }}`. Select **Create**. Authorized JavaScript origins do not apply to this server-side path. Sources: A4; T4-02; C6. Screenshot note: Web application type and callback field, with client values redacted.

### Copy the client credentials {#copy-client-credentials}

Copy the client ID and **Client secret** from the created OAuth client. Save them securely. The client secret can be copied only once. Do not include renewal or rotation steps. Use both values in `speakeasy.md#connect-speakeasy-credentials`. Sources: A5. Screenshot note: client result with all credential values hidden.

## Speakeasy setup

Per-guide values: remote `https://bigquery.googleapis.com/mcp`; custom remote only; manual OAuth; client ID and secret from `external.md#copy-client-credentials`; callback from `external.md#create-oauth-client`; issuer `https://accounts.google.com`; scope `https://www.googleapis.com/auth/bigquery`; final documentation pointer `https://docs.cloud.google.com/bigquery/docs/use-bigquery-mcp`.

### Add the server in Speakeasy {#add-server-in-speakeasy}

In the Speakeasy AI Control Plane sidebar, under **Connect**, select **Sources**, then **Add Source**. Choose **Custom remote server**. On **Add a custom remote MCP server**, enter `https://bigquery.googleapis.com/mcp` in **Remote MCP server URL**, then select **Add server**. This creates the hosted MCP server and opens its **Overview** page.

<!-- screenshot: Add Source and the custom remote URL field -->

### Connect your credentials {#connect-speakeasy-credentials}

From **Overview**, open **Settings**. Under **Authentication**, select **Configure Manually**, or **Use Discovered** when offered. In **Attach Remote Identity Provider**, supply **Issuer URL** `https://accounts.google.com` if needed. Under **Endpoints**, select **Discover** to fill the provider endpoints. Set **Client Type** to **Manual**. Set **Scope (override)** to `https://www.googleapis.com/auth/bigquery`. Leave **Audience (optional)** empty. Paste the **Client ID** and **Client Secret (optional)** from the provider setup. Although the secret field is labelled optional, this selected Google Web client uses its secret. Confirm that **Redirect URI** matches `{{ gram.oauth.callback_url }}` from the provider setup. Select **Attach Identity Provider**. Complete Google browser authorization with the intended user when the connection requests access. Do not add manual offline-access or refresh actions.

<!-- screenshot: Manual identity provider configuration; hide all credential values -->

Final line for `speakeasy.md`: This guide covers setup only. For billing, tool behavior, and limits, see [Google's BigQuery MCP documentation](https://docs.cloud.google.com/bigquery/docs/use-bigquery-mcp).

Client setup source: `doctrine/speakeasy-setup.md`, Per-guide values, Add-server path selection and The skeleton, observed 2026-09-11. Supplemental form labels and discovery source: `client/dashboard/src/pages/mcp/x/tabs/settings/sections/authentication/IssuerFormFields.tsx`, lines 66–200, 250–287 and 394–420 at commit `37d7a9025109f8bbeef1211924cb3e59e1646e59`. Exact excerpts: `Issuer URL`, `Discover`, `Scope (override)`, `Token Endpoint Auth Method`. No manual override of token authentication is required by the selected provider procedure.

## Research limitations

- No authenticated live connection was tested. Client tests were inspected, not run. Source evidence establishes the applicable upstream behavior; no concrete deployed-release mismatch was found.
- Separate release-note confirmation is incomplete. Maintained source pages showed no replacement notice. This does not block a concrete setup action.
- Organization IAM and application policies are not known. Ask the relevant policy owner for help only if a restriction applies.
- Manual OAuth documentation does not establish `x-goog-user-project` as mandatory. The static-token and ADC examples do specify it. Do not copy that alternative's header into the selected path or claim it is always unnecessary.
- External production publication and verification are not researched as a selected path. This guide supports Internal use when eligible or External Testing with its stated limits.
- Topic 4's phrase “Do not enter this placeholder” refers to the actual Google URL input. The guide must retain the repository callback template for rendering. This is a presentation reconciliation, not an authentication change.
- No operator decisions block drafting. No credentials were collected. No reviewer agents or reviewer-driven revision loop were used.

## Provenance

The reports below are the source inventory and requirement record. Each finding gives its topic, condition, source location, observation date and short quotation. The canonical table above maps these findings to setup actions. Superseded Topic 1 and Topic 4 reports remain in `.factory/trial/`; the complete updated reports below are authoritative for this dossier.

### Central client implementation evidence
# Client evidence

Observed: 2026-09-11. Official source commit: `37d7a9025109f8bbeef1211924cb3e59e1646e59`.
Source root: https://github.com/speakeasy-api/gram/tree/37d7a9025109f8bbeef1211924cb3e59e1646e59

- C1: `server/internal/remotesessions/interceptors/google.go`, lines 26–52. The issuer hostname must equal `accounts.google.com` (case-insensitive). Code: `q.Set("access_type", "offline")`; `prompts = append(prompts, "consent")`. This code adds offline access and consent to Google upstream authorization. The user does not add these parameters.
- C2: `server/internal/remotesessions/challenge.go`, lines 261–263 and 770–796. The challenge manager registers `interceptors.NewGoogle(logger)`. It uses `client.ExternalClientID`, sets the callback, PKCE and scopes, then calls `ic.ModifyAuthorize(ctx, q)` when the issuer matches. This is upstream remote authorization, not downstream client authorization or administrator sign-in. The interceptor does not require DCR. It applies to the manually configured remote session client and matching issuer. No feature flag gates this interceptor in this path.
- C3: `server/internal/remotesessions/challenge.go`, lines 950–964. Code: `m.enc.Encrypt([]byte(tok.RefreshToken))`. The callback encrypts the returned refresh token for the remote session.
- C4: `server/internal/remotesessions/tokenservice.go`, lines 453–486 and 551–602. Code: `m.refresher.RefreshNow(ctx, sess, resource, remotesessionmetrics.RefreshTriggerRequest)` and `form.Set("grant_type", "refresh_token")`. An active remote session with a stored, usable refresh token can refresh on demand. The server sends the grant to the configured upstream token endpoint with the client secret. This does not depend on a user action or a background refresh setting. Expired or revoked authorization can require another sign-in.
- C5: `server/internal/remotesessions/interceptors/google_test.go`, lines 14–91. Tests cover Google issuer matching, `access_type=offline`, consent insertion, prompt preservation and duplicate prevention. `server/internal/remotesessions/refreshsession_test.go`, lines 86–130, checks token refresh and persistence. `server/internal/remotesessions/tokenservice_concurrent_refresh_test.go` models concurrent on-demand refresh with a rotating upstream provider. These tests were inspected, not executed.
- C6: The token exchange and refresh are Go server operations in the files above. This path does not call Google APIs with client-side JavaScript. The conditional Google Authorized JavaScript origins setting does not apply to this path.

Applicability: manual upstream OAuth, issuer `https://accounts.google.com`, valid Google client ID and secret, BigQuery scope and a refresh token from consent. This is source evidence, not a live deployed connection test. No concrete source-to-release mismatch was found. The setup actions still come from `doctrine/speakeasy-setup.md`; do not add user actions for the automatic behavior.


---

## Topic and status

**Topic 5 — MCP endpoint and connection configuration: complete.**

Google documents a remote BigQuery MCP URL. This URL supports the requested connection path. No local process or bridge is required for this path. Related servers are separate options, not required connections.

**Observation date for all sources: 2026-09-11.**

## Findings

### T5-01 — Use the BigQuery remote MCP endpoint

- **Status:** Required.
- **Actor and scope:** The IT administrator configures the MCP client. The client connects to the Google-hosted BigQuery MCP server.
- **Documented values:**
  - Server name: `BigQuery MCP server`
  - Server URL: `https://bigquery.googleapis.com/mcp`
  - Transport: `HTTP`
- **Source:** https://docs.cloud.google.com/bigquery/docs/use-bigquery-mcp
- **Location:** “Configure an MCP client to use the BigQuery MCP server.”
- **Exact quotations:**
  - “Server URL or Endpoint: https://bigquery.googleapis.com/mcp”
  - “Transport: HTTP”
  - “In your AI application, look for a way to add or connect to a remote MCP server.”
- **Interpretation:** This is an MCP endpoint, not only a general API address. Use the documented URL directly.

### T5-02 — The documented address is shared

- **Status:** Required.
- **Actor and scope:** The administrator uses the fixed address in the client connection.
- **Documented action:** Enter `https://bigquery.googleapis.com/mcp`. The documented URL has no tenant, project, or region variable.
- **Source:** https://docs.cloud.google.com/mcp/supported-products
- **Location:** “Google Cloud MCP servers,” BigQuery row and introductory text.
- **Exact quotations:**
  - “These remote MCP servers run on Google infrastructure, and are accessible to AI application clients through their HTTP endpoints.”
  - BigQuery endpoint: “https://bigquery.googleapis.com/mcp”
- **Interpretation:** The setup instructions do not require the reader to obtain a tenant-specific address. This finding concerns the connection address, not project or location values used in tool calls.

### T5-03 — Enable the BigQuery API in the project

- **Status:** Required.
- **Actor and scope:** An authorized administrator enables the API for the Google Cloud project.
- **Documented action:** Enable the BigQuery API. Refer to Topic 2 for the full procedure and Topic 1 for authority.
- **Source:** https://docs.cloud.google.com/bigquery/docs/use-bigquery-mcp
- **Location:** Introduction; “Before you begin.”
- **Exact quotations:**
  - “The BigQuery remote MCP server is enabled when you enable the BigQuery API.”
  - “For new projects, the BigQuery API is automatically enabled.”
- **Interpretation:** The maintained product page makes MCP availability part of API enablement. It does not direct the reader to create a separate endpoint.

### T5-04 — Configure authentication separately from the fixed URL

- **Status:** Required for authenticated use.
- **Actor and scope:** The administrator configures authentication for the client. The connecting identity receives only the access permitted by Google authorization.
- **Documented action:** Select an authentication method and supply its required credentials.
- **Source:** https://docs.cloud.google.com/bigquery/docs/use-bigquery-mcp
- **Location:** “Configure an MCP client to use the BigQuery MCP server”; “BigQuery MCP OAuth scopes.”
- **Exact quotations:**
  - “Authentication details: your Google Cloud credentials, your OAuth Client ID and secret, or an agent identity and credentials”
  - “Which authentication details you choose depend on how you want to authenticate.”
  - Scope URI: “https://www.googleapis.com/auth/bigquery”
- **Interpretation:** The URL alone does not give access to BigQuery data. Topic 4 must establish the applicable OAuth configuration.

**Related platform restriction**

- **Source:** https://docs.cloud.google.com/mcp/authenticate-mcp
- **Location:** “Limitations.”
- **Exact quotation:** “Google and Google Cloud remote MCP servers don't support Dynamic Client Registration or OAuth Client ID Metadata Documents.”
- **Interpretation:** Client support for DCR does not make DCR available at this provider. Use the documented alternative after Topic 4 and the coordinator check it.

### T5-05 — BigQuery-related remote servers are separate services

- **Status:** Conditional. Select another server only when its functions are needed.
- **Actor and scope:** The administrator and coordinator select the server for the intended tasks.
- **Source:** https://docs.cloud.google.com/mcp/supported-products
- **Location:** “Google Cloud MCP servers,” named product rows.
- **Exact endpoint quotations and purpose evidence:**

| Server | Documented URL | Purpose and applicability |
|---|---|---|
| BigQuery | `https://bigquery.googleapis.com/mcp` | Requested server. Runs queries, gets metadata, and lists resources. |
| BigQuery Data Transfer Service (Preview) | `https://bigquerydatatransfer.googleapis.com/mcp` | Separate server for BigQuery data transfer operations. Not required for the requested query and metadata connection. |
| BigQuery Migration Service | `https://bigquerymigration.googleapis.com/mcp` | Separate server for BigQuery migration operations. Not a tenant variant of the requested server. |
| Cloud CLI Execution (Preview) | `https://cloudcli.googleapis.com/mcp` | Separate server that can execute supported `gcloud` and `bq` commands. The BigQuery guide names it for advanced BigQuery operations. |

**Purpose sources and quotations**

1. **BigQuery**
   - URL: https://docs.cloud.google.com/bigquery/docs/use-bigquery-mcp
   - Location: Introduction.
   - Quote: “running queries, getting metadata, and listing resources.”

2. **BigQuery Data Transfer Service**
   - URL: https://docs.cloud.google.com/bigquery/docs/reference/datatransfer/mcp
   - Locations: Introduction; “MCP Tools.”
   - Quotes:
     - “BigQuery DTS MCP server provides tools to interact with BigQuery DTS”
     - “create_transfer_config”
     - “Create a transfer configuration.”

3. **BigQuery Migration Service**
   - URL: https://docs.cloud.google.com/bigquery/docs/use-bigquery-migration-mcp
   - Location: Required roles.
   - Quotes:
     - “Use the BigQuery Migration Service”
     - “Migration Workflow Editor”
     - “roles/bigquerymigration.editor”

4. **Cloud CLI**
   - URL: https://docs.cloud.google.com/sdk/use-gcloud-mcp
   - Location: Introduction.
   - Quotes:
     - “The Cloud CLI remote MCP server provides a secure environment that lets you send natural language prompts to your AI application to execute command-line interface (CLI) commands on your behalf.”
     - “gcloud and bq commands are supported.”
   - Additional URL: https://docs.cloud.google.com/bigquery/docs/use-bigquery-mcp
   - Location: Introduction.
   - Quote: “To allow agents access to advanced BigQuery capabilities like scheduling, permission management, and reservation management, use the run_bq_command tool available under the Cloud CLI MCP server.”

**Interpretation:** These are separate services. They are not regional versions of the same BigQuery server. The requested setup can use the BigQuery server alone. Google also lists MCP servers for unrelated products; those servers are outside this BigQuery setup scope.

### T5-06 — Do not copy BigQuery setup to related servers

- **Status:** Conditional. Applies if the coordinator selects an additional service.
- **Actor and scope:** The administrator must configure each selected service and its access separately.
- **Documented differences:**
  - **Cloud CLI:** Its API is Cloud CLI Execution. The page states: “The Cloud CLI remote MCP server is enabled when you enable the Cloud CLI Execution API.”
    - Source: https://docs.cloud.google.com/sdk/use-gcloud-mcp
    - Location: Introduction.
  - **Migration:** The page lists `roles/bigquerymigration.editor`, not only ordinary BigQuery data roles.
    - Source: https://docs.cloud.google.com/bigquery/docs/use-bigquery-migration-mcp
    - Location: Required roles.
    - Quote: “Migration Workflow Editor (roles/bigquerymigration.editor)”
  - **Data Transfer:** Transfer creation can require data-source authorization and Secret Manager values.
    - Source: https://docs.cloud.google.com/bigquery/docs/reference/datatransfer/mcp
    - Location: `create_transfer_config`.
    - Quotes:
      - “Parameters allowed for Secret Manager must be set with Secret Manager.”
      - “Find your client_id and data_source_scopes from your data source definition.”
- **Interpretation:** An extra server requires a separate check of authentication, scopes, service enablement, and permissions. These optional differences do not block the requested BigQuery endpoint.

## Unresolved questions

### Non-blocking — Additional connection headers

The BigQuery connection section gives the URL, HTTP transport, and authentication choices. It does not list a mandatory non-authentication header or URL parameter.

- **Sources checked:** BigQuery setup page; Google Cloud supported-products page; shared authentication page.
- **Classification:** Non-blocking. The documented connection procedure supplies a concrete action. Do not turn this lack of documentation into a claim that every extra header is unnecessary.
- **Follow-up:** Topic 4 should report any quota-project or authentication header requirement from its authentication research.

### Non-blocking — Full setup details for optional services

The endpoint URLs and purposes of the related servers are established. Full scope and permission comparisons were not completed within the research time limit.

- **Affected action:** Adding an optional Migration, Data Transfer, or Cloud CLI connection.
- **Classification:** Non-blocking for the requested BigQuery server. Further research is needed if the coordinator selects one of these extra services.

### Non-blocking — Release-note confirmation

The maintained setup and supported-products pages were read live. No replacement notice was seen in the inspected content. Separate release-note confirmation was not completed.

- **Classification:** Non-blocking. No material endpoint question remains unresolved.

## Cross-topic dependencies

- **Topic 1:** Verify authority to enable the BigQuery API. Check role-grant authority separately.
- **Topic 2:** Use the current product statement that BigQuery API enablement enables the remote MCP server. Do not add a separate MCP enablement step without applicable evidence.
- **Topic 3:** Check connecting-user IAM access for the selected BigQuery project and resources.
- **Topic 4:** Use the documented BigQuery scope. Account for the shared restriction against DCR. Check any required authentication or quota-project headers.
- **Coordinator:** Use `https://bigquery.googleapis.com/mcp` for the requested remote source. Check manual OAuth, required OAuth parameters, and token refresh against client capabilities.
- **Coordinator:** Do not require the optional Data Transfer, Migration, Cloud CLI, or local MCP servers for the standard BigQuery connection. If an optional server is selected, send its service-specific setup to Topics 1–4.

---

## Topic and status

**Topic 2 — Organization-level setup: complete.**

The current BigQuery page gives a concrete project setup procedure. The shared MCP page gives a web application registration procedure. No blocking gap was found for these actions. OAuth compatibility checks remain with Topic 4 and the coordinator.

**Observation date for all sources: 2026-09-11.** Sources were read live. No provider settings or files were changed.

## Findings

### T2-01 — Enable the BigQuery API in the selected project

- **Status:** Required.
- **Actor:** An administrator with permission to enable APIs.
- **Access and scope:** The selected Google Cloud project receives BigQuery API and remote MCP availability.
- **Documented action and values:**
  - Sign in to Google Cloud.
  - Use the project selector to select or create the project.
  - Enable the BigQuery API.
  - The service name is `bigquery.googleapis.com`.
  - Obtain the project from the organization’s Google Cloud owner.
  - The product page has an **Enable the API** link. The shared page also documents `gcloud services enable SERVICE_NAME`.
- **Authority:** The product page identifies `serviceusage.services.enable`. It identifies **Service Usage Admin** (`roles/serviceusage.serviceUsageAdmin`) as a role that supplies this permission.

**Source 1:** https://docs.cloud.google.com/bigquery/docs/use-bigquery-mcp\
**Locations:** Introduction; “Before you begin”; “Roles required to enable APIs.”\
**Exact quotations:**
> “The BigQuery remote MCP server is enabled when you enable the BigQuery API.”

> “Enable the BigQuery API.”

> “For new projects, the BigQuery API is automatically enabled.”

> “To enable APIs, you need the serviceusage.services.enable permission.”

**Source 2:** https://docs.cloud.google.com/mcp/enable-disable-mcp-servers\
**Location:** “Enable a supported product.”\
**Exact quotations:**
> “To connect to a supported product through MCP, enable the product API”

> “For example, the BigQuery service name is bigquery.googleapis.com.”

**Interpretation:** Use API enablement as the current activation procedure. These maintained pages do not give a separate MCP activation action.

### T2-02 — Billing is optional for the documented BigQuery sandbox setup

- **Status:** Explicitly not required for the documented sandbox procedure. Other BigQuery use can require billing.
- **Actor:** The project administrator.
- **Access and scope:** The selected BigQuery project.
- **Documented action:** The reader can complete the product procedure without enabling billing or supplying a credit card. BigQuery supplies a sandbox for this path.

**Source:** https://docs.cloud.google.com/bigquery/docs/use-bigquery-mcp\
**Location:** “Before you begin.”\
**Exact quotation:**
> “Optional: Enable billing for the project. If you don't want to enable billing or provide a credit card, the steps in this document still work. BigQuery provides you a sandbox to perform the steps.”

**Interpretation:** Do not make billing a universal MCP setup prerequisite. The shared enablement page says to verify billing, but the more specific BigQuery page gives an explicit sandbox exception. This finding does not establish that the sandbox supports every intended query or workload.

### T2-03 — Register a web OAuth application for the manual OAuth path

- **Status:** Conditional. Applies when the coordinator selects OAuth with a client ID and client secret.
- **Actor:** The administrator who configures the Google OAuth application. Topic 1 must verify application configuration authority.
- **Access and scope:** The OAuth application in the selected Google Cloud project. Users authorize the application to access resources within their permissions and approved scopes.
- **Documented action and values:**
  - Open **Google Auth Platform > Clients > Create client**.
  - Select a project if prompted.
  - Set **Application type** to **Web application**.
  - Enter an application name in **Name**.
  - In **Authorized redirect URIs**, select **+ Add URI**. Enter the client-supplied callback URL.
  - For this client, the supplied callback value is `{{ gram.oauth.callback_url }}`. This value comes from the run input, not from Google.
  - Select **Create**.
  - In **OAuth 2.0 client created**, copy the **Client secret** from **Client secrets** and store it securely.
  - Retain the resulting client ID for client configuration.
- **Conditional field:** **Authorized JavaScript origins** applies to applications that use client-side JavaScript to access Google APIs. Obtain any necessary origin from the client owner. Do not invent one from the MCP URL.

**Source:** https://docs.cloud.google.com/mcp/set-up-authentication-mcp-servers\
**Locations:** “Authenticate with an OAuth 2.0 client ID and secret”; “Create an OAuth 2.0 client ID and secret” → “Web.”\
**Exact quotations:**
> “Generally, if your application runs on your machine, then select Desktop. If you access your application through the internet, then select Web.”

> “Your application's documentation should provide the redirect URL. Custom redirect URLs aren't supported.”

> “Applications that use client-side JavaScript to access Google's APIs must specify the authorized JavaScript Origins.”

> “In the Google Cloud console, go to Google Auth Platform > Clients > Create client.”

> “You can only copy it once. If you lose it, delete the secret and create a new one.”

**Interpretation:** A web OAuth client is the applicable registration type for the supplied hosted client. The coordinator must check the JavaScript-origin condition and the complete OAuth exchange.

### T2-04 — Configure the OAuth consent information and audience

- **Status:** Conditional. Applies to an OAuth application, including a new application for the manual OAuth path.
- **Actor:** The application administrator. Topic 1 must verify authority.
- **Access and scope:** The OAuth application and its permitted audience.
- **Documented action and values:**
  - Open **Google Auth platform > Branding**.
  - If the platform is not configured, select **Get Started**.
  - Under **App Information**, supply **App name** and **User support email**.
  - Select **Next**.
  - Under **Audience**, select the user type. Select **Next**.
  - Under **Contact Information**, supply an **Email address**. Select **Next**.
  - Under **Finish**, review the Google API Services User Data Policy. The documented procedure requires agreement before **Continue** and **Create**.
  - Obtain the name, support email, contact email, and audience decision from the application owner.
  - For the documented external test setup, open **Audience > Test users > Add users**. Enter the authorized test users and select **Save**.
  - For an application used outside the Google Workspace organization, open **Data Access > Add or Remove Scopes**. Select the necessary scopes and save.
- **Scope value:** The BigQuery MCP page identifies `https://www.googleapis.com/auth/bigquery`. Topic 4 must confirm the complete scope set.

**Source 1:** https://developers.google.com/workspace/guides/configure-oauth-consent\
**Locations:** Introduction; “Configure OAuth consent.”\
**Exact quotations:**
> “All apps using OAuth 2.0 require a consent screen configuration”

> “If you see a message that says Google Auth platform not configured yet, click Get Started”

> “If you selected External for user type, add test users”

> “If you're creating an app for use outside of your Google Workspace organization, click Data Access > Add or Remove Scopes.”

**Source 2:** https://docs.cloud.google.com/bigquery/docs/use-bigquery-mcp\
**Location:** “BigQuery MCP OAuth scopes.”\
**Exact quotation:**
> “https://www.googleapis.com/auth/bigquery”

**Interpretation:** App registration alone does not complete consent configuration. Audience and test-user settings affect which users can connect. External production publication and verification need a separate check if that path is selected.

### T2-05 — Existing MCP access policies must permit the intended client and service

- **Status:** Conditional. Applies when the organization or project has policies that restrict the intended connection.
- **Actor:** The IAM policy administrator. Topic 1 must verify authority before a policy change.
- **Access and scope:** The connecting principal, OAuth client, and BigQuery service in the applicable project, folder, or organization.
- **Documented action and values:**
  - Check the applicable IAM allow and deny policies.
  - Google documents restrictions by principal, service, tool, and OAuth client ID.
  - The BigQuery service value is `bigquery.googleapis.com`.
  - Obtain the OAuth client ID from **Google Auth Platform > Clients**.
  - If policy prevents the intended access, the policy owner must approve and make the necessary change. A new deny policy is not part of the basic connection procedure.

**Source:** https://docs.cloud.google.com/mcp/control-mcp-use-iam\
**Locations:** Introduction; “IAM deny policy attributes”; “Allow MCP use by Client ID.”\
**Exact quotations:**
> “For example, you can deny or allow access based on:”

> “The application's OAuth client ID.”

> “request.auth.oauth.client_id: the OAuth client ID.”

> “To view existing client IDs, in the Google Cloud console, go to Google Auth Platform > Clients.”

**Additional source:** https://docs.cloud.google.com/mcp/enable-disable-mcp-servers\
**Location:** “Optional security and safety configurations.”\
**Exact quotation:**
> “Google Cloud offers defaults and customizable policies to control the use of MCP tools in your Google Cloud organization or project.”

**Interpretation:** API enablement does not override IAM restrictions. The current instructions describe policy configuration as a security control, not a mandatory new policy for every connection.

### T2-06 — Grant connecting-user permissions separately from application setup

- **Status:** Required.
- **Actor:** An administrator authorized to grant the required access.
- **Access and scope:** The connecting principal and selected project.
- **Documented action:** The product page directs the administrator to grant:
  - **MCP Tool User** — `roles/mcp.toolUser`
  - **BigQuery Job User** — `roles/bigquery.jobUser`
  - **BigQuery Data Viewer** — `roles/bigquery.dataViewer`

**Source:** https://docs.cloud.google.com/bigquery/docs/use-bigquery-mcp\
**Location:** “Required roles.”\
**Exact quotations:**
> “ask your administrator to grant you the following IAM roles on the project where you want to use the BigQuery MCP server”

> “Additional BigQuery permissions might be required depending on the task.”

**Interpretation:** These are connecting-user requirements. They are not authority to create the OAuth application or change organization policies. Topic 3 owns their full treatment.

## Unresolved questions

- **Non-blocking — OAuth administration authority.** The shared MCP and consent pages give concrete actions, but the inspected sections do not establish the administrator roles for client creation and consent configuration. Topic 1 must verify these actions. Missing exact role evidence does not prevent use of the documented procedure.

- **Non-blocking — External production publication and verification.** The consent page supplies a test-user procedure and describes scope review categories. Full external production requirements were not established within the research period. Topic 4 must check publication status, verification, and token effects if the coordinator selects that audience. Do not present test mode as a durable production configuration.

- **Non-blocking — Other organization restrictions.** The inspected MCP pages establish IAM controls. Workspace third-party app controls and VPC Service Controls were not fully researched. No evidence in the ticket identifies such a restriction. Do not claim these controls are absent.

- **Non-blocking — Enrollment and release confirmation.** The maintained BigQuery and shared enablement pages give API enablement as the setup action. No separate enrollment action was found in the inspected sections. Separate release-note confirmation was not completed. This is not proof that no access-program requirement or relevant change exists.

## Cross-topic dependencies

- **Topic 1:** Use T2-01 for API enablement authority. Verify OAuth application, consent, policy-change, and role-grant authority separately.
- **Topic 3:** Use T2-06. Check user eligibility against the selected OAuth audience and any test-user list.
- **Topic 4:** Use T2-03 and T2-04. Check scopes, publication status, refresh tokens, and external-app verification.
- **Topic 5:** Use API enablement as the current activation procedure. The service name is not a replacement for the remote MCP URL.
- **Coordinator:** Select the final OAuth audience and setup path. Check callback handling, JavaScript-origin applicability, OAuth request parameters, and token refresh against client capabilities.
- **Coordinator:** Preserve the BigQuery sandbox billing exception. Do not add an unverified enrollment step or a separate MCP activation command.

---

## Topic and status

**Topic 3 — Connecting-user setup: complete.**

Google gives a concrete IAM procedure for user access to the BigQuery remote MCP server. Google also documents user limits for OAuth applications. No blocking gap remains for this topic.

**Observation date for all sources: 2026-09-11.**

## Findings

### T3-01 — Give the connecting identity permission to call MCP tools

- **Status:** Required.
- **Actor:** An administrator with permission to grant project IAM roles.
- **Access recipient:** The identity that the connection uses.
- **Scope:** The project where the identity will use the BigQuery MCP server.
- **Documented action and values:** Grant **MCP Tool User** (`roles/mcp.toolUser`). The required permission is `mcp.tools.call`. Obtain the project and identity from the project owner and connection owner.
- **Source:** https://docs.cloud.google.com/bigquery/docs/use-bigquery-mcp
- **Location:** “Required roles”; “Required permissions.”
- **Exact quotations:**
  - “ask your administrator to grant you the following IAM roles on the project where you want to use the BigQuery MCP server”
  - “Make MCP tool calls: MCP Tool User (`roles/mcp.toolUser`)”
  - “Make MCP tool calls: `mcp.tools.call`”
- **Additional source:** https://docs.cloud.google.com/iam/docs/roles-permissions/mcp
- **Location:** “MCP Tool User.”
- **Exact quotation:** “Gives permission to call tools on any MCP server enabled by the parent project.”
- **Interpretation:** This role permits MCP tool calls. It does not replace BigQuery data permissions. Its documented scope includes other MCP servers enabled by the same project.

### T3-02 — Give the connecting identity permission to run jobs and query data

- **Status:** Required for the documented BigQuery query setup.
- **Actor:** An administrator with permission to grant the applicable IAM roles.
- **Access recipient:** The same identity that the MCP connection uses.
- **Scope:** The project where BigQuery jobs run and the resources that the jobs read.
- **Documented action and values:** The MCP setup page directs the administrator to grant these project roles:
  - **BigQuery Job User** — `roles/bigquery.jobUser`
  - **BigQuery Data Viewer** — `roles/bigquery.dataViewer`
- **Source:** https://docs.cloud.google.com/bigquery/docs/use-bigquery-mcp
- **Location:** “Required roles”; “Required permissions.”
- **Exact quotations:**
  - “Run BigQuery jobs: BigQuery Job User (`roles/bigquery.jobUser`)”
  - “Query BigQuery data: BigQuery Data Viewer (`roles/bigquery.dataViewer`)”
  - “Run BigQuery jobs: `bigquery.jobs.create`”
  - “Query BigQuery data: `bigquery.tables.getData`”
  - “You might also be able to get these permissions with custom roles or other predefined roles.”
- **Interpretation:** The named roles are the documented setup path. Equivalent permissions can come from other roles. Do not grant duplicate roles if the identity already has the required permissions.

### T3-03 — Match data access to the resources that the user will query

- **Status:** Conditional. Applies when access must be limited to selected data, or when the data is outside the project used for jobs.
- **Actor:** The administrator or resource owner with authority to grant access to the selected resources.
- **Access recipient:** The connecting identity.
- **Scope:** The job project and the selected datasets, tables, views, or routines.
- **Documented action and values:** Use the resource owner’s project and dataset names to define access. **BigQuery Data Viewer** can be granted at a lower resource level than a project. **BigQuery Job User** cannot be granted at the dataset level.
- **Source:** https://docs.cloud.google.com/bigquery/docs/access-control
- **Locations:** “BigQuery Data Viewer”; “BigQuery Job User.”
- **Exact quotations:**
  - Data Viewer: “When granted on a dataset, this role grants these permissions”
  - Data Viewer: “Get (query), replicate, and export table data and create snapshots.”
  - Data Viewer: “Lowest-level resources where you can grant this role: Dataset”
  - Data Viewer also lists: “Table”, “View”, and “Routine”.
  - Job User: “Provides permissions to run jobs, including queries, within the project.”
  - Job User: “This role can only be granted on Resource Manager resources (projects, folders, and organizations).”
- **Interpretation:** Project-wide Data Viewer access is the MCP page’s direct procedure. The shared BigQuery reference supports more limited data access. Data Viewer also permits data operations beyond queries. The administrator must select the appropriate resource scope.
- **Authority note:** Topic 1 must check resource-level grant authority if the coordinator selects this narrower path. The project-level path has authority evidence in T3-04.

### T3-04 — An authorized administrator grants the individual IAM access

- **Status:** Required when the connecting identity does not already have sufficient access.
- **Actor:** A project IAM administrator, or another principal with equivalent permissions.
- **Access recipient:** The connecting user, service account, or other supported principal.
- **Scope:** The selected Google Cloud project.
- **Documented action:**
  1. Open the Google Cloud console **IAM** page.
  2. Select the project.
  3. For an existing principal, select **Edit principal**, then **Add another role**.
  4. For a new principal, select **Grant Access**, then enter the principal identifier.
  5. Select **Select a role** and find the required role.
  6. Select **Save**.
- **Required environment values:** Obtain the project and the principal identifier from their owners. For a Google user account, the identifier can be the user’s email address.
- **Source:** https://docs.cloud.google.com/iam/docs/granting-changing-revoking-access
- **Locations:** “Required roles”; “Grant a single IAM role” → “Console.”
- **Exact quotations:**
  - “To manage access to a project: Project IAM Admin (`roles/resourcemanager.projectIamAdmin`)”
  - “In the Google Cloud console, go to the IAM page.”
  - “Select a project, folder, or organization.”
  - “click Edit principal in that row, and click Add another role”
  - “click Grant Access, then enter a principal identifier”
  - “Click Select a role”
  - “Click Save.”
- **Interpretation:** The connecting user does not grant their own IAM access unless they also have grant authority. Project IAM Admin is one documented role for this action. It is not a required role for ordinary MCP users.

### T3-05 — Some tasks need additional BigQuery permissions

- **Status:** Conditional. Applies when the selected task needs permissions beyond the standard MCP query setup.
- **Actor:** An administrator or resource owner with the applicable grant authority.
- **Access recipient:** The connecting identity.
- **Scope:** The resources used by the selected task.
- **Documented action:** Check the BigQuery IAM reference for the task. Grant the required permissions at the appropriate resource level.
- **Source:** https://docs.cloud.google.com/bigquery/docs/use-bigquery-mcp
- **Location:** Text after “Required permissions.”
- **Exact quotation:** “Additional BigQuery permissions might be required depending on the task.”
- **Linked reference:** https://docs.cloud.google.com/bigquery/docs/access-control
- **Interpretation:** The three standard roles do not prove that every possible BigQuery operation is permitted. The ticket does not identify an additional operation that needs a separate grant.

### T3-06 — The connecting user must be eligible for the OAuth application audience

- **Status:** Conditional. Applies to an OAuth user connection.
- **Actor:** The application administrator selects the audience. The connecting user must meet that audience restriction.
- **Access recipient:** The Google user account that authorizes the application.
- **Scope:** The OAuth application’s Google Cloud project.
- **Documented action and values:**
  - For **Internal**, use an account that belongs to the associated Google Cloud organization.
  - For **External**, user access also depends on the application’s publishing status.
  - Obtain the organization and application audience from the application owner.
- **Source:** https://support.google.com/cloud/answer/15549945?hl=en
- **Location:** “User Type” → “External”; “Internal.”
- **Exact quotations:**
  - “Projects configured with a user type of External are available to any user with a Google Account.”
  - “A user's ability to authorize your app's requested scopes are impacted by your project's publishing status.”
  - “Projects associated with a Google Cloud Organization can configure Internal users to limit authorization requests to members of the organization.”
- **Interpretation:** IAM permission alone does not establish OAuth application eligibility. The user must also satisfy the configured audience restriction.

### T3-07 — Add individual test users when the OAuth application is in Testing

- **Status:** Conditional. Applies when the application has publishing status **Testing**.
- **Actor:** An authorized application administrator.
- **Access recipient:** Each Google account used to test the connection.
- **Scope:** The OAuth application’s test-user list.
- **Documented action and values:** Open **Audience**. Under **Test users**, select **Add users**. Enter the authorized users’ email addresses, then select **Save**.
- **Source:** https://support.google.com/cloud/answer/15549945?hl=en
- **Location:** “Publishing status” → “Testing.”
- **Exact quotation:** “Projects configured with a publishing status of Testing are limited to up to 100 test users listed in the OAuth consent screen.”
- **Procedure source:** https://developers.google.com/workspace/guides/configure-oauth-consent
- **Location:** OAuth consent configuration, external test-user step.
- **Exact quotations:**
  - “Click Audience.”
  - “Under Test users, click Add users.”
  - “Enter your email address and any other authorized test users, then click Save.”
- **Interpretation:** Test-user membership is separate from BigQuery IAM access. Both apply to a Testing connection.
- **Authority note:** The procedure establishes the action. Topic 1 must check the application administrator’s authority to edit this list.

## Unresolved questions

### Non-blocking — License, access-group, or individual registration requirements

The inspected BigQuery MCP setup page gives IAM requirements. It does not state a separate product-seat license, access-group assignment, or individual MCP registration requirement.

- **Sources checked:** BigQuery MCP setup; MCP role reference; BigQuery IAM reference.
- **Classification:** Non-blocking. The documented IAM procedure gives a concrete setup action.
- **Limit:** Do not state that all such requirements are explicitly absent.

### Non-blocking — Organization-specific user restrictions

The public pages do not establish the organization’s actual IAM policies, application audience, or third-party application restrictions.

- **Sources checked:** IAM grant procedure; Google Auth audience documentation.
- **Classification:** Non-blocking. The administrator can apply the documented procedure to the selected project and user. No access error or policy conflict is identified in the ticket.

### Non-blocking — Shared authentication and release-note confirmation

The shared MCP authentication page did not return usable content during this research. Separate release-note confirmation was not completed.

- **Sources checked:** https://docs.cloud.google.com/mcp/authenticate-mcp; maintained BigQuery setup and IAM pages.
- **Classification:** Non-blocking for this topic. The product page directly establishes connecting-user permissions. No replacement notice was seen in the inspected product content.

## Cross-topic dependencies

- **Topic 1:** Use T3-04 for project IAM grant authority. Check authority to edit OAuth test users. Check dataset-level grant authority only if that path is selected.
- **Topic 2:** Report the application’s **Internal** or **External** audience and publishing status. Individual test-user additions belong to Topic 3.
- **Topic 4:** Account for the Testing token limit. The audience source states: “Authorizations by a test user will expire seven days from the time of consent.” It also states that an issued offline refresh token expires.
- **Topic 4:** Confirm which identity the connection uses. Grant IAM roles to that identity, not automatically to the person who configures the client.
- **Coordinator:** Use the project-level role procedure as the direct documented path. Select narrower data grants when required by the resource owner.
- **Coordinator:** OAuth consent does not replace MCP invocation permission or BigQuery resource access. Check token refresh and Testing compatibility separately.

---

## Topic and status

**Topic 4 — Authentication: complete.**

The supplied central client evidence resolves the saved OAuth compatibility blocker. Manual OAuth supports offline access, initial consent, refresh-token storage, and automatic upstream token refresh.

Use the BigQuery scope. Use an **Internal** audience when Topic 2 confirms eligibility. Otherwise, an **External** application in **Testing** can support a trial, with the seven-day refresh-token warning.

This conclusion uses client source evidence. It is not a live connection test.

**Observation date:** 2026-09-11.

**Changes to the previous report:**

- **T4-05 corrected:** The client supplies the required offline-access parameter and consent prompt. It stores and uses refresh tokens.
- **T4-02 corrected:** The conditional Authorized JavaScript origins setting does not apply to the documented server-side connection.
- **T4-06 clarified:** External Testing supports a trial, not indefinite access.
- The previous blocking client question is resolved.
- Other provider findings and their sources are retained. Attempts to obtain fresh audience evidence in this follow-up timed out. These failed requests do not show a change to the documented procedure.

## Findings

### T4-01 — Use manual OAuth, not dynamic client registration

- **Status:** Required for the selected OAuth setup.
- **Actor and scope:** The application administrator configures the OAuth client. The connecting user authorizes access to Google resources.
- **Documented action:** Create an OAuth 2.0 client ID and secret. Configure both values in the MCP client.
- **Source:** https://docs.cloud.google.com/mcp/authenticate-mcp
- **Locations:** “OAuth client ID”; “Limitations.”
- **Observation date:** 2026-09-11.
- **Exact quotations:**
  - “You can create an OAuth 2.0 client ID and client secret for your MCP client to use to authenticate to Google and Google Cloud remote MCP servers.”
  - “Google and Google Cloud remote MCP servers don't support Dynamic Client Registration or OAuth Client ID Metadata Documents.”
- **Interpretation:** Use Speakeasy manual OAuth. Do not select DCR for this provider.

### T4-02 — Create a Web application OAuth client

- **Status:** Required for the selected connection.
- **Actor and scope:** An authorized administrator creates the OAuth client in a Google Cloud project.
- **Documented action and values:**
  1. Go to **Google Auth Platform > Clients > Create client**.
  2. Select the project if prompted.
  3. Set **Application type** to **Web application**.
  4. Enter an application name in **Name**.
  5. Under **Authorized redirect URIs**, select **+ Add URI**. Enter the callback URL supplied by Speakeasy.
  6. Select **Create**.
  7. In the client creation result, copy the **Client secret** to secure storage.
- **Environment-specific value:** Use the actual callback URL represented by `{{ gram.oauth.callback_url }}`. Do not enter this placeholder as the URL.
- **Source:** https://docs.cloud.google.com/mcp/set-up-authentication-mcp-servers
- **Location:** “Authenticate with an OAuth 2.0 client ID and secret” > “Create an OAuth 2.0 client ID and secret” > “Web.”
- **Observation date:** 2026-09-11.
- **Exact quotations:**
  - “If you access your application through the internet, then select Web.”
  - “In the Google Cloud console, go to Google Auth Platform > Clients > Create client.”
  - “In the Application type list, select Web application.”
  - “Your application's documentation should provide the redirect URL.”
  - “In the Client secrets section, copy the Client secret and save it in a secure place. You can only copy it once.”
- **Interpretation:** Supply the Google client ID and secret through Speakeasy manual OAuth. Topic 1 owns the authority check. Topic 2 owns the full application configuration.

**Corrected conditional finding — Authorized JavaScript origins**

- **Status:** Conditional. Google requires this setting for applications that use client-side JavaScript to access Google APIs.
- **Provider source:** Same URL and location.
- **Exact quotation:** “Applications that use client-side JavaScript to access Google's APIs must specify the authorized JavaScript Origins.”
- **Client evidence:** Central findings C2, C4, and C6. The token exchange and refresh run in the Go server:
  - https://github.com/speakeasy-api/gram/blob/37d7a9025109f8bbeef1211924cb3e59e1646e59/server/internal/remotesessions/challenge.go#L770-L796
  - https://github.com/speakeasy-api/gram/blob/37d7a9025109f8bbeef1211924cb3e59e1646e59/server/internal/remotesessions/tokenservice.go#L551-L602
- **Observation date:** 2026-09-11.
- **Exact code quotation:** `form.Set("grant_type", "refresh_token")`
- **Interpretation:** The supplied central evidence confirms that this connection does not use client-side JavaScript to call Google APIs. The Google condition does not apply to this path. Do not invent a JavaScript origin from the callback URL or MCP URL.

### T4-03 — Match the callback URL exactly

- **Status:** Required.
- **Actor and scope:** The administrator registers the callback URL for the Google OAuth client. Speakeasy sends that URL in its OAuth request.
- **Documented action:** Register the actual Speakeasy callback URL without changes to its scheme, letter case, path, or final slash.
- **Source:** https://developers.google.com/identity/protocols/oauth2/web-server
- **Location:** “Step 1: Set authorization parameters,” `redirect_uri`.
- **Observation date:** 2026-09-11.
- **Exact quotations:**
  - “The value must exactly match one of the authorized redirect URIs for the OAuth 2.0 client”
  - “Note that the http or https scheme, case, and trailing slash ('/') must all match.”
- **Interpretation:** A mismatch prevents the OAuth return to the client.

### T4-04 — Request the BigQuery scope

- **Status:** Required for the selected BigQuery OAuth connection.
- **Actor and scope:** The application requests the scope. The connecting user gives consent. Google applies that user's resource permissions.
- **Required value:** `https://www.googleapis.com/auth/bigquery`
- **Sources and evidence:**
  - https://docs.cloud.google.com/bigquery/docs/use-bigquery-mcp
    - **Location:** “BigQuery MCP OAuth scopes.”
    - **Exact quotation:** “https://www.googleapis.com/auth/bigquery”
  - https://docs.cloud.google.com/mcp/authenticate-mcp
    - **Location:** “OAuth client ID.”
    - **Exact quotation:** “the MCP client can access Google and Google Cloud resources that the authenticated user has access to, within the scopes that the user has authorized.”
- **Observation date:** 2026-09-11.
- **Interpretation:** The scope does not give missing BigQuery IAM permissions. Topic 3 must confirm those permissions.

### T4-05 — Obtain and use a refresh token

- **Status:** Required for the selected OAuth setup to continue after the initial access token expires.
- **Actor and scope:** Speakeasy sends the authorization request and handles tokens. The connecting user completes Google consent.
- **Provider-required value:** `access_type=offline`.
- **Documented action:** Send the offline-access parameter during initial authorization. Retain the returned refresh token and use it for later access tokens.
- **Source:** https://developers.google.com/identity/protocols/oauth2/web-server
- **Locations:** “Step 1: Set authorization parameters,” `access_type`; OAuth client example notes.
- **Observation date:** 2026-09-11.
- **Exact quotations:**
  - “Set the value to offline if your application needs to refresh access tokens when the user is not present at the browser.”
  - “This value instructs the Google authorization server to return a refresh token and an access token the first time that your application exchanges an authorization code for tokens.”
  - “The refresh_token is only returned on the first authorization.”

**Initial consent**

- **Status:** Conditional in the Google protocol. Speakeasy supplies the consent prompt for this Google connection.
- **Provider source:** Same URL, authorization URL examples.
- **Exact quotation:** “Optional, set prompt to 'consent' will prompt the user for consent.”
- **Interpretation:** Do not call `prompt=consent` a universal Google requirement. It is automatic client behavior in this selected path.

**Corrected client compatibility finding**

The supplied central evidence confirms all four required functions:

| Function | Official client source location | Exact code quotation |
|---|---|---|
| Offline access | [`interceptors/google.go`, lines 26–52](https://github.com/speakeasy-api/gram/blob/37d7a9025109f8bbeef1211924cb3e59e1646e59/server/internal/remotesessions/interceptors/google.go#L26-L52) | `q.Set("access_type", "offline")` |
| Initial consent prompt | Same location | `prompts = append(prompts, "consent")` |
| Refresh-token storage | [`challenge.go`, lines 950–964](https://github.com/speakeasy-api/gram/blob/37d7a9025109f8bbeef1211924cb3e59e1646e59/server/internal/remotesessions/challenge.go#L950-L964) | `m.enc.Encrypt([]byte(tok.RefreshToken))` |
| Automatic refresh | [`tokenservice.go`, lines 453–486](https://github.com/speakeasy-api/gram/blob/37d7a9025109f8bbeef1211924cb3e59e1646e59/server/internal/remotesessions/tokenservice.go#L453-L486) and [lines 551–602](https://github.com/speakeasy-api/gram/blob/37d7a9025109f8bbeef1211924cb3e59e1646e59/server/internal/remotesessions/tokenservice.go#L551-L602) | `m.refresher.RefreshNow(ctx, sess, resource, remotesessionmetrics.RefreshTriggerRequest)`; `form.Set("grant_type", "refresh_token")` |

- **Observation date:** 2026-09-11, from the supplied central inspection.
- **Applicability:** Manual upstream OAuth with issuer `https://accounts.google.com`, a valid Google client ID and secret, the BigQuery scope, and a refresh token returned through consent.
- **Additional source:** [`challenge.go`, lines 770–796](https://github.com/speakeasy-api/gram/blob/37d7a9025109f8bbeef1211924cb3e59e1646e59/server/internal/remotesessions/challenge.go#L770-L796).
- **Exact code quotations:** `client.ExternalClientID`; `ic.ModifyAuthorize(ctx, q)`.
- **Interpretation:** These functions apply to upstream remote authorization with a manually configured client. They do not depend on DCR. The client can refresh on demand without a user action or a background refresh setting.
- **Setup consequence:** Do not add user steps to set the automatic parameters, store the refresh token, or enable automatic refresh.
- **Warning:** Expired or revoked authorization can still require another sign-in.

### T4-06 — Account for audience, application status, and token limits

- **Status:** Conditional. The seven-day limit applies to an External application with publishing status **Testing**.
- **Actor and scope:** The application owner selects the audience and publishing status. The limit applies to user refresh tokens.
- **Documented setup consequence:** External Testing can support the local draft trial. It does not give indefinite access.
- **Source:** https://developers.google.com/identity/protocols/oauth2
- **Location:** “Refresh token expiration.”
- **Observation date:** 2026-09-11.
- **Exact quotation:** “A Google Cloud Platform project with an OAuth consent screen configured for an external user type and a publishing status of ‘Testing’ is issued a refresh token expiring in 7 days, unless the only OAuth scopes requested are a subset of name, email address, and user profile”
- **Interpretation:** The BigQuery scope does not meet the exception.
- **Warning:** With External Testing, the refresh token expires after seven days. The user must sign in again to restore access.

**Audience selection**

- Use **Internal** only when Topic 2 confirms that the application and intended users are eligible.
- Otherwise, **External Testing** is an acceptable trial choice, subject to Topic 2's application configuration and Topic 3's test-user eligibility checks.
- This authentication finding does not establish the organization's Internal-audience eligibility. It does not grant authority to change the audience or publish the application.

**Other refresh-token limits**

- **Status:** Conditional. Each limit applies when its stated condition occurs.
- **Source:** Same URL and section.
- **Exact quotations:**
  - “The refresh token has not been used for six months.”
  - “There is currently a limit of 100 refresh tokens per Google Account per OAuth 2.0 client ID.”
  - “If the limit is reached, creating a new refresh token automatically invalidates the oldest refresh token without warning.”
- **Interpretation:** Do not state that a production refresh token lasts indefinitely.

**Cloud session control**

- **Status:** Conditional. The cited restriction applies to applications that request the Cloud Platform scope.
- **Source:** Same URL.
- **Location:** “Dealing with session control policies for Google Cloud Platform (GCP) organizations.”
- **Exact quotation:** “This policy impacts access to Google Cloud Console, the Google Cloud SDK (also known as the gcloud CLI), and any third party OAuth application that requires the Cloud Platform scope.”
- **Interpretation:** Do not apply this statement to a BigQuery-only request without more evidence. If the client also requests the Cloud Platform scope, check the organization's session policy.

### T4-07 — Static bearer tokens are short-lived

- **Status:** Conditional. Applies only if the coordinator selects static-header authentication.
- **Actor and scope:** An authorized user obtains a Google access token. The administrator stores it as a secret upstream header.
- **Documented initial action:** Run `gcloud auth print-access-token`.
- **Documented headers:**
  - `Authorization: Bearer TOKEN`
  - `x-goog-user-project: PROJECT_ID`
- **Environment-specific values:** Obtain `TOKEN` from the authenticated Google Cloud CLI session. Use the selected Google Cloud project ID for `PROJECT_ID`.
- **Source:** https://docs.cloud.google.com/mcp/set-up-authentication-mcp-servers
- **Location:** “Authenticate with an Authorization header” > “Authenticate with a bearer token.”
- **Observation date:** 2026-09-11.
- **Exact quotations:**
  - “By default, bearer tokens expire after 1 hour.”
  - “Create a bearer token with the Google Cloud CLI”
  - `"Authorization": "Bearer TOKEN"`
  - `"x-goog-user-project": "PROJECT_ID"`
- **Interpretation:** Speakeasy static headers can hold these values. This does not provide automatic token refresh.
- **Warning:** The connection stops when the token expires. This is not the preferred persistent setup now that manual OAuth compatibility is established.

### T4-08 — Do not substitute a standard API key for an IAM identity

- **Status:** Required restriction when selecting credentials.
- **Actor and scope:** The administrator selects credentials for the BigQuery connection.
- **Source:** https://docs.cloud.google.com/mcp/authenticate-mcp
- **Location:** Introduction.
- **Observation date:** 2026-09-11.
- **Exact quotation:** “Services that require a principal for Identity and Access Management (IAM) don't support Standard API key credentials for authentication”
- **Interpretation:** The shared page's general API-key option does not establish API-key support for BigQuery. Use the documented identity-based method.

**Other documented methods**

- **Status:** Conditional. These methods apply to compatible clients and execution environments.
- **Source:** Same URL.
- **Locations:** “Authentication identities”; “Authentication methods”; “ADC for MCP servers.”
- **Exact quotations:**
  - “A user identity.”
  - “An application or workload identity.”
  - “An Agent identity.”
  - “If you're connecting to our MCP servers from a Google-owned application or an agent running on Google Cloud, then you can set up ADC for your environment to authenticate.”
- **Interpretation:** The supplied client context does not establish direct ADC, workload-identity, or agent-identity support. These methods are not needed for the selected manual OAuth setup. Do not add a local bridge.

## Unresolved questions

### Resolved — OAuth parameters, storage, and automatic refresh

The supplied central client evidence resolves the previous blocking check. It confirms offline access, the consent prompt, encrypted refresh-token storage, and automatic refresh for the selected manual Google OAuth connection.

### Resolved — Authorized JavaScript origins

The supplied central evidence confirms server-side token operations. The conditional Google requirement for client-side JavaScript API calls does not apply to this path.

### Non-blocking — Organization-specific audience and consent configuration

- **Question:** Is this application eligible for Internal use, and are all intended users eligible?
- **Evidence retained:** Google MCP OAuth setup instructions and Google's documented External Testing token limit.
- **Follow-up sources attempted:**\
  https://developers.google.com/workspace/guides/configure-oauth-consent\
  https://developers.google.com/identity/protocols/oauth2
- **Result:** The follow-up requests timed out. No new audience evidence was obtained.
- **Classification:** Non-blocking for authentication compatibility. Topic 2 must select the applicable audience. Topic 3 must check user eligibility. External Testing remains a supported trial assessment with the stated limit, subject to those checks.
- **Owners:** Topic 2, Topic 3, and Topic 1 for administrative authority.

### Non-blocking — Quota-project header for manual OAuth

The retained shared setup page supplies `x-goog-user-project` for bearer-token and ADC-header setups. The inspected manual OAuth instructions do not establish it as mandatory for manual OAuth.

Follow the documented OAuth procedure. Do not state that this header is always required or always unnecessary.

- **Owners:** Topic 5 and coordinator.

### Non-blocking — Live connection and release confirmation

The client evidence comes from official source commit `37d7a9025109f8bbeef1211924cb3e59e1646e59`. The central report found no concrete source-to-release mismatch. Tests were inspected, not executed. No live deployed connection was tested.

Separate Google release-note confirmation remains incomplete. The retained maintained setup pages showed no replacement notice. These limits do not leave a concrete authentication setup action unresolved.

## Cross-topic dependencies

- **Topic 1:** Confirm authority to create the OAuth client and configure consent, audience, and publishing. BigQuery IAM roles do not establish this authority.
- **Topic 2:** Configure a Web application client with the exact Speakeasy callback. Select Internal when eligible. For External Testing, include the seven-day warning and the applicable consent configuration. Do not add a JavaScript origin for this server-side path.
- **Topic 3:** Confirm BigQuery IAM access and user eligibility for the selected audience. OAuth consent does not replace IAM permissions.
- **Topic 5:** Keep `https://bigquery.googleapis.com/mcp`. Include the documented bearer-token headers only if that alternative is selected.
- **Coordinator:** The saved OAuth compatibility blocker is resolved. Select manual OAuth with the Google client ID and secret, issuer `https://accounts.google.com`, and BigQuery scope.
- **Coordinator:** Use the existing client setup actions. Do not add manual actions for offline access, the consent prompt, token storage, or automatic refresh.
- **Coordinator:** State that token expiration or revoked authorization can require another sign-in. Include the explicit seven-day warning for External Testing.

---

## Topic and status

**Topic 1 — Setup permissions and administrative access: complete.**

**Final authority audit: complete for A1–A6 and conditional policy help.** The selected path uses manual OAuth with a Web application client. The documented permissions support the selected setup actions. No blocking authority gap remains.

OAuth configuration access does **not** give authority to accept terms for an organization. A person with that authority must approve the required agreement. Resource-level data grants also require their own grant permissions.

**Observation date: 2026-09-11.** Existing findings and sources are retained below. The final audit adds live checks for OAuth configuration, resource-level grants, and agreement authority. No provider settings or files were changed.

### Changes from the previous report

- **T1-05 updated:** It now covers the selected consent, test-user, client, and credential actions.
- **T1-09 added:** It establishes authority for dataset, table, and view grants.
- **T1-10 added:** It separates agreement authority from IAM access.
- The previous question about the final authentication selection is **closed**.
- The previous standard-path status is replaced by the final audit status above.

## Findings

### T1-01 — Select an existing project

- **Status:** Required.
- **Actor:** The setup administrator.
- **Access recipient and scope:** The administrator needs access to the selected Google Cloud project.
- **Action and values:** Select the existing project. Obtain its name or ID from the project owner.
- **Source:** https://docs.cloud.google.com/bigquery/docs/use-bigquery-mcp
- **Location:** “Before you begin” → “Roles required to select or create a project.”
- **Observation date:** 2026-09-11.
- **Exact quotation:** “Selecting a project doesn't require a specific IAM role—you can select any project that you've been granted a role on.”
- **Interpretation:** Do not require Project Creator or Owner for project selection. Project selection does not give permission to perform the other setup actions.

### T1-02 — Create a project only if needed

- **Status:** Conditional. This applies only if a new project is needed. It is not part of selected action A1.
- **Actor:** A person with Project Creator access.
- **Access recipient and scope:** The project creator needs permission in the applicable Google Cloud resource hierarchy.
- **Action and values:** Create the project with `resourcemanager.projects.create`. The documented role is `roles/resourcemanager.projectCreator`.
- **Source:** https://docs.cloud.google.com/bigquery/docs/use-bigquery-mcp
- **Location:** “Before you begin” → “Roles required to select or create a project.”
- **Observation date:** 2026-09-11.
- **Exact quotation:** “To create a project, you need the Project Creator role (`roles/resourcemanager.projectCreator`), which contains the `resourcemanager.projects.create` permission.”
- **Interpretation:** Use the selected existing project. If a new project becomes necessary, ask an authorized cloud administrator for help.

### T1-03 — Enable the BigQuery API if necessary

- **Status:** Conditional. Required when the API is not already enabled.
- **Actor:** The setup administrator, or another person with `serviceusage.services.enable`.
- **Access recipient and scope:** The selected project receives API access and remote MCP availability.
- **Action and values:** Enable `bigquery.googleapis.com`. The product page supplies an **Enable the API** link.
- **Documented role:** Service Usage Admin, `roles/serviceusage.serviceUsageAdmin`, on the project.
- **Source:** https://docs.cloud.google.com/bigquery/docs/use-bigquery-mcp
- **Locations:** Introduction; “Before you begin” → “Roles required to enable APIs.”
- **Observation date:** 2026-09-11.
- **Exact quotations:**
  - “The BigQuery remote MCP server is enabled when you enable the BigQuery API.”
  - “To enable APIs, you need the `serviceusage.services.enable` permission.”
  - “Otherwise, you can get this permission through the Service Usage Admin role (`roles/serviceusage.serviceUsageAdmin`).”
  - “For new projects, the BigQuery API is automatically enabled.”
- **Interpretation:** This authority covers A1. Do not require Owner or a separate MCP activation action.

### T1-04 — Use project IAM grant authority for project roles

- **Status:** Conditional. Required when the necessary project access is not already present.
- **Actor:** A project access administrator with Project IAM Admin, `roles/resourcemanager.projectIamAdmin`, or equivalent permissions.
- **Access recipients:** The setup administrator receives setup access. The connecting identity receives use access. These can be different people.
- **Scope:** The project whose IAM policy changes.
- **Action and values:** Grant the required roles to the correct principal. Obtain the project ID and principal email address from their owners.
- **Required permissions:**
  - `resourcemanager.projects.getIamPolicy`
  - `resourcemanager.projects.setIamPolicy`
- **Source:** https://docs.cloud.google.com/iam/docs/granting-changing-revoking-access
- **Locations:** “Required roles”; “Required permissions.”
- **Observation date:** 2026-09-11.
- **Exact quotations:**
  - “To manage access to a project: Project IAM Admin (`roles/resourcemanager.projectIamAdmin`)”
  - “`resourcemanager.projects.getIamPolicy`”
  - “`resourcemanager.projects.setIamPolicy`”
  - “You might also be able to get these permissions with custom roles or other predefined roles.”
- **Interpretation:** This authority covers the project grants in A2. Service Usage Admin and OAuth Config Editor do not establish project role-grant authority.

### T1-05 — Use OAuth Config Editor for the selected OAuth resource actions

- **Status:** Required when the OAuth resources must be created or changed.
- **Actor:** The application setup administrator with OAuth Config Editor, `roles/oauthconfig.editor`, or equivalent permissions.
- **Access recipient and scope:** The administrator receives read and write access to OAuth configuration resources in the application project.
- **Actions covered:**
  - **A3:** Configure branding, consent information, audience, scope configuration, and test users.
  - **A4:** Create the Web application OAuth client and configure its redirect URI.
  - **A5:** Obtain the client credentials shown during creation.
- **Required values:** Use application-owner values for the name, support email, contact email, and test-user addresses. Use the selected BigQuery scope, `https://www.googleapis.com/auth/bigquery`. Register the client-supplied callback represented in this guide by `{{ gram.oauth.callback_url }}`.
- **Authority source:** https://docs.cloud.google.com/iam/docs/roles-permissions/oauthconfig
- **Location:** “OAuth Config Editor.”
- **Observation date:** 2026-09-11; read live during this audit.
- **Exact quotations:**
  - “OAuth Config Editor”
  - “Read/write access to OAuth config resources”
  - `clientauthconfig.brands.create`
  - `clientauthconfig.brands.update`
  - `clientauthconfig.clients.create`
  - `clientauthconfig.clients.createSecret`
  - `clientauthconfig.clients.getWithSecret`
  - `clientauthconfig.clients.update`
  - `oauthconfig.testusers.update`
- **Role label:** The reference labels this role **Beta**.

**Procedure evidence**

- **Source:** https://developers.google.com/workspace/guides/configure-oauth-consent
- **Location:** “Configure OAuth consent.”
- **Observation date:** 2026-09-11.
- **Exact quotations:**
  - “All apps using OAuth 2.0 require a consent screen configuration”
  - “Under Test users, click Add users.”
  - “Enter your email address and any other authorized test users, then click Save.”
  - “If you're creating an app for use outside of your Google Workspace organization, click Data Access > Add or Remove Scopes.”

- **Source:** https://docs.cloud.google.com/mcp/set-up-authentication-mcp-servers
- **Location:** “Create an OAuth 2.0 client ID and secret” → “Web.”
- **Observation date:** 2026-09-11.
- **Exact quotations:**
  - “In the Google Cloud console, go to Google Auth Platform > Clients > Create client.”
  - “Your application's documentation should provide the redirect URL. Custom redirect URLs aren't supported.”
  - “You can only copy it once. If you lose it, delete the secret and create a new one.”

**Interpretation:** The role gives specific authority for OAuth resource configuration. Use it instead of broad Editor or Owner as the documented role option. Its resource permissions do not establish authority to accept organizational terms, approve a Workspace application, or change organization security policy. See T1-10 for the agreement.

### T1-06 — Keep connecting-user permissions separate from setup permissions

- **Status:** Required for the documented query setup.
- **Actor:** An authorized project or data-resource access administrator grants access.
- **Access recipient:** The Google identity that signs in and makes MCP calls.
- **Scope and values:**

| Purpose | Role | Grant scope |
|---|---|---|
| Call MCP tools | `roles/mcp.toolUser` | Selected project |
| Run BigQuery jobs | `roles/bigquery.jobUser` | Job project |
| Read BigQuery data | `roles/bigquery.dataViewer` | Selected data resources, or the documented project grant |

- **Source:** https://docs.cloud.google.com/bigquery/docs/use-bigquery-mcp
- **Locations:** “Required roles”; “Required permissions.”
- **Observation date:** 2026-09-11.
- **Exact quotations:**
  - “ask your administrator to grant you the following IAM roles on the project where you want to use the BigQuery MCP server”
  - “MCP Tool User (`roles/mcp.toolUser`)”
  - “BigQuery Job User (`roles/bigquery.jobUser`)”
  - “BigQuery Data Viewer (`roles/bigquery.dataViewer`)”
  - “Additional BigQuery permissions might be required depending on the task.”
- **Additional source:** https://docs.cloud.google.com/bigquery/docs/access-control
- **Locations:** “BigQuery Data Viewer”; “BigQuery Job User.”
- **Exact quotations:**
  - “When granted on a dataset, this role grants these permissions”
  - “This role can only be granted on Resource Manager resources (projects, folders, and organizations).”
- **Interpretation:** These roles are for server use. They do not give API enablement, OAuth configuration, or role-grant authority. Existing equivalent permissions can satisfy access needs. T1-09 establishes authority for narrower data grants.

### T1-07 — Obtain policy-owner help if an existing restriction blocks access

- **Status:** Conditional. This applies when an existing policy blocks the principal, application, service, or tool.
- **Actor:** The owner of the applicable policy, with permission to change it.
- **Access recipient and scope:** The connecting identity or OAuth application, within the policy’s resource scope.
- **Action and values:** Ask the policy owner to review and approve the required access. Supply the selected project, principal, OAuth client ID, and service `bigquery.googleapis.com`.
- **Source:** https://docs.cloud.google.com/mcp/control-mcp-use-iam
- **Locations:** Introduction; “Understand IAM permission checks for MCP”; “Limitations.”
- **Observation date:** 2026-09-11.
- **Exact quotations:**
  - “Configure these policies to block unwanted MCP tool access.”
  - “The application's OAuth client ID.”
  - “The `mcp.tools.call` permission on the Google Cloud project.”
  - “The required permissions to access the underlying Google or Google Cloud resources.”
  - “The `resource.service` and `tool.name` attributes aren't available in the Google Cloud console. IAM policies that use these attributes must be managed with Google Cloud CLI.”
- **Interpretation:** This supports conditional policy help, not a routine policy change. A browser-only reader must obtain help when a necessary change requires the CLI. No policy block is reported for this trial.

### T1-08 — Billing administration is not required for the documented sandbox path

- **Status:** Explicitly not required for the documented sandbox procedure.
- **Actor:** No billing administrator action is needed for that path.
- **Scope:** The sandbox project.
- **Action:** Continue without billing if the sandbox meets the trial’s needs.
- **Source:** https://docs.cloud.google.com/bigquery/docs/use-bigquery-mcp
- **Location:** “Before you begin.”
- **Observation date:** 2026-09-11.
- **Exact quotations:**
  - “Optional: Enable billing for the project.”
  - “If you don't want to enable billing or provide a credit card, the steps in this document still work.”
- **Interpretation:** Do not require Billing Account Administrator for the standard trial. This does not establish sandbox suitability for every production workload.

### T1-09 — Use resource-specific grant authority for narrower data access

- **Status:** Conditional. This applies when A2 grants Data Viewer on a dataset, table, or view instead of the project.
- **Actor:** A resource access administrator with the applicable policy permissions. A resource owner must have these permissions; the name “owner” alone is not sufficient evidence.
- **Access recipient:** The connecting Google identity.
- **Scope:** The selected dataset, table, or view.
- **Action and values:** Grant `roles/bigquery.dataViewer` on the approved data resource. Obtain the resource name and user email address from their owners.
- **Source:** https://docs.cloud.google.com/bigquery/docs/control-access-to-resources-iam
- **Locations:** “Required roles”; “Required permissions”; BigQuery Data Owner role description.
- **Observation date:** 2026-09-11; read live during this audit.
- **Exact quotations:**
  - “To get a dataset's access policy: `bigquery.datasets.get`”
  - “To set a dataset's access policy: `bigquery.datasets.update`”
  - “To get a dataset's access policy (Google Cloud console only): `bigquery.datasets.getIamPolicy`”
  - “To set a dataset's access policy (console only): `bigquery.datasets.setIamPolicy`”
  - “To get a table or view's policy: `bigquery.tables.getIamPolicy`”
  - “To set a table or view's policy: `bigquery.tables.setIamPolicy`”
  - For BigQuery Data Owner on a dataset: “All permissions for the dataset and for all of the resources within the dataset: tables and views, models, and routines.”
- **Interpretation:** These permissions establish authority for the narrower grant action. Existing dataset-level BigQuery Data Owner access is one documented option for dataset access management. Do not grant project-wide BigQuery Data Owner merely to support a narrower grant when an authorized resource administrator can perform it.

### T1-10 — Obtain organizational authority for the required policy agreement

- **Status:** Conditional. Required when the initial OAuth configuration includes the agreement. Organizational authority applies when the administrator acts for an organization.
- **Actor:** A person authorized to accept the applicable terms for that organization. The OAuth administrator can act only if they also have that authority.
- **Access recipient and scope:** The agreement concerns the application’s use of Google API Services for the organization. It is not an IAM role grant.
- **Action:** Under **Finish**, review the policy. If authorized and in agreement, select **I agree to the Google API Services: User Data Policy**, then **Continue** and **Create**. Otherwise, obtain approval or help from the organization’s authorized representative.
- **Procedure source:** https://developers.google.com/workspace/guides/configure-oauth-consent
- **Location:** “Configure OAuth consent,” **Finish** step.
- **Observation date:** 2026-09-11; read live during this audit.
- **Exact quotation:** “Under Finish, review the Google API Services User Data Policy and if you agree, select I agree to the Google API Services: User Data Policy.”

**Applicable policy and authority evidence**

- **Source:** https://developers.google.com/terms/api-services-user-data-policy
- **Location:** Introduction.
- **Observation date:** 2026-09-11; read live during this audit.
- **Exact quotation:** “The policy below, as well as the Google APIs Terms of Service, govern the use of Google API Services when you request access to Google user data.”

- **Source:** https://developers.google.com/terms
- **Location:** Section 1 → “b. Entity Level Acceptance.”
- **Observation date:** 2026-09-11; read live during this audit.
- **Exact quotation:** “If you are using the APIs on behalf of an entity, you represent and warrant that you have authority to bind that entity to the Terms and by accepting the Terms, you are doing so on behalf of that entity”
- **Interpretation:** OAuth Config Editor supplies technical configuration access. It does not supply authority to bind the organization. The documented agreement procedure and the entity-acceptance rule give a concrete action: an authorized representative must approve or perform acceptance. No specific Google Cloud administrator role substitutes for that authority.

## Final action audit

| Selected action | Audit result | Required actor or help |
|---|---|---|
| **A1 — Select project and enable API if needed** | Complete | Project access; `serviceusage.services.enable` only if enablement is needed. See T1-01 and T1-03. |
| **A2 — Grant user access** | Complete | Project IAM grant authority for project roles; resource-specific grant authority for narrower data access. See T1-04, T1-06, and T1-09. |
| **A3 — Configure consent, audience, scopes, and test users** | Complete | OAuth Config Editor or equivalent resource permissions. An authorized organizational representative must cover the required agreement. See T1-05 and T1-10. |
| **A4 — Create Web OAuth client** | Complete | OAuth Config Editor or equivalent permissions. See T1-05. |
| **A5 — Copy displayed client credentials securely** | Complete | The authorized OAuth client administrator. See T1-05. |
| **A6 — Configure Speakeasy and sign in** | Complete for provider authority | Speakeasy configuration access belongs to the coordinator’s client check. The connecting user supplies consent and needs T1-06 access. No provider administrator change is selected in A6. |
| **Conditional policy help** | Complete as a conditional referral | Ask the applicable policy owner if a restriction occurs. Do not add a routine deny-policy change. See T1-07. |

## Unresolved questions

### Non-blocking — Organization-specific restrictions

Public documentation does not establish the organization’s actual IAM or Workspace application restrictions.

- **Sources checked:** BigQuery MCP setup; shared MCP authentication; MCP IAM control documentation.
- **Reason:** No restriction is reported. The selected procedure remains actionable.
- **Limit:** Do not state that organization approval is never required.

### Non-blocking — Role for an exceptional policy change

The exact role for changing an unidentified existing deny policy or Workspace restriction was not established.

- **Affected action:** A future policy change, if a specific restriction is found.
- **Sources checked:** https://docs.cloud.google.com/mcp/control-mcp-use-iam
- **Reason:** No such change is part of A1–A6. The current action is to obtain help from the policy owner, not to grant the setup administrator policy-management access.

### Non-blocking — Identity of the organization’s authorized representative

Official terms establish the required authority but cannot identify who has it in this organization.

- **Sources checked:** OAuth consent configuration; Google API Services User Data Policy; Google APIs Terms of Service, Section 1(b).
- **Reason:** The administrator can obtain approval from the organization’s authorized representative. The agreement action and required authority are clear.
- **Limit:** Do not infer this authority from an IT job title or IAM role.

### Non-blocking — Release-note confirmation

Separate release-note confirmation was not completed. No replacement notice was found in the inspected maintained sources.

- **Reason:** No material question about the selected setup authority remains unresolved.
- **Access note:** Exa reads timed out during this audit. Direct public-page reads supplied the additional authority evidence.

## Cross-topic dependencies

- **Topic 2:** Use OAuth Config Editor for A3–A5. Include the separate agreement-authority condition from T1-10.
- **Topic 3:** Use T1-09 for narrower data grants. A resource owner must have grant permissions. Test-user membership and IAM access remain separate requirements.
- **Topic 4:** The selected Web OAuth client and credential actions have documented authority. No service account, ADC, static-token, or DCR authority check applies to this selected path.
- **Topic 5:** Retain API enablement as MCP activation. No separate endpoint-administration action is needed in the documented procedure.
- **Coordinator:** The final provider authority audit is complete. Use specific project and OAuth roles, not Owner, broad Editor, Billing Account Administrator, or Organization Administrator as universal prerequisites.
- **Coordinator:** Keep Speakeasy access checks with client implementation checks. Arrange help from an authorized organizational representative for agreement acceptance and from the policy owner if an actual restriction occurs.
### Commit-pinned client source locations

Observed 2026-09-11. These links make the central evidence locations directly accessible:

- [Google upstream authorization interceptor, lines 26–52](https://github.com/speakeasy-api/gram/blob/37d7a9025109f8bbeef1211924cb3e59e1646e59/server/internal/remotesessions/interceptors/google.go#L26-L52).
- [Interceptor registration, lines 261–263](https://github.com/speakeasy-api/gram/blob/37d7a9025109f8bbeef1211924cb3e59e1646e59/server/internal/remotesessions/challenge.go#L261-L263) and [upstream request application, lines 770–796](https://github.com/speakeasy-api/gram/blob/37d7a9025109f8bbeef1211924cb3e59e1646e59/server/internal/remotesessions/challenge.go#L770-L796).
- [Encrypted token storage, lines 950–964](https://github.com/speakeasy-api/gram/blob/37d7a9025109f8bbeef1211924cb3e59e1646e59/server/internal/remotesessions/challenge.go#L950-L964).
- [On-demand upstream refresh, lines 453–486](https://github.com/speakeasy-api/gram/blob/37d7a9025109f8bbeef1211924cb3e59e1646e59/server/internal/remotesessions/tokenservice.go#L453-L486) and [refresh grant, lines 551–602](https://github.com/speakeasy-api/gram/blob/37d7a9025109f8bbeef1211924cb3e59e1646e59/server/internal/remotesessions/tokenservice.go#L551-L602).
- [Google interceptor tests](https://github.com/speakeasy-api/gram/blob/37d7a9025109f8bbeef1211924cb3e59e1646e59/server/internal/remotesessions/interceptors/google_test.go) and [on-demand concurrent refresh tests](https://github.com/speakeasy-api/gram/blob/37d7a9025109f8bbeef1211924cb3e59e1646e59/server/internal/remotesessions/tokenservice_concurrent_refresh_test.go).
- [Manual client attachment, lines 341–435](https://github.com/speakeasy-api/gram/blob/37d7a9025109f8bbeef1211924cb3e59e1646e59/client/dashboard/src/pages/mcp/x/tabs/settings/sections/authentication/AttachRemoteIdentityProviderSheet.tsx#L341-L435). Exact excerpt: “Manual uses what the operator typed.” A newly created manual remote-session client receives the configured scope. An existing client retains its stored configuration. This evidence does not describe downstream OAuth client registration.
- [Identity provider form](https://github.com/speakeasy-api/gram/blob/37d7a9025109f8bbeef1211924cb3e59e1646e59/client/dashboard/src/pages/mcp/x/tabs/settings/sections/authentication/IssuerFormFields.tsx).

Metadata observation times use `00:00:00Z` to encode the recorded observation date. The reports establish the date, not an exact midnight observation.
