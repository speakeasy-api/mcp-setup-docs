# Google Compute Engine research dossier

Status: complete for the selected draft path. Reconciliation completed on 2026-09-11 during recovery. The first run completed all five topic reports, Topic 4 scope follow-up 1, and Topic 1 final authority audit. Recovery completed the coordinator-owned manual client configuration check. No research report was inferred complete from file existence alone.

## Run context and identity

- Provider: Google Cloud. Service: Compute Engine remote MCP server.
- Task: recover and finish the local draft-prompt trial.
- Slug: `google-compute-engine`. Mode: `update`. Output: `guides/google-compute-engine/`.
- Exactly one matching metadata identity was found. Its alias is `com.googleapis.compute/mcp`. The slug meets the required pattern. No alias guide is created.
- Persona: `doctrine/personas/it-admin.md`. Client: Speakeasy AI Control Plane.
- Existing guide instructions are not research evidence. Only the interrupted trial's sourced reports and the recovery client evidence support this dossier.
- Use ASD-STE100 Simplified Technical English. Preserve source procedure detail. Presentation gaps do not prevent a draft.

## Endpoint gate

Topic 5 passed before the original Topics 1-4 dispatch. The service-specific setup page documents `https://compute.googleapis.com/mcp` and HTTP. The MCP reference identifies it as a global endpoint. No local process or tenant substitution is required for this path. The endpoint does not provide full regional isolation. Other Google Cloud product servers are outside the Compute Engine service identity; the user does not need to connect them.

Primary source: https://docs.cloud.google.com/compute/docs/use-compute-engine-mcp, **Configure an MCP client to use the Compute Engine MCP server**, observed 2026-09-11: “Server URL or Endpoint: https://compute.googleapis.com/mcp”. Reference: https://docs.cloud.google.com/compute/docs/reference/mcp, **Server Endpoints**: “The Compute Engine API MCP server has the following global MCP endpoint:”. See T5-01 to T5-04 below.

## Selected authentication and access

Use manual Web OAuth with refresh tokens. Use an existing project with billing enabled. Select read-only Compute Engine resource access. Use both exact scopes:

```text
https://www.googleapis.com/auth/compute.read-only
https://www.googleapis.com/auth/compute.readonly
```

The first is the MCP tool scope. The second is the resource API scope. Topic 4 follow-up 1 resolved these layers. The client code check establishes manual scope input, offline access, consent, and refresh. Do not add automatic behavior as a setup action. Google does not support DCR for this path. Static bearer tokens, ADC, service-account credentials, new-project creation, billing changes, and public production app verification are not selected.

Use Internal audience when the project has a Google Cloud organization and users belong to that organization. Otherwise use External with Testing status and named test users. Testing permits up to 100 listed users. For these scopes, authorization and refresh tokens expire after seven days in Testing. Other Google token or session limits can require another sign-in. Do not include renewal or rotation procedures.

## Canonical setup actions and authority audit

The table combines repeated actions. Requirement IDs identify the complete reports below. The final Topic 1 audit applies to these actions. Recovery did not change the provider actions or actor assignments.

| Action and anchor | Requirements | Actor, access recipient, and scope | Required action |
| --- | --- | --- | --- |
| A1 `enable-compute-api` | T2-01 to T2-03; T5-03; T1-01, T1-04 to T1-06 | Service Usage Admin enables the API on the existing project. | Select the resource project. Confirm that billing is already enabled. Enable the Compute Engine API if absent. MCP is enabled with the API. |
| A2 `grant-user-access` | T3-01 to T3-04; T1-03, T1-06 | Project IAM Admin grants roles to the intended connecting identity on the resource project. | Grant MCP Tool User and Compute Viewer. Keep setup-helper privileges separate. |
| A3 `configure-oauth-consent` | T2-05; T4-06, T4-08; T1-02, T1-07, T1-08 | OAuth Config Editor (Beta) configures the application. An authorized organization representative approves policy acceptance. | Configure Branding, Audience, contact details and consent. Add the two selected scopes in Data Access when the documented external-app condition applies. |
| A4 `assign-test-users` | T2-06; T3-06, T3-07; T4-06; T1-08 | OAuth Config Editor adds eligible users to the External test application. | Audience > Test users > Add users; enter intended user email addresses; Save. For Internal, confirm membership instead. |
| A5 `create-oauth-client` | T2-04; T4-02 to T4-05; T1-02 | OAuth Config Editor creates a Web application client in the selected project. The client receives the registration. | Use Google Auth platform > Clients > Create client. Supply Name and the exact callback under Authorized redirect URIs. |
| A6 `copy-client-credentials` | T2-04; T4-02; T1-02 | OAuth Config Editor gives the client ID and secret to the authorized Speakeasy operator. | Save the ID and one-time secret securely for the manual connection. Do not save secrets in this bundle. |
| A7 `add-server-in-speakeasy` | T5-01, T5-02; C3; setup doctrine | Speakeasy operator acts in the intended project. | Add the shared endpoint as a Custom remote server. |
| A8 `connect-speakeasy-credentials` | T4-04, T4-05, T4-08; T1-09; C1-C3 | Speakeasy operator with project write access attaches the manual client. Intended read-only Google user grants consent. | Use Google discovery, Manual client, ID and secret, matching callback, and both read-only scopes. |

The service setup page separately lists Compute Instance Admin (v1), Compute Security Admin, Service Account User, and Service Usage Admin for its setup identity. Preserve these on the setup helper. Do not require them for every later read-only user. Service Usage Admin is sufficient for the specific API enablement action. Project IAM Admin grants missing project access. OAuth Config Editor does not grant IAM management or policy acceptance authority. The full final authority report and its source quotations follow below.

## Anchors and screenshot plan

These provider anchors are minted for this recovered dossier. Each must appear once in `external.md`:

### Enable the Compute Engine API {#enable-compute-api}

Action A1. Screenshot: selected project and API status.

### Grant access to the connecting user {#grant-user-access}

Action A2. Screenshot: IAM role grants; redact identities.

### Configure the OAuth application {#configure-oauth-consent}

Action A3. Screenshot: Branding, Audience and Data Access; redact addresses.

### Confirm user eligibility {#assign-test-users}

Action A4. Screenshot: Audience and test users; redact identities.

### Create the Web OAuth client {#create-oauth-client}

Action A5. Screenshot: Web client type and callback field; redact environment-specific values.

### Save the client credentials {#copy-client-credentials}

Action A6. Screenshot: client details; redact ID and secret.

The two fixed Speakeasy anchors are `add-server-in-speakeasy` and `connect-speakeasy-credentials`. Use screenshot placeholders for the add-source form and manual identity provider sheet. No screenshots were captured. No screenshot detail is a blocker.

## Speakeasy setup values and documented procedure

Source: `doctrine/speakeasy-setup.md`, read on 2026-09-11. It cites official dashboard commits `96f7f73` and `f1d60da`. Use `speakeasy_add_server: custom-remote`. Catalog identity was not revalidated; this explicit choice avoids an unverified catalog mapping. The endpoint remains `tenanted: false`.

The metadata transport `streamable-http` records the documented Speakeasy connection setting. Provider evidence names HTTP; the endpoint gate does not require proof of a more specific transport.

### Add the server in Speakeasy {#add-server-in-speakeasy}

In the Speakeasy AI Control Plane sidebar, under **Connect**, select **Sources**, then **Add Source**. Choose **Custom remote server**. On **Add a custom remote MCP server**, enter the shared URL in **Remote MCP server URL**, then select **Add server**. This creates the hosted MCP server and opens **Overview**.

<!-- screenshot: the custom remote source form with the Compute Engine endpoint -->

### Connect your credentials {#connect-speakeasy-credentials}

From **Overview**, open **Settings**. Under **Authentication**, select **Configure Manually**, or **Use Discovered** when offered. In **Attach Remote Identity Provider**, use issuer `https://accounts.google.com` if it is not already known. Use **Endpoints > Discover** to obtain the Google authorization and token endpoints. Keep **Client Type** as **Manual**. Set **Client ID** and **Client Secret (optional)** to the credentials from A6. Google requires the secret for this selected Web client even though the generic field label says optional.

Use **Scope (override)** with this comma-separated value:

```text
https://www.googleapis.com/auth/compute.read-only, https://www.googleapis.com/auth/compute.readonly
```

Leave **Audience (optional)** empty for this selected path. No audience override is established as necessary. Confirm that **Redirect URI** matches the value registered using `{{ gram.oauth.callback_url }}`. Select **Attach Identity Provider**. When the application requests Google access, sign in as the intended read-only user and grant consent. Do not authorize with the more privileged setup helper identity.

The common scope field and discovery controls also apply to Manual in the inspected implementation. C1-C3 establish applicability. If a reused issuer has an administrator scope override, the Speakeasy administrator must confirm that it uses the selected read-only scopes. An issuer override takes precedence over client scopes.

<!-- screenshot: the Manual identity provider sheet with values redacted -->

Closing pointer: This guide covers setup only. For billing, tool behavior, and limits, see [Google's Compute Engine MCP documentation](https://docs.cloud.google.com/compute/docs/use-compute-engine-mcp).

## Research status and remaining limitations

- Blocking research gaps: none for the selected setup path.
- The provider reports and final audit were completed in the interrupted run. Topic 4 used factual follow-up 1; Topic 1 used follow-up 1 for the final authority audit. Recovery used no additional topic follow-up.
- The original trial had provider credit dispatch failures. Actual errors remain in `.factory/dispatch-errors.jsonl`. Infrastructure failures are not successful research checks.
- Client unit and end-to-end tests were inspected, not executed. No authenticated Google connection or live console check was performed. This is a supported documented path, not a live connection certification.
- Release-note confirmation remains unavailable. Maintained setup pages had no replacement notice. This is non-blocking.
- Organization restrictions and the person authorized to accept policy are environment-specific. The guide preserves the approval boundary. It does not direct users to weaken controls.
- The callback template must render to the displayed Redirect URI, as required by the setup doctrine. The guide includes the equality check. No concrete deployed release mismatch was found.
- No Git checkout is available in this snapshot. Run the available deterministic lint. Git-based drift checks and normal human PR review remain for an authorized repository workflow. Do not publish, commit, or open a PR in this trial.
- No research subagent was started in recovery. Old handles were not resumed. No automated reviewer agent or review-driven loop was run.

## Source reports

The following reports preserve each topic's source quotations, dates, conditions, recipients and permission checks. Canonical setup actions above control the selected path. Unselected alternatives remain research evidence only. The original client-evidence warning is superseded by the completed recovery check that follows these reports.

## Topic 1 — preserved complete report

## Topic and status

**Topic 1 — complete.** The authority check covers the selected existing-project, manual Web OAuth path. Official sources establish authority for API enablement, OAuth configuration, test-user changes, project IAM grants, and policy acceptance.

Preserve the service page’s broad setup prerequisites. Do not assign that broad role set to every later read-only user. Use an authorized setup helper where needed.

**Observation date for all sources: 2026-09-11.** No provider settings or local files were changed.

### Corrections and updates

- **T1-02 corrected:** Authorized JavaScript origins apply when client-side JavaScript accesses Google APIs. They are not a universal Web client requirement.
- **T1-06 clarified:** The broad service setup roles remain a documented prerequisite for the setup identity. The later connecting read-only user has a separate permission selection.
- **T1-07 added:** Policy acceptance requires authority to act for the organization. OAuth Config Editor alone does not establish that authority.
- **T1-08 added:** The authority check now covers branding, audience, scope configuration, and External test-user assignment.
- **T1-09 added:** The authority boundary for the final client connection and user consent is explicit.
- **T1-04 and T1-05 retained:** Project creation and billing changes are outside the selected path.

## Findings

### T1-01 — Enable the Compute Engine API

- **Status:** Conditional. Required if the API is not enabled.
- **Who acts:** A person with **Service Usage Admin** (`roles/serviceusage.serviceUsageAdmin`) on the selected project, or equivalent permission.
- **Recipient and scope:** The selected project receives access to the Compute Engine API.
- **Action and values:** Select the existing project. Enable the **Compute Engine API**. Obtain the project from the resource owner.
- **Authority:** `serviceusage.services.enable`.

**Source statement:**

> “To enable APIs, you need the Service Usage Admin IAM role (roles/serviceusage.serviceUsageAdmin), which contains the serviceusage.services.enable permission.”

Source: https://docs.cloud.google.com/mcp/enable-disable-mcp-servers\
Location: **Enable a supported product → Roles required to enable APIs**.

**Source statement:**

> “The Compute Engine remote MCP server is enabled when you enable the Compute Engine API.”

Source: https://docs.cloud.google.com/compute/docs/use-compute-engine-mcp\
Location: Introduction.

**Interpretation:** Service Usage Admin is the applicable role for the API enablement action. If the reader lacks this authority, an authorized helper can perform the action. The documented procedure does not add a separate MCP deployment.

### T1-02 — Create and configure the Web OAuth client

- **Status:** Required for the selected manual OAuth path if a suitable client does not exist. Changes are conditional for an existing client.
- **Who acts:** An application administrator with **OAuth Config Editor** (`roles/oauthconfig.editor`) on the OAuth project.
- **Recipient and scope:** The AI application receives an OAuth client ID and secret from that project.
- **Documented action:**
  - Open **Google Auth Platform > Clients > Create client**.
  - Select **Web application**.
  - Enter the application name.
  - Register the exact client-provided URL under **Authorized redirect URIs**.
  - Select **Create**.
  - Copy the client ID and the one-time client secret. Keep the secret in secure storage.
- **Value sources:** The application owner supplies the name. The client supplies the resolved callback URL from `{{ gram.oauth.callback_url }}`. The coordinator checks that value.
- **Conditional field:** Configure **Authorized JavaScript origins** only when the documented JavaScript condition applies.

**Source statement:**

> “OAuth Config Editor”\
> “Beta”\
> “Read/write access to OAuth config resources”

The role includes:

> `clientauthconfig.clients.create`\
> `clientauthconfig.clients.createSecret`\
> `clientauthconfig.clients.getWithSecret`\
> `clientauthconfig.clients.update`

Source: https://docs.cloud.google.com/iam/docs/roles-permissions/oauthconfig\
Location: **OAuthConfig roles → OAuth Config Editor**.

**Source statements:**

> “If you access your application through the internet, then select Web.”

> “Applications that use client-side JavaScript to access Google's APIs must specify the authorized JavaScript Origins.”

> “You can only copy it once. If you lose it, delete the secret and create a new one.”

Source: https://docs.cloud.google.com/mcp/set-up-authentication-mcp-servers\
Location: **Authenticate with an OAuth 2.0 client ID and secret → Create an OAuth 2.0 client ID and secret → Web**.

**Interpretation:** OAuth Config Editor supports client creation, callback changes, and secret management. The role is marked **Beta**. It does not grant API enablement, project IAM management, or organization approval authority.

**Correction:** The earlier report presented JavaScript origins as an unconditional field. The provider makes this requirement conditional. The coordinator’s client check determines whether it applies.

### T1-03 — Grant project IAM access

- **Status:** Conditional. Applies when required grants are missing.
- **Who acts:** A project IAM administrator with **Project IAM Admin** (`roles/resourcemanager.projectIamAdmin`), or equivalent permissions.
- **Recipients and scope:** The setup helper or connecting identity receives the applicable roles on the selected project.
- **Documented action:** Open **IAM**. Select the project. Select **Grant access**. Enter the identity in **New principals**. Select each required role. Select **Save**.
- **Selected connecting-user values:** **MCP Tool User** and **Compute Viewer**.
- **Value sources:** Obtain the project and Google Account email address from the resource owner.

**Source statement:**

> “To manage access to a project: Project IAM Admin (roles/resourcemanager.projectIamAdmin)”

The source lists:

> `resourcemanager.projects.getIamPolicy`\
> `resourcemanager.projects.setIamPolicy`

Source: https://docs.cloud.google.com/iam/docs/granting-changing-revoking-access\
Location: **Required roles → Required permissions**.

**Source statement:**

> “In the New principals field, enter your user identifier. This is typically the email address for a Google Account.”

Source: https://docs.cloud.google.com/compute/docs/use-compute-engine-mcp\
Location: **Before you begin → Grant the roles**.

**Interpretation:** The reader does not need Project IAM Admin if an authorized administrator performs the grants. OAuth Config Editor does not establish authority to grant these roles.

### T1-04 — Select an existing project; create a project only on another path

- **Status:** Required to select a project. Project creation is conditional and is **not selected**.
- **Who acts:** The setup person selects an existing project. A person with **Project Creator** creates a project if another path requires it.
- **Recipient and scope:** Setup applies to the selected project.
- **Action and values:** Use the project selector. Select the project supplied by the cloud resource owner.

**Source statements:**

> “Selecting a project doesn't require a specific IAM role—you can select any project that you've been granted a role on.”

> “To create a project, you need the Project Creator role (roles/resourcemanager.projectCreator), which contains the resourcemanager.projects.create permission.”

Source: https://docs.cloud.google.com/compute/docs/use-compute-engine-mcp\
Location: **Before you begin → Roles required to select or create a project**.

**Interpretation:** Do not request Project Creator for the selected existing-project path. Project selection does not grant authority for later actions.

### T1-05 — Billing changes require separate authority

- **Status:** Conditional. Applies if billing needs to be enabled. This action is **not selected** because billing is already enabled.
- **Who acts:** A person with the required project and billing-account permissions.
- **Recipient and scope:** The selected project is linked to an active billing account.
- **Documented limited-role option:**
  - Project: **Project Billing Manager**, **Project Browser**, and **Service Usage Viewer**.
  - Target billing account: **Billing Account User** and **Billing Account Viewer**.
- **Action and values:** In **Manage billing accounts > My projects**, find the project. Use **Actions > Change billing**. Select the billing account supplied by the billing owner.

**Source statement:**

> “Verify that billing is enabled for your Google Cloud project.”

Source: https://docs.cloud.google.com/compute/docs/use-compute-engine-mcp\
Location: **Before you begin**.

**Source statements:**

> “You need both project permissions and billing account permissions.”

> “Project Billing Manager + Project Browser + Service Usage Viewer”

> “Billing Account User + Billing Account Viewer”

Source: https://docs.cloud.google.com/billing/docs/how-to/modify-project\
Location: **Enable billing for an existing project → Permissions required for this task**.

**Interpretation:** Do not request billing-change roles for this path. Service Usage Admin alone does not establish billing authority.

### T1-06 — Preserve setup prerequisites and separate read-only user access

- **Status:** Required for the documented service setup procedure and authenticated server use, with different recipients.
- **Setup actor and scope:** The service setup identity has the following roles on the selected project:
  - **Compute Instance Admin (v1)**
  - **Compute Security Admin**
  - **Service Account User**
  - **Service Usage Admin**
- **Connecting-user recipient and scope:** The selected read-only user receives:
  - **MCP Tool User** (`roles/mcp.toolUser`)
  - **Compute Viewer** (`roles/compute.viewer`)
- **Action:** An authorized project IAM administrator grants missing roles. Use the broad setup identity or helper for the documented setup procedure. Use the intended read-only identity for authorization and the inventory check.

**Source statement:**

> “Make sure that you have the following role or roles on the project: Compute Instance Admin (v1), Compute Security Admin, Service Account User, Service Usage Admin”

Source: https://docs.cloud.google.com/compute/docs/use-compute-engine-mcp\
Location: **Before you begin**.

**Separate server-use statements:**

> “Make MCP tool calls: MCP Tool User (roles/mcp.toolUser)”

> “You also need the roles and permissions required to perform the Compute Engine operations.”

Source: Same page.\
Location: **Required roles** and the text after **Required permissions**.

**Read-only role statement:**

> “Read-only access to get and list Compute Engine resources, without being able to read the data stored on them.”

Source: https://docs.cloud.google.com/compute/docs/access/iam\
Location: **Compute Viewer**.

**Interpretation:** The broad setup prerequisite must not be silently replaced with Compute Viewer. However, the separate server-use rule supports MCP Tool User plus Compute Viewer for the selected inventory operation. Compute Viewer does not permit writes or access to stored disk data.

The applicable narrower authority for API enablement remains Service Usage Admin. Preserve the other source-required setup roles on the setup helper rather than transferring them to every later user. The documentation does not state that every later user needs the full setup role set.

### T1-07 — Accept the User Data Policy with organization authority

- **Status:** Conditional. Applies when Google Auth platform initialization shows the agreement.
- **Who acts:** A person authorized to accept the applicable terms for the organization. The person who makes the configuration change also needs OAuth configuration access.
- **Recipient and scope:** Acceptance applies to the organization’s use of Google API Services and the application configuration.
- **Documented action:** Under **Finish**, review the policy. If authorized and in agreement, select **I agree to the Google API Services: User Data Policy**. Select **Continue**, then **Create**.
- **Value source:** Obtain approval authority from the organization’s responsible business or legal owner.

**Source statement:**

> “Under Finish, review the Google API Services User Data Policy and if you agree, select I agree to the Google API Services: User Data Policy.”

Source: https://developers.google.com/workspace/guides/configure-oauth-consent\
Location: **Configure OAuth consent**.

**Source statement:**

> “The policy below, as well as the Google APIs Terms of Service, govern the use of Google API Services when you request access to Google user data.”

Source: https://developers.google.com/terms/api-services-user-data-policy\
Location: Introduction.

**Source statement:**

> “If you are using the APIs on behalf of an entity, you represent and warrant that you have authority to bind that entity to the Terms”

Source: https://developers.google.com/terms\
Location: **1. Account and Registration → b. Entity Level Acceptance**.

**Interpretation:** Technical permission to configure OAuth is not proof of authority to accept terms for the organization. If the reader lacks that authority, involve an authorized person before acceptance. Google does not name a separate IAM role for this business authority.

### T1-08 — Configure branding, audience, scopes, and test users

- **Status:** Required where configuration is missing. Test-user assignment is conditional on the **External / Testing** path.
- **Who acts:** An application administrator with **OAuth Config Editor** on the OAuth project. Policy acceptance also follows T1-07.
- **Recipients and scope:** The OAuth application receives its branding, audience, and declared scopes. Named users receive test eligibility.
- **Documented actions and values:**
  - Open **Google Auth platform > Branding**.
  - If prompted, select **Get Started**.
  - Supply **App name**, **User support email**, and contact **Email address** from the application owner.
  - Select **Internal** only when the project and intended users meet the organization condition.
  - Otherwise select the approved **External / Testing** path.
  - Configure applicable scope declarations through **Data Access > Add or Remove Scopes**, then **Save**.
  - For External testing, open **Audience > Test users > Add users**. Enter each approved Google Account email address. Select **Save**.
- **Selected client scope values:** Topic 4 supplies:
  - `https://www.googleapis.com/auth/compute.read-only`
  - `https://www.googleapis.com/auth/compute.readonly`

**Authority statements:**

> “Read/write access to OAuth config resources”

The role includes:

> `clientauthconfig.brands.create`\
> `clientauthconfig.brands.update`\
> `oauthconfig.*`\
> `oauthconfig.testusers.update`

Source: https://docs.cloud.google.com/iam/docs/roles-permissions/oauthconfig\
Location: **OAuth Config Editor**.

**Procedure statements:**

> “If you have already configured the Google Auth platform, you can configure the following OAuth Consent Screen settings in Branding, Audience, and Data Access.”

> “Enter your email address and any other authorized test users, then click Save.”

Source: https://developers.google.com/workspace/guides/configure-oauth-consent\
Location: **Configure OAuth consent**.

**Audience and expiry statements:**

> “Projects associated with a Google Cloud Organization can configure Internal users to limit authorization requests to members of the organization.”

> “Authorizations by a test user will expire seven days from the time of consent.”

> “If your OAuth client requests an offline access type and receives a refresh token, that token will also expire.”

Source: https://support.google.com/cloud/answer/15549945\
Location: **Internal** and **Publishing status → Testing**.

**Interpretation:** OAuth Config Editor supplies the applicable application configuration authority. Adding a test user does not grant IAM access. Keep the seven-day warning for the External test path. Configuring requested scopes does not itself grant those scopes on behalf of a user.

### T1-09 — Connect the client and authorize the intended account

- **Status:** Required.
- **Who acts:** The authorized Speakeasy operator configures the remote connection. The intended Google user authorizes application access.
- **Recipients and scope:** Speakeasy receives the selected OAuth credentials and user authorization. Its resource access remains limited by that user’s IAM permissions and authorized scopes.
- **Action and values:** Configure the manual OAuth connection using the selected client ID, secret, and exact callback. Use the fixed endpoint `https://compute.googleapis.com/mcp`. Authorize the intended read-only Google account.
- **Client behavior:** Offline access, consent parameters, token storage, and refresh are coordinator-owned implementation checks, not additional Google administrator grants.

**Source statement:**

> “When configured, the AI application can access resources that the authenticated user has access to, within the scopes that the user has authorized.”

Source: https://docs.cloud.google.com/mcp/set-up-authentication-mcp-servers\
Location: **Authenticate with an OAuth 2.0 client ID and secret**.

**Interpretation:** The user’s consent does not grant project IAM roles. The setup helper’s broader permissions do not transfer to the read-only identity. Google documentation does not establish Speakeasy’s internal role names; the coordinator owns that client authority check.

## Unresolved questions

### Blocking

**None for the selected provider-side setup actions.**

### Non-blocking

- **Broad setup role purpose:** The service page requires the broad setup role set but does not map each role to a specific connection action. Preserve that prerequisite on the setup identity or helper. Do not infer that all later read-only users need it.
- **Organization-specific approval:** Public documentation cannot identify the person authorized to bind this organization to terms. T1-07 supplies a concrete approval boundary; the responsible organization owner must supply the authorized person.
- **Existing restrictions:** The OAuth audience source warns that account restrictions can prevent authorization. No such problem was supplied. Do not add organization-policy changes or Workspace approval steps without an applicable restriction.
- **Speakeasy authority:** The exact client role required to add a source and attach an identity provider remains coordinator-owned. This report does not infer it from Google IAM roles.
- **Unselected actions:** New-project creation, billing changes, service-account creation, ADC, bearer tokens, and DCR are outside this path. Their additional authority is not needed for the selected actions.
- **Release-note confirmation:** Release notes were not confirmed. No replacement notice was found in the inspected maintained setup content.

## Cross-topic dependencies

- **Topic 2:** Use T1-01, T1-02, T1-07, and T1-08 for API, OAuth initialization, policy acceptance, and application settings. No billing-change or project-creation action is selected.
- **Topic 3:** Preserve the broad setup prerequisite on the setup identity. Use **MCP Tool User + Compute Viewer** for the selected later read-only user. Apply Internal membership or External test-user conditions.
- **Topic 4:** Use OAuth Config Editor for provider-side configuration. Keep user consent separate from scope declaration and IAM grants. Retain the seven-day External testing warning.
- **Topic 5:** Keep the fixed global endpoint. No separate MCP deployment authority is required by the documented enablement action.
- **Coordinator:** Use separate helpers where needed. Do not default to full administrator access. Confirm the Speakeasy operator’s client access and complete the client implementation check. Do not authorize the broad setup identity when the intended connection is the read-only user.
## Topic 2 — preserved complete report

## Topic and status

**Topic 2 — complete.** The current instructions establish project selection, billing, Compute Engine API activation, and OAuth application creation. No blocking organization setup gap was found. The coordinator must still select and check the client authentication path.

All sources below were observed on **2026-09-11**. No provider settings or local files were changed.

## Findings

### T2-01 — Select or create a Google Cloud project

- **Status:** Required.
- **Actor and scope:** The setup administrator acts in a Google Cloud project.
- **Action and values:** Sign in to Google Cloud. Open the [project selector](https://console.cloud.google.com/projectselector2/home/dashboard). Select the project that will contain the required Compute Engine resources, or create a project. Obtain the project choice from the cloud administrator.
- **Authority:** Selection is available for a project on which the administrator has a role. Project creation requires the Project Creator role.
- **Source:** https://docs.cloud.google.com/compute/docs/use-compute-engine-mcp\
  Location: **Before you begin → Roles required to select or create a project**.
- **Exact quotations:**
  > “In the Google Cloud console, on the project selector page, select or create a Google Cloud project.”

  > “Selecting a project doesn't require a specific IAM role—you can select any project that you've been granted a role on.”

  > “To create a project, you need the Project Creator role (`roles/resourcemanager.projectCreator`), which contains the `resourcemanager.projects.create` permission.”
- **Interpretation:** An existing project is a documented choice. A separate project for MCP is not a stated requirement.

### T2-02 — Enable billing for the project

- **Status:** Required.
- **Actor and scope:** The project and billing administrators act on the selected project and its Cloud Billing account.
- **Action and values:** Verify that billing is enabled for the selected project. The project must be linked to an active Cloud Billing account in good standing. Obtain the billing account choice from the billing administrator.
- **Source 1:** https://docs.cloud.google.com/compute/docs/use-compute-engine-mcp\
  Location: **Before you begin**.
- **Exact quotation:**
  > “Verify that billing is enabled for your Google Cloud project.”
- **Source 2:** https://docs.cloud.google.com/billing/docs/how-to/verify-billing-enabled\
  Location: **Check if billing is enabled on a project**.
- **Exact quotations:**
  > “The project is linked to a Cloud Billing account.”

  > “The linked Cloud Billing account is active and in good standing—that is, the billing account isn't closed or suspended.”
- **Interpretation:** Project existence alone does not satisfy this prerequisite. Topic 1 must verify authority if the project needs a billing change.

### T2-03 — Enable the Compute Engine API

- **Status:** Required.
- **Actor and scope:** An administrator with API activation authority acts in the selected project.
- **Action and values:** Use **Enable the Compute Engine API** in the service-specific setup page. Enable that API for the selected project.
- **Authority:** The Service Usage Admin role includes the required API activation permission.
- **Source 1:** https://docs.cloud.google.com/compute/docs/use-compute-engine-mcp\
  Locations: introduction and **Before you begin**.
- **Exact quotations:**
  > “The Compute Engine remote MCP server is enabled when you enable the Compute Engine API.”

  > “Enable the Compute Engine API.”
- **Source 2:** https://docs.cloud.google.com/mcp/enable-disable-mcp-servers\
  Location: **Enable a supported product**.
- **Exact quotations:**
  > “To connect to a supported product through MCP, enable the product API.”

  > “To enable APIs, you need the Service Usage Admin IAM role (`roles/serviceusage.serviceUsageAdmin`), which contains the `serviceusage.services.enable` permission.”
- **Interpretation:** The current activation action is product API activation. These instructions do not direct the administrator to create an MCP deployment or perform a separate MCP activation command.

### T2-04 — Create an OAuth client for the manual OAuth path

- **Status:** Conditional. Applies when the coordinator selects authentication with an OAuth client ID and secret.
- **Actor and scope:** The application administrator creates an OAuth client in a Google Cloud project. The AI application uses that client. The connecting user supplies the user authorization.
- **Documented action:**
  1. Open **Google Auth Platform > Clients > Create client** at https://console.cloud.google.com/auth/clients/create.
  2. Select **Web application** in **Application type** for an application accessed through the internet.
  3. Enter an application name in **Name**.
  4. In **Authorized JavaScript origins**, use **+ Add URI** and enter the applicable origin in **URIs** when the application uses client-side JavaScript to access Google APIs.
  5. In **Authorized redirect URIs**, use **+ Add URI** and enter the application-provided redirect URL in **URIs**.
  6. Click **Create**.
  7. In **OAuth 2.0 client created**, copy the **Client secret** from **Client secrets** and keep it in secure storage.
- **Value sources:** The administrator supplies the application name. The client documentation supplies the redirect URL. The application owner supplies any required JavaScript origin. The coordinator must confirm the use of `{{ gram.oauth.callback_url }}` for this client.
- **Source:** https://docs.cloud.google.com/mcp/set-up-authentication-mcp-servers\
  Locations: **Authenticate with an OAuth 2.0 client ID and secret → Create an OAuth 2.0 client ID and secret → Web**.
- **Exact quotations:**
  > “If you access your application through the internet, then select Web.”

  > “Your application's documentation should provide the redirect URL. Custom redirect URLs aren't supported.”

  > “Applications that use client-side JavaScript to access Google's APIs must specify the authorized JavaScript Origins.”

  > “In the Application type list, select Web application.”

  > “In the Client secrets section, copy the Client secret and save it in a secure place. You can only copy it once. If you lose it, delete the secret and create a new one.”
- **Interpretation:** A web OAuth client is the documented choice for an internet-accessed application. Do not substitute a desktop client without a client-specific reason. Do not invent a JavaScript origin.
- **Authority:** The inspected procedure explains client creation but does not establish the administrator role. Topic 1 must verify that authority.

### T2-05 — Configure the Google Auth platform and consent settings

- **Status:** Conditional. Applies to a project used for the OAuth client path, if its Google Auth platform is not configured. Later changes apply when the application audience or scopes change.
- **Actor and scope:** The application administrator configures the OAuth application in its Google Cloud project.
- **Documented action and values:**
  - Open **Google Auth platform > Branding**.
  - If **Google Auth platform not configured yet** appears, click **Get Started**.
  - Under **App Information**, enter **App name** and choose **User support email**. Click **Next**.
  - Under **Audience**, select the user type. Click **Next**.
  - Under **Contact Information**, enter an **Email address**. Click **Next**.
  - Under **Finish**, review the policy. If approved by the responsible administrator, select **I agree to the Google API Services: User Data Policy**. Click **Continue**, then **Create**.
  - Existing configurations are managed in **Branding**, **Audience**, and **Data Access**.
  - For an application used outside the Google Workspace organization, the source directs the administrator to **Data Access > Add or Remove Scopes**, select the required scopes, and click **Save**.
- **Value sources:** Obtain the application name, support address, contact address, and audience choice from the application owner. Topic 4 must supply the selected Compute Engine scopes.
- **Source:** https://developers.google.com/workspace/guides/configure-oauth-consent\
  Location: **Configure OAuth consent**. This is shared Google OAuth configuration documentation, not a Compute Engine-specific scope list.
- **Exact quotations:**
  > “If you have already configured the Google Auth platform, you can configure the following OAuth Consent Screen settings in Branding, Audience, and Data Access.”

  > “If you see a message that says Google Auth platform not configured yet, click Get Started.”

  > “Under Audience, select the user type for your app.”

  > “If you're creating an app for use outside of your Google Workspace organization, click Data Access > Add or Remove Scopes.”

  > “After selecting the scopes required by your app, click Save.”
- **Interpretation:** These are project-level application settings. They do not grant Compute Engine IAM permissions.
- **Authority:** Topic 1 must verify authority for application configuration and policy acceptance.

### T2-06 — Add users for an External test application

- **Status:** Conditional. Applies to the External test configuration described in the consent setup procedure.
- **Actor and scope:** The application administrator adds users to the OAuth application's test user list.
- **Action:** Open **Audience**. Under **Test users**, click **Add users**. Enter the authorized test users' email addresses. Click **Save**.
- **Source:** https://developers.google.com/workspace/guides/configure-oauth-consent\
  Location: **Configure OAuth consent**.
- **Exact quotation:**
  > “If you selected External for user type, add test users.”

  > “Enter your email address and any other authorized test users, then click Save.”
- **Interpretation:** This is an individual user access condition, although an administrator performs the action. Topic 3 owns the final eligibility finding. Topic 4 owns any testing-state effect on tokens.

### T2-07 — Additional MCP security configuration is optional

- **Status:** Explicitly not required as an additional configuration task by the shared activation page. Existing organization restrictions can still apply.
- **Actor and scope:** The security administrator can configure controls for the organization or project.
- **Action:** Review the linked security guidance if the organization requires additional controls. Do not add a security product deployment as a universal activation step.
- **Source:** https://docs.cloud.google.com/mcp/enable-disable-mcp-servers\
  Location: **Optional security and safety configurations**.
- **Exact quotation:**
  > “Google Cloud offers defaults and customizable policies to control the use of MCP tools in your Google Cloud organization or project.”
- **Interpretation:** The section identifies additional configuration as optional. It does not establish that every existing organization policy permits this connection.

## Unresolved questions

- **Non-blocking — Preview or early-access enrollment.** The current Compute Engine setup page and shared API activation page give a concrete activation procedure without an enrollment step. No enrollment requirement was found. This does not prove that all access-program restrictions are absent.
- **Non-blocking — Existing organization restrictions.** The inspected security pages do not establish the settings of the user's organization. No specific restriction was supplied in the run input. Do not direct the administrator to weaken a policy without a documented need.
- **Non-blocking — OAuth application authority.** The OAuth procedure is concrete, but the inspected source does not name the required administrator role. Topic 1 must verify it.
- **Non-blocking — Application audience and verification.** The run input does not identify an Internal application, an External test application, or a public production application. The coordinator must select the applicable path with Topics 3 and 4. Do not assume that public application verification is required for this trial.
- **Non-blocking for Topic 2 — Client callback and JavaScript origin.** Provider-side fields and value sources are documented. The coordinator owns the required client implementation checks.
- **Non-blocking — Release-note confirmation.** The live setup pages were checked. No replacement notice was found in the inspected content. Release notes were not confirmed within the research time limit.

## Cross-topic dependencies

- **Topic 1:** Verify authority for project creation, billing changes, API activation, OAuth application configuration, and policy acceptance. Use T2-01 and T2-03 for the documented project and API roles.
- **Topic 3:** Use T2-06 for External test user assignment. Separately check `roles/mcp.toolUser` and the IAM permissions for the required Compute Engine operations. OAuth application configuration does not grant those permissions.
- **Topic 4:** Use T2-04 and T2-05 for OAuth client creation and consent settings. Confirm exact scopes, token settings, and testing-state limits.
- **Topic 5:** Use T2-03. Current Compute Engine MCP activation follows Compute Engine API activation.
- **Coordinator:** Select the authentication and audience path. Check the application-provided callback and whether JavaScript origins apply. Do not infer automatic OAuth behavior from the provider's client creation procedure.
## Topic 3 — preserved complete report

## Topic and status

**Topic 3 — complete.** The current Google instructions establish the connecting user's MCP permission, Compute Engine resource permissions, and conditional OAuth application access. No blocking gap was found.

**Observation date for all sources: 2026-09-11.** Public pages only were checked. No provider settings or local files were changed.

## Findings

### T3-01 — Permission to call MCP tools

- **Status:** Required.
- **Actor and scope:** An IAM administrator grants access to the connecting identity on the Google Cloud project.
- **Requirement:** The identity needs `mcp.tools.call`. Google specifies **MCP Tool User** (`roles/mcp.toolUser`). A custom role or another predefined role can also supply the permission.
- **Documented action:** In the Google Cloud console, open **IAM** and select the project. Select **Grant access**. In **New principals**, enter the connecting identity's identifier, usually its Google Account email address. Use **Select a role** to select **MCP Tool User**, then select **Save**. Obtain the project and identity from the cloud resource owner.
- **Source:** https://docs.cloud.google.com/compute/docs/use-compute-engine-mcp
  - **Location:** **Required roles** and **Required permissions**.
  - **Quotation:** “Make MCP tool calls: MCP Tool User (`roles/mcp.toolUser`)”
  - **Quotation:** “Make MCP tool calls: `mcp.tools.call`”
  - **Quotation:** “You might also be able to get these permissions with custom roles or other predefined roles.”
  - **Location:** **Before you begin → Grant the roles**.
  - **Quotation:** “In the New principals field, enter your user identifier. This is typically the email address for a Google Account.”
- **Interpretation:** Resource permissions alone do not satisfy the documented permission to call MCP tools.

### T3-02 — Permission to use the underlying Compute Engine resources

- **Status:** Required. The necessary permissions depend on the requested operations.
- **Actor and scope:** An IAM administrator grants the connecting identity access to the applicable project or resources.
- **Requirement:** The identity also needs the Compute Engine permissions for each operation.
- **Documented action and values:** Use the linked Compute Engine role reference to select roles for the approved operations. Obtain the project, resources, and approved operations from the resource owner.
- **Source:** https://docs.cloud.google.com/compute/docs/use-compute-engine-mcp
  - **Location:** **Required roles**, after **Required permissions**.
  - **Quotation:** “You also need the roles and permissions required to perform the Compute Engine operations.”
- **Source:** https://docs.cloud.google.com/compute/docs/access/iam
  - **Location:** **Compute Viewer** (`roles/compute.viewer`).
  - **Quotation:** “Read-only access to get and list Compute Engine resources, without being able to read the data stored on them.”
- **Interpretation:** Compute Viewer is a documented role for resource inventory. It does not grant access to disk contents. It is not sufficient for write operations. This report does not select a final resource role because the input does not specify the required operations.

### T3-03 — Broad role set in the service setup procedure

- **Status:** Required for the documented service setup procedure.
- **Actor and scope:** The setup identity must have these roles on the selected project. An authorized IAM administrator grants missing roles.
- **Documented values:** **Compute Instance Admin (v1)**, **Compute Security Admin**, **Service Account User**, and **Service Usage Admin**.
- **Documented check:** Open **IAM** and select the project. Find rows in the **Principal** column for the identity or its groups. Check the **Role** column. Contact the administrator to establish group membership.
- **Source:** https://docs.cloud.google.com/compute/docs/use-compute-engine-mcp
  - **Location:** **Before you begin**.
  - **Quotation:** “Make sure that you have the following role or roles on the project: Compute Instance Admin (v1), Compute Security Admin, Service Account User, Service Usage Admin”
  - **Location:** **Check for the roles**.
  - **Quotation:** “In the Principal column, find all rows that identify you or a group that you're included in.”
- **Interpretation:** Preserve this role set as a setup prerequisite. Do not silently replace it with Compute Viewer. The separate **Required roles** section establishes MCP Tool User plus operation-specific permissions for server use. Topic 1 must distinguish the setup identity from each later connecting identity.

### T3-04 — Authority to grant project IAM access

- **Status:** Required when an administrator must add or change the project role grants.
- **Actor and scope:** An administrator with project IAM management permission grants access to the connecting identity.
- **Documented value:** **Project IAM Admin** (`roles/resourcemanager.projectIamAdmin`) is an applicable predefined role.
- **Source:** https://docs.cloud.google.com/iam/docs/granting-changing-revoking-access
  - **Location:** **Required roles**.
  - **Quotation:** “To manage access to a project: Project IAM Admin (`roles/resourcemanager.projectIamAdmin`)”
  - **Location:** **Required permissions**.
  - **Quotation:** “To manage access to projects: `resourcemanager.projects.getIamPolicy` `resourcemanager.projects.setIamPolicy`”
- **Interpretation:** A connecting user without this authority must ask an authorized administrator for the grants. Topic 1 must use this evidence for the grant action.

### T3-05 — Eligible identity and limits of user-based access

- **Status:** Required for authenticated resource access.
- **Actor and scope:** The connecting identity must have access to the target Google Cloud resources.
- **Documented action:** Select the intended Google Cloud identity and grant its permissions. Do not treat OAuth application access as a replacement for resource access.
- **Source:** https://docs.cloud.google.com/compute/docs/use-compute-engine-mcp
  - **Location:** **Authentication and authorization**.
  - **Quotation:** “All Google Cloud identities are supported for authentication to MCP servers.”
- **Source:** https://docs.cloud.google.com/mcp/authenticate-mcp
  - **Location:** **OAuth client ID**.
  - **Quotation:** “When configured, the MCP client can access Google and Google Cloud resources that the authenticated user has access to, within the scopes that the user has authorized.”
- **Interpretation:** IAM resource access and authorized OAuth scopes both limit user-based access. Token configuration belongs to Topic 4.

### T3-06 — Test-user assignment for an OAuth application in Testing

- **Status:** Conditional. Applies when the selected OAuth application has publishing status **Testing** and requests Compute Engine scopes.
- **Actor and scope:** The person who manages the OAuth application adds each connecting user's email address to that application's test-user list.
- **Documented action:** Open **Audience**. Under **Test users**, select **Add users**. Enter the authorized test users' email addresses, then select **Save**.
- **Source:** https://support.google.com/cloud/answer/15549945
  - **Location:** **Publishing status → Testing**.
  - **Quotation:** “Projects configured with a publishing status of Testing are limited to up to 100 test users listed in the OAuth consent screen.”
  - **Quotation:** “If your app requests any other OAuth scopes, then this exception does not apply.”
  - **Context:** The exception covers the listed name, email, and profile scopes, not Compute Engine scopes.
- **Source:** https://developers.google.com/workspace/guides/configure-oauth-consent
  - **Location:** **Configure OAuth consent**, test-user steps.
  - **Quotation:** “Under Test users, click Add users.”
  - **Quotation:** “Enter your email address and any other authorized test users, then click Save.”
- **Interpretation:** IAM access does not replace test-user assignment. Topic 1 must check the application manager's authority. Topic 2 must establish the selected application's audience and publishing status.

### T3-07 — Organization membership for an Internal OAuth application

- **Status:** Conditional. Applies when the OAuth application uses **Internal** users.
- **Actor and scope:** The application owner selects the audience. The connecting user must be a member of the associated organization.
- **Documented action:** Check that the intended connecting user belongs to the Google Cloud project's parent organization. Obtain the organization and membership information from its administrator.
- **Source:** https://support.google.com/cloud/answer/15549945
  - **Location:** **Internal**.
  - **Quotation:** “Projects associated with a Google Cloud Organization can configure Internal users to limit authorization requests to members of the organization.”
  - **Quotation:** “An org_internal authorization error is displayed when authorization is requested from users outside the Google Cloud project's parent.”
- **Interpretation:** Project IAM access does not, by itself, establish eligibility for an Internal OAuth application.

### T3-08 — Tool discovery does not require authentication

- **Status:** Explicitly not required for `tools/list` only.
- **Actor and scope:** The client can request the server's tool list without a connecting-user grant for authenticated resource access.
- **Source:** https://docs.cloud.google.com/compute/docs/use-compute-engine-mcp
  - **Location:** **List tools**.
  - **Quotation:** “The tools/list method doesn't require authentication.”
- **Interpretation:** A successful tool list does not prove that the user can call resource tools.

## Unresolved questions

- **Non-blocking — Exact resource role selection.** The input does not specify read-only use or particular write operations. The service setup page and Compute Engine IAM reference establish the selection rule. The resource owner must supply the approved operations.
- **Non-blocking — Broad setup roles for later users.** The setup page lists the broad prerequisite role set in T3-03. Its separate server-use section requires MCP Tool User and operation permissions. It does not clearly assign every prerequisite role to every later connecting user. Topic 1 must preserve this distinction.
- **Non-blocking — Account restrictions.** The Google OAuth audience page states: “A test user may be unable to authorize scopes requested by your project's OAuth clients due to the availability of Google Services for the account or configured restrictions.” It also identifies Advanced Protection as a possible restriction. The input reports no such restriction. Do not add a universal allowlist action without applicable evidence.
- **Non-blocking — Other licenses, assignments, or individual settings.** No additional requirement was established in the inspected service setup, IAM, authentication, and OAuth audience pages. This is not evidence that such requirements are absent in every organization.
- **Non-blocking — Release-note confirmation.** Live maintained pages were read. No replacement notice was found in the inspected text. Release notes were not confirmed within the research period.
- **Non-blocking — Initial authentication URL.** The supplied `set-up-authentication-mcp-servers` page did not provide usable evidence in these reads. The maintained `authenticate-mcp` page supplied the user-access statement in T3-05.

## Cross-topic dependencies

- **Topic 1:** Verify authority for the IAM grants in T3-01 to T3-04. Verify authority to add OAuth test users. Separate setup roles from later user permissions.
- **Topic 2:** Establish OAuth audience and publishing status. Apply T3-06 or T3-07 as applicable.
- **Topic 4:** Apply the user's IAM limits as well as OAuth scopes. The OAuth audience source states: “Authorizations by a test user will expire seven days from the time of consent.” It also states that an issued offline refresh token expires. Check this condition for the selected setup path.
- **Topic 5:** Use T3-08 only for discovery. Resource tool calls still require authorized access.
- **Coordinator:** Obtain the intended operations before selecting resource roles. A successful connection or tool list is not a complete permission check. No client implementation conclusion is made in this report.
## Topic 4 — preserved complete report

## Topic and status

**Topic 4 — complete for provider authentication research.** The current instructions support a concrete read-only scope configuration:

- MCP scope: `https://www.googleapis.com/auth/compute.read-only`
- Resource API scope: `https://www.googleapis.com/auth/compute.readonly`

Use both scopes for a read-only connection that lists VM instances. This selection follows the provider's instructions for MCP scopes and additional resource scopes. It is a documented setup choice, not a tested connection.

The coordinator still owns the required client implementation review. This report does not infer lack of client support from missing client evidence.

**Observation date for all findings: 2026-09-11.**

### Corrections to the previous report

- **T4-08 is replaced.** Different MCP and API scope strings do not, by themselves, establish a conflict. The MCP page expressly allows additional resource scopes. The two read-only scopes give a concrete setup at the documented level of detail.
- **The previous blocking scope question is closed.**
- **The previous client-support question is transferred to the coordinator's compatibility review.** It is not a finding that the client lacks support.
- T4-01 through T4-07, T4-09, and T4-10 retain their source facts. T4-11 adds a concrete read-only action.

## Findings

### T4-01 — OAuth authentication

- **Status:** Required for authenticated Compute Engine resource access.
- **Actor, recipient, and scope:** The client administrator configures OAuth. The connecting user grants access to the application. Access applies to resources that the user can access.
- **Documented action:** Configure OAuth credentials and the required scopes in the MCP client.
- **Source:** https://docs.cloud.google.com/compute/docs/use-compute-engine-mcp\
  **Location:** Authentication and authorization.
- **Quotation:**
  > “Compute Engine MCP servers use the OAuth 2.0 protocol with Identity and Access Management (IAM) for authentication and authorization.”
- **Supporting source:** https://docs.cloud.google.com/mcp/set-up-authentication-mcp-servers\
  **Location:** Authenticate with an OAuth 2.0 client ID and secret.
- **Quotation:**
  > “When configured, the AI application can access resources that the authenticated user has access to, within the scopes that the user has authorized.”
- **Interpretation:** OAuth consent does not replace IAM permissions.

### T4-02 — Web application client registration

- **Status:** Conditional. Applies to the manual OAuth path for the supplied web-based client.
- **Actor, recipient, and scope:** An authorized application administrator creates the OAuth client in the selected Google Cloud project. The MCP client uses its credentials. Topic 1 supplies the authority finding.
- **Documented action and values:**
  - Open **Google Auth Platform > Clients > Create client**.
  - Select **Web application** in **Application type**.
  - Enter an application name in **Name**.
  - Add the client-supplied callback URL under **Authorized redirect URIs**.
  - Select **Create**.
  - Copy the client secret from **Client secrets** in the **OAuth 2.0 client created** dialog. Store it securely.
  - Use this registration's client ID and client secret in the MCP client.
- **Source:** https://docs.cloud.google.com/mcp/set-up-authentication-mcp-servers\
  **Locations:** Authenticate with an OAuth 2.0 client ID and secret; Create a client ID for a web application.
- **Quotations:**
  > “If you access your application through the internet, then select Web.”
  > “In the Authorized redirect URIs section, click + Add URI, and then enter REDIRECT_URL in the URIs field.”
  > “You can only copy it once.”
- **Interpretation:** This is the applicable provider registration type. Client behavior remains subject to the coordinator's review.

### T4-03 — Callback URL and JavaScript origins

- **Status:** Required for the callback URL. Conditional for JavaScript origins when client-side JavaScript accesses Google APIs.
- **Actor, recipient, and scope:** The application administrator configures the OAuth registration. The coordinator supplies the client-specific values.
- **Documented values:** Use the callback URL from the client documentation. The supplied client context gives `{{ gram.oauth.callback_url }}` as its template; use the resolved URL.
- **Source:** https://docs.cloud.google.com/mcp/set-up-authentication-mcp-servers\
  **Location:** Create an OAuth 2.0 client ID and secret — Web.
- **Quotations:**
  > “Your application's documentation should provide the redirect URL. Custom redirect URLs aren't supported.”
  > “Applications that use client-side JavaScript to access Google's APIs must specify the authorized JavaScript Origins.”
- **Supporting source:** https://developers.google.com/identity/protocols/oauth2/web-server?hl=en\
  **Location:** Step 1: Set authorization parameters — `redirect_uri`.
- **Quotation:**
  > “Note that the http or https scheme, case, and trailing slash ('/') must all match.”
- **Interpretation:** Register the exact client callback URL. Do not invent a callback URL or JavaScript origin.

### T4-04 — Offline access for refresh tokens

- **Status:** Required for the preferred OAuth path with refresh tokens.
- **Actor, recipient, and scope:** The client sends the authorization request. The user grants consent. The client receives the tokens.
- **Required values:**
  - Authorization endpoint: `https://accounts.google.com/o/oauth2/v2/auth`
  - `response_type=code`
  - `access_type=offline`
  - Token endpoint: `https://oauth2.googleapis.com/token`
  - Registered client ID, client secret, exact callback URL, and selected scopes.
- **Source:** https://developers.google.com/identity/protocols/oauth2/web-server?hl=en\
  **Locations:** Step 1: Set authorization parameters; Step 5: Exchange authorization code for refresh and access tokens.
- **Quotations:**
  > “Set the value to offline if your application needs to refresh access tokens when the user is not present at the browser.”
  > “This value instructs the Google authorization server to return a refresh token and an access token the first time that your application exchanges an authorization code for tokens.”
  > “Set the parameter value to code for web server applications.”
- **Interpretation:** Request offline access through the documented authorization parameter. Do not substitute an assumed `offline_access` scope.

### T4-05 — Initial consent and token storage

- **Status:** Required to obtain and retain refresh-token access. The consent-prompt parameter is conditional when consent must be requested during the initial connection.
- **Actor, recipient, and scope:** The user approves access. The client receives and securely stores the tokens.
- **Documented action:** Request offline access. The optional `prompt=consent` value requests a consent prompt.
- **Source:** https://developers.google.com/identity/protocols/oauth2/web-server?hl=en\
  **Locations:** Step 1: Set authorization parameters; Step 3: Google prompts user for consent; token response.
- **Quotations:**
  > “The refresh_token is only returned on the first authorization.”
  > “consent — Prompt the user for consent.”
  > “Your application should store both tokens in a secure, long-lived location that is accessible between different invocations of your application.”
- **Interpretation:** A successful sign-in alone does not establish that the client received and stored a refresh token. The coordinator must check initial token handling.

### T4-06 — Testing status limits access

- **Status:** Conditional. Applies to an external OAuth application with publishing status **Testing**.
- **Actor, recipient, and scope:** The application administrator configures the audience and publishing status. The connecting account receives test access.
- **Documented action:** Add the connecting account as a test user for a testing path. For a production path, assess the applicable publishing and verification requirements.
- **Source:** https://support.google.com/cloud/answer/15549945?hl=en\
  **Locations:** Publishing status — Testing; In Production.
- **Quotations:**
  > “Projects configured with a publishing status of Testing are limited to up to 100 test users listed in the OAuth consent screen.”
  > “Authorizations by a test user will expire seven days from the time of consent.”
  > “A project's publishing status is considered In production after selecting the Publish app button.”
- **Supporting source:** https://developers.google.com/identity/protocols/oauth2?hl=en\
  **Location:** Refresh token expiration.
- **Quotation:**
  > “A Google Cloud Platform project with an OAuth consent screen configured for an external user type and a publishing status of ‘Testing’ is issued a refresh token expiring in 7 days”
- **Interpretation:** The exception for basic identity scopes does not cover Compute Engine access. Publishing can introduce verification requirements.
- **Warning:** Testing access expires after seven days and requires another sign-in.

### T4-07 — Refresh tokens can expire or stop working

- **Status:** Conditional. Applies when token limits, user actions, or organization policies affect access.
- **Actor, recipient, and scope:** The user, Google token service, or organization administrator can affect the application's continued access.
- **Documented limits:** Six months without use, user revocation, time-based consent, and token-count limits can end access. Google Cloud session control can require another authentication session.
- **Source:** https://developers.google.com/identity/protocols/oauth2?hl=en\
  **Locations:** Refresh token expiration; Dealing with session control policies for Google Cloud Platform (GCP) organizations.
- **Quotations:**
  > “The refresh token has not been used for six months.”
  > “There is currently a limit of 100 refresh tokens per Google Account per OAuth 2.0 client ID.”
  > “The user granted time-based access to your app and the access expired.”
  > “This policy impacts … any third party OAuth application that requires the Cloud Platform scope.”
- **Supporting source:** https://developers.google.com/identity/protocols/oauth2/web-server?hl=en\
  **Location:** Token response — `refresh_token_expires_in`.
- **Quotation:**
  > “This value is only set when the user grants time-based access.”
- **Interpretation:** Refresh tokens do not guarantee permanent access. The cited session-control statement specifically includes applications that request the Cloud Platform scope; it does not establish the same result for every scope set.
- **Warning:** User or organization policy can require another sign-in.

### T4-08 — Read-only scope selection — replaced

- **Status:** Required for the selected read-only setup.
- **Actor, recipient, and scope:** The client administrator configures both scope values. The connecting user grants the application access.
- **Selected values:**
  ```text
  https://www.googleapis.com/auth/compute.read-only
  https://www.googleapis.com/auth/compute.readonly
  ```
- **Source 1:** https://docs.cloud.google.com/compute/docs/use-compute-engine-mcp\
  **Location:** Compute Engine MCP OAuth scopes.
- **Quotations:**
  > “Compute Engine has the following MCP tool OAuth scopes:”
  > “https://www.googleapis.com/auth/compute.read-only”
  > “Only allows access to read data.”
  > “Additional scopes might be required on the resources accessed during a tool call.”
  > “To view a list of scopes required for Compute Engine, see Compute Engine API.”
- **Source 2:** https://developers.google.com/identity/protocols/oauth2/scopes?hl=en#compute\
  **Location:** Compute Engine API, v1.
- **Quotation:** The table associates `https://www.googleapis.com/auth/compute.readonly` with:
  > “View your Google Compute Engine resources”
- **Source 3:** https://docs.cloud.google.com/compute/docs/reference/rest/v1/instances/list\
  **Location:** Authorization scopes.
- **Quotation:**
  > “Requires one of the following OAuth scopes:”

  The list includes `https://www.googleapis.com/auth/compute.readonly`, `https://www.googleapis.com/auth/compute`, and `https://www.googleapis.com/auth/cloud-platform`.
- **Source 4:** https://docs.cloud.google.com/mcp/set-up-authentication-mcp-servers\
  **Location:** Add the client ID to your MCP server configuration.
- **Quotation:**
  > “SCOPE_1, SCOPE_2: the scopes needed to use the MCP server.”
- **Interpretation:** Keep the MCP scope as written. Add the documented read-only resource scope. This follows the two scope categories described by the provider. It does not require replacing either string or selecting a write-capable scope.
- **Correction:** The previous report treated the different strings as an unresolved configuration conflict. That was too strict. The provider's instructions support this concrete selection without a combined example.

### T4-09 — Static bearer-token alternative

- **Status:** Conditional. Applies if the coordinator selects static upstream headers.
- **Actor, recipient, and scope:** The connecting identity obtains a token. The client administrator adds the token and project ID to the connection.
- **Documented action:** Obtain a token with `gcloud auth print-access-token`. Configure:
  - `Authorization: Bearer TOKEN`
  - `x-goog-user-project: PROJECT_ID`
- **Source:** https://docs.cloud.google.com/mcp/set-up-authentication-mcp-servers\
  **Location:** Authenticate with a bearer token.
- **Quotation:**
  > “By default, bearer tokens expire after 1 hour.”
- **Supporting source:** https://docs.cloud.google.com/sdk/gcloud/reference/auth/print-access-token\
  **Location:** FLAGS — `--lifetime`.
- **Quotations:**
  > “This flag is for service account impersonation only”
  > “The org policy constraint constraints/iam.allowServiceAccountCredentialLifetimeExtension must be set if you want to extend the lifetime beyond 3600 seconds.”
- **Interpretation:** Static headers match a supplied client capability, but documented token creation requires a command-line tool. This is not the preferred browser-based setup.
- **Warning:** A static access token normally stops working after one hour.

### T4-10 — Other authentication methods

- **Status:** Conditional for alternative-path selection.
- **Actor, recipient, and scope:** The coordinator selects a method supported by both the provider and the client.
- **Source:** https://docs.cloud.google.com/mcp/set-up-authentication-mcp-servers\
  **Locations:** Authentication methods; Authenticate with an API Key; Limitations.
- **Quotations:**
  > “Standard API keys can only be used to authenticate to services that don't require a principal.”
  > “Google and Google Cloud remote MCP servers don't support Dynamic Client Registration or OAuth Client ID Metadata Documents.”
- **Supporting source:** https://docs.cloud.google.com/mcp/authenticate-mcp\
  **Location:** ADC for MCP servers.
- **Quotation:**
  > “If you use an ADC generated bearer token for authentication, then you need to re-authenticate every hour”
- **Interpretation:** Do not select DCR. A standard API key is not an established method for authenticated Compute Engine resource access. ADC compatibility remains a client question, not a finding of incompatibility.

### T4-11 — Concrete read-only action — new

- **Status:** Conditional. Applies when the setup check lists VM instances in a known project and zone.
- **Actor, recipient, and scope:** The connecting user calls the MCP tool through the client. Access applies to the selected project's VM instances in the selected zone.
- **Documented action and values:** Call `list_instances`. Supply:
  - `project`: the Google Cloud project ID.
  - `zone`: the zone that contains the instances.

  Obtain these values from the resource owner or the selected Google Cloud environment.
- **Source:** https://docs.cloud.google.com/compute/docs/reference/mcp/list_instances\
  **Locations:** Tool: list_instances; Input Schema; Tool Annotations.
- **Quotations:**
  > “Lists Compute Engine virtual machine (VM) instances.”
  > “Requires project and zone as input.”
  > “Required. Project ID for this request.”
  > “Required. The zone of the instances.”
  > “Read Only Hint: ✅”
- **Supporting source:** https://docs.cloud.google.com/compute/docs/reference/rest/v1/instances/list\
  **Locations:** Authorization scopes; IAM Permissions.
- **Quotations:**
  > “Requires one of the following OAuth scopes:”
  > “compute.instances.list”
- **Interpretation:** T4-08 gives the MCP read scope and a documented read-only resource scope for this type of action. Topic 3 must provide the necessary IAM access. This research did not call the tool or test credentials.

## Unresolved questions

### Blocking

**No blocking provider-authentication gap remains for the documented read-only scope setup.**

### Non-blocking

1. **Client implementation review — coordinator-owned.**\
   The coordinator must use client evidence to check authorization parameters, callback handling, initial consent, secure token storage, and refresh-token use. This remains an explicit compatibility review, not proof of missing support. No client source was researched in this follow-up.

2. **Combined scope example and runtime result.**\
   The checked MCP setup page, MCP tool reference, OAuth scope catalog, and REST method reference do not show a worked authorization request with both selected scopes. They also do not prove a live token exchange. The documented scope categories are sufficient to specify the setup; the missing combined example does not block it.

3. **Conditional JavaScript origin.**\
   The supplied client context does not establish whether client-side JavaScript accesses Google APIs. The coordinator must determine whether the documented condition applies.

4. **OAuth authority.**\
   The follow-up reports that Topic 1 established OAuth Config Editor authority. The final report must use Topic 1's official source evidence. This topic does not independently extend that role to IAM grants or organization-policy changes.

5. **Release-note confirmation.**\
   No replacement notice was found in the inspected setup content. Release notes were not confirmed. The rechecked REST method page shows **Last updated 2026-09-07 UTC**; the MCP tool page shows **Last updated 2026-04-23 UTC**. The date difference does not prevent the documented action.

## Cross-topic dependencies

- **Topic 1:** Supply authority evidence for OAuth configuration. Keep IAM grants and organization-policy changes separate.
- **Topic 2:** Use T4-02, T4-03, and T4-06 for registration, callback, audience, publishing, and verification.
- **Topic 3:** Confirm MCP-call permission and resource permissions for `list_instances`. Check test-user eligibility and applicable account or organization restrictions.
- **Topic 5:** Retain the confirmed endpoint. Use the documented project header if the bearer-token alternative is selected.
- **Coordinator:** Use both exact scope strings in T4-08 for the read-only path. Do not replace them with write-capable scopes.
- **Coordinator:** Complete the client implementation review with central evidence. Prefer OAuth with refresh tokens when the checks pass.
- **Coordinator:** Use T4-11 as a concrete read-only connection check with an environment-specific project ID and zone.
## Topic 5 — preserved complete report

## Topic and status

**Topic 5 — complete.** Google documents a remote Compute Engine MCP server at **`https://compute.googleapis.com/mcp`**. The client can connect directly to this URL. No blocking endpoint gap was found.

Observation date for all sources: **2026-09-11**. The Compute Engine setup page shows **“Last updated 2026-09-03 UTC.”**

## Findings

### T5-01 — Remote server address

- **Status:** Required.
- **Actor and scope:** The client administrator configures the connection in the AI application.
- **Documented values:**
  - Server name: `Compute Engine MCP server`
  - Server URL: `https://compute.googleapis.com/mcp`
  - Transport: `HTTP`
- **Source statement:** The setup page gives these values:
  > “Server name: Compute Engine MCP server”\
  > “Server URL or Endpoint: https://compute.googleapis.com/mcp”\
  > “Transport: HTTP”
- **Source:** https://docs.cloud.google.com/compute/docs/use-compute-engine-mcp\
  Section: **Configure an MCP client to use the Compute Engine MCP server**.
- **Interpretation:** This is a documented remote MCP connection. A local process, proxy, or bridge is not part of this documented connection.

### T5-02 — Shared global endpoint

- **Status:** Required.
- **Actor and scope:** The client administrator uses the fixed URL. The connection address applies to the Compute Engine service.
- **Action and values:** Use the URL in T5-01 without a tenant, project, zone, or region substitution.
- **Source statement:**
  > “The Compute Engine API MCP server has the following global MCP endpoint:”\
  > “https://compute.googleapis.com/mcp”
- **Source:** https://docs.cloud.google.com/compute/docs/reference/mcp\
  Section: **Server Endpoints**.
- **Interpretation:** This is a shared global service address, not a customer-specific address.
- **Related source statement:**
  > “The Compute Engine remote MCP server doesn't support full regional isolation and it might route calls to MCP tools through any region.”
- **Source:** https://docs.cloud.google.com/compute/docs/use-compute-engine-mcp\
  Location: note before **Before you begin**.
- **Interpretation:** A resource zone is not a regional MCP connection address.

### T5-03 — Endpoint availability depends on API enablement

- **Status:** Required.
- **Actor and scope:** An administrator with API enablement authority acts in the selected Google Cloud project.
- **Action and values:** Enable the Compute Engine API. Topic 2 must supply the project setup procedure.
- **Source statement:**
  > “The Compute Engine remote MCP server is enabled when you enable the Compute Engine API.”
- **Source:** https://docs.cloud.google.com/compute/docs/use-compute-engine-mcp\
  Location: introduction.
- **Supporting source statement:**
  > “To connect to a supported product through MCP, enable the product API.”
  > “To enable APIs, you need the Service Usage Admin IAM role (roles/serviceusage.serviceUsageAdmin), which contains the serviceusage.services.enable permission.”
- **Source:** https://docs.cloud.google.com/mcp/enable-disable-mcp-servers\
  Section: **Enable a supported product**.
- **Interpretation:** The current instructions use product API enablement. They do not tell the reader to create a separate Compute Engine MCP deployment.

### T5-04 — Server purpose and applicable server selection

- **Status:** Required.
- **Actor and scope:** The coordinator selects the Compute Engine server for this request.
- **Action:** Connect to the Compute Engine server for Compute Engine resource management.
- **Source statement:** The setup page lists these capabilities:
  > “Manage virtual machine (VM) instances.”\
  > “Manage instance group managers and instance templates.”\
  > “Manage disks and snapshots.”\
  > “Retrieve information about reservations and commitments.”
- **Source:** https://docs.cloud.google.com/compute/docs/use-compute-engine-mcp\
  Location: introduction.
- **Multiple-server evidence:**
  > “This page lists the Google and Google Cloud products and services you can access through remote MCP servers.”
- **Source:** https://docs.cloud.google.com/mcp/supported-products\
  Location: introduction and **Google Cloud MCP servers** table.
- **Interpretation:** Google Cloud has separate MCP servers for other products. These are not tenant variants of Compute Engine. The Compute Engine setup page identifies one applicable server and one global address. It does not direct the reader to connect to another product server.

### T5-05 — Authentication is part of the connection

- **Status:** Required for authenticated resource access.
- **Actor and scope:** The client administrator configures authentication. The connecting identity receives access through its scopes and IAM permissions.
- **Source statement:**
  > “Compute Engine MCP servers use the OAuth 2.0 protocol with Identity and Access Management (IAM) for authentication and authorization.”
- **Source:** https://docs.cloud.google.com/compute/docs/use-compute-engine-mcp\
  Section: **Authentication and authorization**.
- **Documented connection options:**
  > “Depending on how you want to authenticate, you can enter your Google Cloud credentials, your OAuth Client ID and secret, or an agent identity and credentials.”
- **Source:** Same page, **Configure an MCP client to use the Compute Engine MCP server**.
- **Server-specific scope evidence:** The **Compute Engine MCP OAuth scopes** table lists:
  - `https://www.googleapis.com/auth/compute.read-only` — “Only allows access to read data.”
  - `https://www.googleapis.com/auth/compute.read-write` — “Allows access to read and modify data.”
- **Interpretation:** Topic 4 must check these exact scope values against the linked API scope documentation before final selection. This report does not substitute another scope.

### T5-06 — Dynamic client registration is not supported

- **Status:** Conditional. Applies if the client setup would use dynamic client registration.
- **Actor and scope:** The coordinator selects a different authentication setup path.
- **Source statement:**
  > “Google and Google Cloud remote MCP servers don't support Dynamic Client Registration or OAuth Client ID Metadata Documents.”
- **Source:** https://docs.cloud.google.com/mcp/authenticate-mcp\
  Section: **Limitations**.
- **Interpretation:** Do not select the client's DCR alternative for this server.

### T5-07 — Authentication is not required for tool discovery

- **Status:** Explicitly not required for `tools/list` only.
- **Actor and scope:** The client can discover the server's tools.
- **Source statement:**
  > “The tools/list method doesn't require authentication.”
- **Source:** https://docs.cloud.google.com/compute/docs/use-compute-engine-mcp\
  Section: **List tools**.
- **Documented request values:** `POST /mcp`, host `compute.googleapis.com`, and `Content-Type: application/json`.
- **Interpretation:** An unauthenticated tool list does not establish permission to call resource tools.

## Unresolved questions

- **Non-blocking — Other connection headers or parameters.** The service-specific connection section does not specify an additional project header, tenant header, or URL parameter. This is not proof that such settings are unnecessary in every authentication path. Topic 4 must check its selected path.
- **Non-blocking — Full provider server inventory.** The supported-products catalog lists many separate product servers. The time limit did not permit a full inventory of their purposes, endpoints, and authentication differences. No additional server was identified as required for this Compute Engine request.
- **Non-blocking — Release-note confirmation.** Live maintained setup and reference pages were checked. No replacement notice was found in the inspected content. Release notes were not confirmed within the time limit.
- **No blocking endpoint question.** The official global MCP URL is established.

## Cross-topic dependencies

- **Topic 1:** Use T5-03 to check authority for project API enablement.
- **Topic 2:** Use the current API enablement rule in T5-03. Do not add separate MCP deployment creation without applicable evidence.
- **Topic 3:** Check the connecting identity's IAM permissions for the required Compute Engine operations.
- **Topic 4:** Check the exact scope values in T5-05, token setup, and any required headers. DCR is not supported.
- **Coordinator:** Use `https://compute.googleapis.com/mcp` for the custom remote server field. Select only the Compute Engine server for this request unless another service is needed.
- **Coordinator and Topic 4:** Check the callback setup. The setup page's **Redirect URIs** section says:
  > “Your application's documentation should specify the redirect URI that you must use. Custom redirect URIs aren't supported.”

  Use this statement in the client compatibility check. Do not infer that an arbitrary callback URL will work.
## Completed coordinator client check

# Manual OAuth compatibility check

Status: complete. Observed: 2026-09-11. Owner: coordinator. This check completes the saved client gap. No topic action or provider actor changes. Topic 4 follow-up 1 and Topic 1 final authority audit remain applicable. No new factual follow-up round was used.

All code links below use the official upstream commit `496e62ca5d5ebd99f0c189f2614fc9c707e44659`. Source prefix: https://github.com/speakeasy-api/gram/blob/496e62ca5d5ebd99f0c189f2614fc9c707e44659/ . Local source copies are in this directory or its parent.

## C1 — Manual client scope input

Required for the selected read-only connection. The Speakeasy operator supplies both Topic 4 scope strings. The access recipient is the upstream Google OAuth client.

- [Attach form](https://github.com/speakeasy-api/gram/blob/496e62ca5d5ebd99f0c189f2614fc9c707e44659/client/dashboard/src/pages/mcp/x/tabs/settings/sections/authentication/AttachRemoteIdentityProviderSheet.tsx#L344-L430): `const parsedScopes = parseScopes(scopeOverride)`; the manual branch uses the entered client ID and secret, then sends `scope: parsedScopes.length > 0 ? parsedScopes : undefined`. Lines 653-658 render the override fields for a new client.
- [Field definition](https://github.com/speakeasy-api/gram/blob/496e62ca5d5ebd99f0c189f2614fc9c707e44659/client/dashboard/src/pages/mcp/x/tabs/settings/sections/authentication/IssuerFormFields.tsx#L397-L412): `Scope (override)`; `Comma-separated. When provided, the platform requests these scopes during the OAuth dance`.
- [Parser](https://github.com/speakeasy-api/gram/blob/496e62ca5d5ebd99f0c189f2614fc9c707e44659/client/dashboard/src/pages/mcp/x/tabs/settings/sections/authentication/issuerFormUtils.ts#L55-L60): `.split(",")`, then trim and remove empty entries.
- [Create handler](https://github.com/speakeasy-api/gram/blob/496e62ca5d5ebd99f0c189f2614fc9c707e44659/server/internal/remotesessions/clienthandlers.go#L157-L221): requires `authz.ScopeProjectWrite`; stores `Scope: payload.Scope`. This establishes project write access, not a named user role.
- [Storage](https://github.com/speakeasy-api/gram/blob/496e62ca5d5ebd99f0c189f2614fc9c707e44659/server/internal/remotesessions/queries.sql#L525-L550): stores `scope` as a text array. [Runtime lookup](https://github.com/speakeasy-api/gram/blob/496e62ca5d5ebd99f0c189f2614fc9c707e44659/server/internal/remotesessions/queries.sql#L1327-L1345) returns `c.scope AS client_scope` and the issuer endpoints.
- [Authorization](https://github.com/speakeasy-api/gram/blob/496e62ca5d5ebd99f0c189f2614fc9c707e44659/server/internal/remotesessions/challenge.go#L337-L360): `RequestedScopes` uses an issuer override first; otherwise it uses client scopes when supplied. It can add advertised standard identity scopes. Lines 403-405 load the stored values. Lines 780-793 write the scope parameter and apply the Google interceptor.
- [Unit tests](https://github.com/speakeasy-api/gram/blob/496e62ca5d5ebd99f0c189f2614fc9c707e44659/server/internal/remotesessions/challenge_scope_test.go#L9-L123) cover scope precedence. [End-to-end tests](https://github.com/speakeasy-api/gram/blob/496e62ca5d5ebd99f0c189f2614fc9c707e44659/server/internal/remotesessions/challenge_scope_e2e_test.go#L26-L146) check stored client scopes in the authorization URL. Tests were read, not run.

Interpretation: Use the documented attach procedure with a new Manual client. Enter the two scopes in the documented Scope (override) field. This field is described in the setup doctrine for DCR; the applicable implementation establishes that it also applies to Manual. Do not instruct the user to register a DCR client. If an existing issuer has an administrator scope override, it takes priority; ask the Speakeasy administrator to confirm the selected read-only scope values. This is a condition, not an extra task for a new issuer.

## C2 — Callback, offline access, consent, and refresh

- [Callback display](https://github.com/speakeasy-api/gram/blob/496e62ca5d5ebd99f0c189f2614fc9c707e44659/client/dashboard/src/pages/mcp/x/tabs/settings/sections/authentication/IssuerFormFields.tsx#L30-L57) displays the upstream `Redirect URI` for manual registration. Use the documented template `{{ gram.oauth.callback_url }}` for the user action. Do not hard-code an implementation callback URL.
- [Google interceptor](https://github.com/speakeasy-api/gram/blob/496e62ca5d5ebd99f0c189f2614fc9c707e44659/server/internal/remotesessions/interceptors/google.go#L26-L51): matches `accounts.google.com`, sets `access_type=offline`, and adds `prompt=consent`.
- [Registration](https://github.com/speakeasy-api/gram/blob/496e62ca5d5ebd99f0c189f2614fc9c707e44659/server/internal/remotesessions/impl.go#L261-L263): registers the interceptor without a feature flag at this location.
- [Authorization and callback](https://github.com/speakeasy-api/gram/blob/496e62ca5d5ebd99f0c189f2614fc9c707e44659/server/internal/remotesessions/challenge.go#L700-L795): the legacy callback condition changes only the redirect URL; it does not bypass the interceptor. Lines 957-961 encrypt the returned refresh token; line 1055 stores it.
- [Refresh grant](https://github.com/speakeasy-api/gram/blob/496e62ca5d5ebd99f0c189f2614fc9c707e44659/server/internal/remotesessions/tokenservice.go#L565-L635): decrypts the refresh token, uses the configured client secret, sends the refresh grant, and keeps the prior refresh token if no replacement is returned.
- Relevant inspected tests: [Google interceptor](https://github.com/speakeasy-api/gram/blob/496e62ca5d5ebd99f0c189f2614fc9c707e44659/server/internal/remotesessions/interceptors/google_test.go), [legacy callback](https://github.com/speakeasy-api/gram/blob/496e62ca5d5ebd99f0c189f2614fc9c707e44659/server/internal/remotesessions/legacycallback_test.go#L16-L47), and [refresh session](https://github.com/speakeasy-api/gram/blob/496e62ca5d5ebd99f0c189f2614fc9c707e44659/server/internal/remotesessions/refreshsession_test.go). These tests were not executed.

Interpretation: This is upstream behavior when Gram connects to Google, not downstream authorization for an AI client. The manual client does not depend on DCR. The backend performs authorization and token exchange. No client-side Google API JavaScript origin is required by this selected path. Offline access and refresh are automatic; do not add user steps for them.

## C3 — Public discovery

Public metadata was read on 2026-09-11, without credentials or an authenticated tool call.

- https://compute.googleapis.com/.well-known/oauth-protected-resource/mcp, JSON root: `"resource":"https://compute.googleapis.com/mcp"`, `"authorization_servers":["https://accounts.google.com/"]`, `"scopes_supported":["https://www.googleapis.com/auth/compute"]`.
- https://accounts.google.com/.well-known/oauth-authorization-server, JSON root: `"issuer": "https://accounts.google.com"`, `"authorization_endpoint": "https://accounts.google.com/o/oauth2/v2/auth"`, `"token_endpoint": "https://oauth2.googleapis.com/token"`. The token endpoint advertises `client_secret_post` and `client_secret_basic`.

Interpretation: Discovery can fill the Google endpoints. The discovery scope is broad; replace it with the two documented read-only scopes. Do not use discovery as evidence that read-only scopes are unavailable. Topic 4 supplies the service and API scope evidence.

## Applicability and limitations

The current pinned implementation supports this setup. The doctrine-era attach form at commit `96f7f73` also sends manual client scope values and renders the same override component (lines 289, 361-370, 563-567). Thus the prior concern about a newer-only manual scope field is not established. The current callback implementation still supports the legacy callback path. No concrete deployed release mismatch was found. No live console or authenticated end-to-end connection was tested. Do not claim that the draft proves a deployed connection. The repository setup doctrine remains the source for the user procedure; the source trace establishes its applicability and the scope field behavior.

## Final draft checks

The four generated files are saved in `guides/google-compute-engine/`. Deterministic lint command: `lint-guide --json guides/google-compute-engine`.

The first lint run returned exit code 2. It found six provider anchor declarations that were plain text instead of heading anchors in the dossier. The anchor IDs had already been selected; only their declaration syntax changed. The second run returned exit code 0, JSON `[]`, and empty stderr. No automated reviewer agent was used.

Metadata source observations use `2026-09-11T00:00:00Z` to encode the reports' date-only observations. Midnight is a date normalization, not a claimed retrieval time. The source reports record the observation date; recovery progress records the available phase times.

The full Git-based repository check requires a Git checkout and Go. Neither is available in this snapshot. This does not waive that check for a later authorized PR. No commit, publication, PR, or repository safeguard change was made.
