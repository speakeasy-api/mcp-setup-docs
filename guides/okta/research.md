---
research_version: 1
slug: okta
researched_at: 2026-09-11
---

# Okta — Research Dossier

## Status and selection

Research is complete for the selected setup. Mode: create. Destination: guides/okta/. Reader: doctrine/personas/it-admin.md. Client: Speakeasy AI Control Plane. Current official sources establish the managed remote URL. The client evidence resolves the required upstream protocol, PKCE, secret authentication, and refresh-token checks. Topic 4 resolved authentication before the final Topic 1 authority audit. No blocking question remains. No live tenant was tested.

## Server facts

Use the Okta Managed MCP Server, not the local Open Source server. Remote pattern: https://{yourOktaDomain}/mcp. It is tenanted. Use Custom remote server, with Manual OAuth and a registered Web app. T5 supplies the endpoint and subscription conditions. T4 supplies the organization issuer and OAuth endpoints. Do not use /oauth2/default.

## Credential flow

An Application Administrator creates the Web app. Register {{ gram.oauth.callback_url }} in Sign-in redirect URIs. Select Authorization code, Refresh Token, Client secret, and PKCE. Save the Client ID and client secret. A Super Administrator grants the selected Okta API scopes. In the client, use client_secret_basic and an explicit scope override with offline_access plus those selected scopes. The client sends PKCE and uses refresh tokens automatically. The user must be assigned to the app and have underlying permission for the requested actions. API scopes do not add underlying permissions.

## Console walkthrough

### Enable MCP access {#enable-mcp-access}

Use canonical action A1 below.

### Create the app integration {#create-app-integration}

Use canonical action A2 below.

### Grant API scopes {#grant-api-scopes}

Use canonical action A3 below.

### Save connection values {#save-connection-values}

Use canonical action A4 below.

## Canonical setup actions and anchors

Each action below is one canonical action. The topic reports retain evidence, not duplicate guide steps. Use the final Topic 1 and Topic 4 reports when earlier reports have unresolved questions.

| Action and guide anchor | Actor and access recipient | Requirements and sources |
|---|---|---|
| A1 enable-mcp-access | Subscription owner checks eligibility; Super Administrator enables the organization features | T1-01, T1-06; T2-01–02; T5-06–07. Keep Core Identity and Identity Governance conditions. |
| A2 create-app-integration | Application Administrator creates and configures the Web app; users/groups receive app access | T1-02, T1-04, T1-07; T2-03, T2-06–07; T3-01, T3-04; T4-01–03. Include callback, grants, assignments, and conditional separate apps. |
| A3 grant-api-scopes | Super Administrator grants scopes to the app; authorized administrator checks user permissions | T1-03, T1-05; T2-04; T3-02–03; T4-04. Select scopes for required tools from the provider's scope table. Do not prescribe all example scopes. |
| A4 save-connection-values | Application Administrator configures PKCE and retrieves ID/secret; administrator obtains organization domain | T1-02, T1-08; T2-05; T4-02, T4-08; T5-01–02. Form the MCP, issuer, authorization, and token addresses from the actual domain. |
| A5 add-server-in-speakeasy | Reader adds Custom remote server | T5-01; canonical client skeleton below. |
| A6 connect-speakeasy-credentials | Reader attaches Manual OAuth; assigned user signs in | Final T4 report; central C1–C5; canonical client skeleton below. |

Screenshot notes: A1 feature selections; A2 Web app grants and redirect field; A3 Okta API Scopes tab; A4 General tab with credentials redacted. Use placeholder comments. Use the canonical client screenshot placeholders for A5 and A6. Missing images do not block this draft.

## Speakeasy setup values

Choose Custom remote server only because the endpoint is tenanted. Display name: Okta. URL: https://{yourOktaDomain}/mcp. Manual OAuth issuer: https://{yourOktaDomain}. Authorization: https://{yourOktaDomain}/oauth2/v1/authorize. Token: https://{yourOktaDomain}/oauth2/v1/token. Client ID and secret: A4. Scope override: offline_access plus the scopes granted in A3. Token endpoint authentication: client_secret_basic. Callback template: {{ gram.oauth.callback_url }}. Closing link: https://help.okta.com/mcp/en-us/content/topics/mcpserver/mcp-client-configuration-overview.htm. The skeleton below is source material; render only the selected add-server and authentication paths.

## Remaining questions and limitations

Non-blocking: release notes could not be confirmed; refresh-token idle-limit applicability remains uncertain; no fixed client-secret lifetime was established; purchasing authority is organization-specific; exact underlying user roles depend on intended operations. Preserve the reports' evidence and conditions. Access tokens expire after 60 minutes. Refresh tokens expire; another sign-in is necessary when refresh access ends. Do not add renewal or rotation procedures.

Research tasks had bounded research budgets but no native per-dispatch deadline. All calls stayed in the foreground. One prompt-preparation failure and one incorrect session handle are recorded in .factory/dispatch-errors.jsonl. No failed response is treated as completed research. The final audit used the second permitted follow-up round. No reviewer agents ran.

## Source findings
## Topic and status

**Topic 1: Setup permissions and administrative access — complete.**

The documented permissions cover the selected setup: Manual OAuth with a Web app, client secret, PKCE, Authorization code, Refresh Token, and selected Okta API scopes.

- An **Application Administrator** can create and configure the OIDC app and assign user access.
- A **Super Administrator** must enable the Early Access features and grant Okta API scopes to the app.
- An existing Super Administrator can grant underlying administrator roles when the intended operations require them. Do not give every connecting user this role.

**Updated findings:** T1-02 now covers the selected Web app, secret, PKCE, and refresh-token settings. New findings T1-07 and T1-08 cover separate apps and domain retrieval. The previous question about setup actions from Topics 2–4 is resolved. No previous permission finding was contradicted.

All sources were observed on **2026-09-11**. The follow-up checked the added application settings and administrative actions against live official sources. No files or provider settings were changed.

## Findings

### T1-01 — A Super Administrator enables the organization features

- **Status:** Required for initial feature enablement.
- **Actor:** A Super Administrator for the target Okta organization.
- **Recipient and scope:** The target organization receives access to the selected MCP features.
- **Documented action:** In **Settings > Features**, click **Edit**. Select the applicable features. Check their dependencies and limitations. Click **Save**.
- **Required values:**
  - **Okta Managed MCP Server - Core Identity** for IAM tools.
  - **Okta Managed MCP Server - Identity Governance** for OIG tools.
- **Source:** https://help.okta.com/mcp/en-us/content/topics/mcpserver/mcpserver.htm  
  **Location:** Opening note, Early Access instructions.  
  **Exact quotations:**
  - “Okta Managed MCP Server is a self-service Early Access feature.”
  - “For IAM tools - Okta Managed MCP Server - Core Identity”
  - “For OIG tools - Okta Managed MCP Server - Identity Governance”
- **Source:** https://help.okta.com/mcp/en-us/content/topics/security/manage-ea-and-beta-features.htm  
  **Locations:** Introduction; “Enable a Beta or Early Access feature.”  
  **Exact quotations:**
  - “A super admin can bypass Okta Support and enable a self-service Beta or Early Access feature for their org.”
  - “All features that your organization is eligible to use based on your subscription are listed.”
  - “Click Edit.”
  - “Verify any features that have dependencies or limitations.”
  - “Click Save.”
- **Interpretation:** An Application Administrator must ask a Super Administrator to enable these features if they are not already enabled. This is an organization-level setup permission, not a connecting-user requirement.

### T1-02 — An Application Administrator can configure the selected Web app

**Updated to include the final authentication settings.**

- **Status:** Required authority for application setup.
- **Actor:** An Application Administrator whose administrative scope permits creation or management of the target app.
- **Recipient and scope:** The OIDC Web app in the target organization.
- **Documented actions and values:**
  - Create an **OIDC - OpenID Connect** integration in **Applications and resources > Applications**.
  - Select **Web app**.
  - Enter an application name and the client callback in **Sign-in redirect URIs**.
  - Enable **Authorization code**.
  - Configure **Client secret** authentication and **Proof Key for Code Exchange (PKCE)**.
  - Enable **Refresh Token** in **General Settings**.
  - Save the configuration. Obtain the **Client ID** and client secret from the app.
- **Environment-specific values:** The setup owner selects the app name. The supplied client context gives `{{ gram.oauth.callback_url }}` as the callback value. Okta generates the app credentials.
- **Authority source:** https://help.okta.com/oie/en-us/content/topics/security/administrators-app-admin.htm  
  **Location:** Introduction and permission list.  
  **Exact quotations:**
  - “App admins can also add and configure applications, assign applications to end users, and create users through an app import.”
  - “Create and modify an OIDC app”
  - “In the Admin Console, you can assign an app admin to an app or to an app instance.”
- **MCP source:** https://help.okta.com/mcp/en-us/content/topics/mcpserver/oidc-pkce-browser-based.htm  
  **Location:** “Create the app integration” and final General-tab steps.  
  **Exact quotations:**
  - “Web app: Select this if you're embedding the Okta Managed MCP Server into your app, such as a chatbot or a server-side web app.”
  - “In the Grant type, select Authorization code.”
  - “Copy the redirect URI from your MCP client and enter it in the Sign-in redirect URIs field.”
  - “Go to the General tab and confirm that the Proof Key for Code Exchange (PKCE) is selected.”
  - “Go to the General tab and copy the Client ID.”
- **Secret and PKCE source:** https://help.okta.com/oie/en-us/content/topics/apps/apps_app_integration_wizard_oidc.htm  
  **Location:** “Configure OIDC settings > Web apps,” Client Credentials.  
  **Exact quotations:**
  - “Client authentication: Choose the client authentication method.”
  - “Click Save to generate the client secret and then view or copy the client secret.”
  - “Proof Key for Code Exchange (PKCE): Indicates if a PKCE code challenge is required to verify client requests.”
- **Refresh-token source:** https://developer.okta.com/docs/guides/refresh-tokens/main/  
  **Location:** “Set up your app.”  
  **Exact quotations:**
  - “Open your app and click Edit in the General Settings section.”
  - “Select Refresh Token as a grant type and click Save.”
- **Interpretation:** The documented authority to create and modify an OIDC app covers these application settings and credential retrieval. A separate Super Administrator permission is not established for these settings. The separate scope-grant restriction in T1-03 still applies.
- **Client boundary:** Topic 4 and the coordinator own `client_secret_basic` and the authorization request containing `offline_access`. These client values do not replace the Okta application settings or API scope grants.

### T1-03 — Only a Super Administrator can grant Okta API scopes to the app

- **Status:** Required.
- **Actor:** A Super Administrator in the target organization.
- **Recipient and scope:** The registered OIDC app's grants collection.
- **Documented action:** Open **Okta API Scopes**. Click **Grant** for each selected API scope.
- **Required values:** Select scopes for the intended tools from Okta's scope-to-tool documentation. Topics 3 and 4 own scope selection and token requests.
- **Source:** https://developer.okta.com/docs/guides/implement-oauth-for-okta/main/  
  **Location:** “Define allowed scopes.”  
  **Exact quotations:**
  - “Only the Super Admin role has permission to grant scopes to an app.”
  - “Select the Okta API Scopes tab, and then click Grant for each scope that you want to add to the app's grants collection.”
- **Source:** https://help.okta.com/mcp/en-us/content/topics/mcpserver/oidc-pkce-browser-based.htm  
  **Location:** “Grant Okta API scopes.”  
  **Exact quotations:**
  - “The scopes you grant here determine which tools load for this app.”
  - “Click Grant for the required API scopes.”
- **Interpretation:** Permission to create the app does not permit an Application Administrator to grant these scopes. Ask an existing Super Administrator to perform this action. Do not grant every scope by default.

### T1-04 — An Application Administrator can assign access to the app

- **Status:** Required. Each connecting user needs an assignment, directly or through a group.
- **Actor:** An Application Administrator with authority over the target app.
- **Recipient and scope:** Intended users or groups receive access to that OIDC app.
- **Documented action:** Use **Assignments** during creation. For an existing app, open its **Assignments** tab and ensure that the intended users have access.
- **Required values:** Select the intended users or groups from the organization's directory.
- **Authority source:** https://help.okta.com/oie/en-us/content/topics/security/administrators-app-admin.htm  
  **Location:** Permission list.  
  **Exact quotation:** “Assign user access to apps”
- **MCP source:** https://help.okta.com/mcp/en-us/content/topics/mcpserver/oidc-pkce-browser-based.htm  
  **Location:** Assignments step and note.  
  **Exact quotations:**
  - “In the Assignments section, select who can use this app integration.”
  - “A user or group must be assigned before they can connect to the Okta Managed MCP Server through this app integration, regardless of which scopes are granted.”
- **Supporting source:** https://developer.okta.com/docs/guides/implement-oauth-for-okta/main/  
  **Location:** “Create an OAuth 2.0 app in Okta.”  
  **Exact quotation:** “Click the Assignments tab and ensure that the right users are assigned to the app.”
- **Interpretation:** App assignment, API scope grants, and underlying user permissions are separate controls.

### T1-05 — A Super Administrator can grant underlying administrator roles when needed

- **Status:** Conditional. Applies when the intended operations require administrator permissions that the connecting user does not have.
- **Actor:** A Super Administrator is a documented authorized actor.
- **Recipient and scope:** The intended user or group receives the applicable administrator role for the required resources.
- **Documented authority:** Super Administrators can create administrators, change their access, and assign roles to groups.
- **Required values:** Select the least-privileged role and resource scope for the intended operations. Topic 3 owns this selection.
- **Source:** https://help.okta.com/oie/en-us/content/topics/security/administrators-super-admin.htm  
  **Location:** Permission list.  
  **Exact quotations:**
  - “Create other admins”
  - “Edit or revoke other admins”
  - “Assign roles to Okta, AD, and LDAP groups”
- **Source:** https://developer.okta.com/docs/guides/implement-oauth-for-okta/main/  
  **Location:** “Get an access token and make a request.”  
  **Exact quotation:** “Scopes requested for the access token must exist in the app's grants collection, and the user must have permission to perform those actions.”
- **Interpretation:** Use an existing Super Administrator for a necessary role assignment. This does not mean that the connecting user needs Super Administrator access. The cited evidence establishes a sufficient actor; it does not establish that this actor is the only possible authority for every role change.

### T1-06 — Subscription eligibility limits feature enablement

- **Status:** Required.
- **Actor:** The organization setup owner confirms eligibility. Okta Support is the documented contact for more information.
- **Recipient and scope:** The target Okta organization.
- **Required subscriptions:** **IT Products - Okta Managed MCP Server**, plus **Core Identity**, **Identity Governance**, or both. The selected service also needs the underlying subscription stated below.
- **Source:** https://help.okta.com/mcp/en-us/content/topics/mcpserver/mcpserver.htm  
  **Location:** Opening subscription note.  
  **Exact quotations:**
  - “The Okta Managed MCP Server requires a subscription to IT Products - Okta Managed MCP Server, plus at least one of the following:”
  - “Okta Managed MCP Server - Core Identity”
  - “Okta Managed MCP Server - Identity Governance”
  - “Core Identity requires an existing subscription to Universal Directory (UD), Single Sign-On (SSO), Multifactor Authentication (MFA), Adaptive Multifactor Authentication (AMFA), or Lifecycle Management (LCM).”
  - “Identity Governance requires an existing subscription to Okta Identity Governance (OIG).”
  - “Contact Okta Support for more information.”
- **Interpretation:** Super Administrator access does not establish subscription eligibility or purchasing authority. Topic 2 also owns the documented environment restrictions.

### T1-07 — Use the same authority division for separate apps

**New finding.**

- **Status:** Conditional. Applies when different user types need different permission levels.
- **Actors:** An Application Administrator creates and assigns each app. A Super Administrator grants its selected Okta API scopes.
- **Recipient and scope:** Each user group receives access through its applicable OIDC app.
- **Documented action:** Create separate apps for the user types. Grant the appropriate scopes. Share the correct client ID with each group.
- **Environment-specific values:** Obtain each client ID from its app. Select groups and scopes from the intended operations.
- **Source:** https://help.okta.com/mcp/en-us/content/topics/mcpserver/configure-apps-multiple-user-types.htm  
  **Locations:** “About this task”; “Procedure.”  
  **Exact quotations:**
  - “If your Okta org requires different permission levels for different user types, create separate OIDC apps:”
  - “Share the appropriate client ID with each user group.”
- **Authority sources:** T1-02, T1-03, and T1-04 apply to each app.
- **Interpretation:** Separate apps do not remove the Super Administrator-only scope-grant action. Do not give an Application Administrator that authority by implication.

### T1-08 — An administrator can obtain the organization domain

**New finding.**

- **Status:** Conditional. Required when the target organization domain is not already known.
- **Actor:** An administrator signed in to the target organization. The documented procedure does not specify Super Administrator.
- **Recipient and scope:** The setup owner obtains the domain for the target organization.
- **Documented action:** Click the username in the upper-right corner of the Admin Console. Copy the domain from the menu.
- **Environment-specific value:** Use the actual organization domain, not an example domain.
- **Source:** https://developer.okta.com/docs/guides/find-your-domain/main/  
  **Location:** “Find your Okta domain.”  
  **Exact quotations:**
  - “Sign in to your Okta organization with your administrator account.”
  - “Locate the Okta domain by clicking your username in the upper-right corner of the Admin Console. The domain appears in the dropdown menu.”
- **Interpretation:** The documented administrator-account procedure is sufficient. It does not require a separate grant of Super Administrator access.

## Unresolved questions

1. **Non-blocking — purchasing and contract approval authority.**  
   The MCP overview specifies subscriptions and directs readers to Okta Support. It does not identify a purchasing role or a contract-approval procedure. This does not prevent setup for an eligible organization. If subscriptions are missing, the organization's authorized purchasing owner must arrange them.

2. **Non-blocking — exact underlying role and resource set.**  
   The intended MCP operations are not specified. The shared OAuth guide requires underlying user permissions, but it cannot establish one least-privileged role for all future tasks. Topic 3 must select access when the operations are known. This does not prevent app creation, assignment, or the initial connection configuration.

3. **Non-blocking — release-note confirmation.**  
   The supplied Topic 5 report records an unreadable release-note destination. No permission action in this report depends on a missing release-note detail. The checked maintained pages showed no replacement notice. This does not prove that no relevant changes exist.

**Resolved:** The final authority audit covers all supplied setup actions, including secret retrieval, PKCE, Refresh Token, separate apps, and domain retrieval. No blocking authority gap remains.

## Cross-topic dependencies

- **Topic 2:** Application Administrator authority covers app creation, callback registration, app configuration, assignments, and conditional separate apps. Super Administrator authority remains necessary for feature enablement and API scope grants.
- **Topic 3:** Application assignment authority is confirmed. Keep assignment, token scopes, and underlying user permissions separate. Use T1-05 if a role change is necessary; do not make Super Administrator a universal connecting-user requirement.
- **Topic 4:** Application Administrator authority covers the selected Web app, client secret retrieval, PKCE, Authorization code, and Refresh Token settings. Super Administrator authority is required for the selected Okta API scope grants. The client requests `offline_access`; do not describe it as a substitute for those grants.
- **Topic 5:** Feature-enablement authority and domain-retrieval access are confirmed.
- **Coordinator:** Use the documented division of work. Ask an existing Super Administrator to perform restricted actions rather than require permanent Super Administrator access for the reader. Client implementation checks remain with the coordinator.## Topic and status

**Topic 2: Organization-level setup — complete.**

Okta documents the required subscriptions, Early Access feature settings, and OIDC application setup. The final application type depends on the client. The coordinator and Topic 4 must select that type for Speakeasy.

All sources below were checked on **2026-09-11**. No files or provider settings were changed.

## Findings

### T2-01 — Confirm the required subscriptions and supported environment

- **Status:** Required.
- **Actor and scope:** The organization administrator checks the subscriptions and environment for the target Okta organization.
- **Documented requirements:**
  - A subscription to **IT Products - Okta Managed MCP Server**.
  - At least one of:
    - **Okta Managed MCP Server - Core Identity**.
    - **Okta Managed MCP Server - Identity Governance**.
  - Core Identity also requires an existing UD, SSO, MFA, AMFA, or LCM subscription.
  - Identity Governance also requires an existing OIG subscription.
- **Environment restriction:** The managed server is not available in the three government environments listed below.
- **Documented action:** Check the organization subscriptions. Contact Okta Support for more information. The source does not give a purchase procedure.
- **Source:** https://help.okta.com/mcp/en-us/content/topics/mcpserver/mcpserver.htm  
  **Location:** Opening note.
- **Exact quotations:**
  - “The Okta Managed MCP Server requires a subscription to IT Products - Okta Managed MCP Server, plus at least one of the following:”
  - “Core Identity requires an existing subscription to Universal Directory (UD), Single Sign-On (SSO), Multifactor Authentication (MFA), Adaptive Multifactor Authentication (AMFA), or Lifecycle Management (LCM).”
  - “Identity Governance requires an existing subscription to Okta Identity Governance (OIG).”
  - “The Okta Managed MCP Server isn't available for Okta for Government Moderate (FedRAMP Moderate, HIPAA), Okta for US Military (DoD IL4), or Okta for Government High (FedRAMP High).”
- **Interpretation:** The required subscription depends on the tools that the organization needs. The documented exclusions apply to the managed server, not only to one client.

### T2-02 — Enable the applicable Early Access features

- **Status:** Required. Select each feature that applies to the required tools.
- **Actor and scope:** A **super admin** enables the feature for the organization.
- **Documented action and values:**
  1. In the Admin Console, go to **Settings > Features**.
  2. Click **Edit**.
  3. Select the applicable features:
     - IAM tools: **Okta Managed MCP Server - Core Identity**.
     - OIG tools: **Okta Managed MCP Server - Identity Governance**.
  4. Check any listed dependencies or limitations. Remove listed restrictions when necessary.
  5. Click **Save**.
- **Source:** https://help.okta.com/mcp/en-us/content/topics/mcpserver/mcpserver.htm  
  **Location:** Early Access instructions after the subscription note.
- **Exact quotations:**
  - “Okta Managed MCP Server is a self-service Early Access feature.”
  - “To enable it, go to Settings > Features in the Admin Console and turn on the following features:”
  - “For IAM tools - Okta Managed MCP Server - Core Identity”
  - “For OIG tools - Okta Managed MCP Server - Identity Governance”
- **Shared-platform source:** https://help.okta.com/mcp/en-us/content/topics/security/manage-ea-and-beta-features.htm  
  **Locations:** Introduction; “Enable a Beta or Early Access feature.”
- **Exact quotations:**
  - “A super admin can bypass Okta Support and enable a self-service Beta or Early Access feature for their org.”
  - “All features that your organization is eligible to use based on your subscription are listed.”
  - “Click Edit.”
  - “Select the features that you want to enable.”
  - “Verify any features that have dependencies or limitations.”
  - “Click Save.”
- **Interpretation:** Self-service enablement is the documented enrollment method. The general page also offers auto-enrollment in future Early Access features. That setting is not the instruction to enable MCP access and must not replace the two named feature selections.

### T2-03 — Create an OIDC application for the MCP client

- **Status:** Required for the documented interactive connection.
- **Actor and scope:** An administrator creates an application in the target organization. The application authorizes the MCP client connection. Topic 1 must confirm the applicable application-administration authority.
- **Documented action:**
  1. In the Admin Console, go to **Applications and resources > Applications**.
  2. Click **Create App Integration**.
  3. Select **OIDC - OpenID Connect**.
  4. Select the application type for the client.
  5. Click **Next**.
  6. Enter an **App integration name**. The source gives “Okta Managed MCP Server” as an example.
  7. In **Grant type**, select **Authorization code**.
  8. Enter the client callback address in **Sign-in redirect URIs**.
  9. In **Assignments**, select who can use the application.
  10. Click **Save**.
- **Application-type values from the source:**
  - **Web app:** For an application such as a chatbot or server-side web app.
  - **Single-page app:** For a browser application that connects directly to the MCP server.
  - **Native app:** For MCP clients such as VS Code.
- **Environment-specific values:** Choose the application name. Obtain the redirect URI from the actual MCP client. Select the intended organization users or groups.
- **Source:** https://help.okta.com/mcp/en-us/content/topics/mcpserver/oidc-pkce-browser-based.htm  
  **Location:** “Procedure,” “Create the app integration.”
- **Exact quotations:**
  - “Select OIDC - OpenID Connect as the sign-in method.”
  - “Web app: Select this if you're embedding the Okta Managed MCP Server into your app, such as a chatbot or a server-side web app.”
  - “Native app: Select this for MCP clients such as VS Code.”
  - “In the Grant type, select Authorization code.”
  - “Copy the redirect URI from your MCP client and enter it in the Sign-in redirect URIs field.”
  - “In the Assignments section, select who can use this app integration.”
- **Interpretation:** Do not copy the VS Code native-app choice or localhost callback into the Speakeasy setup without a client check. The supplied client context identifies `{{ gram.oauth.callback_url }}` as the callback value for its manual OAuth path.

### T2-04 — Grant the application the required Okta API scopes

- **Status:** Required. The exact scopes depend on the intended tasks.
- **Actor and scope:** A **Super Admin** grants scopes to the OIDC application. These grants apply to the application; they do not replace user permissions.
- **Documented action and values:**
  1. Open the application’s **Okta API Scopes** tab.
  2. Click **Grant** for each required scope.
  3. Use Okta’s scope-to-tool table and use cases to select scopes.
  4. Keep the list of granted scopes for client configuration.
- **Source:** https://help.okta.com/mcp/en-us/content/topics/mcpserver/oidc-pkce-browser-based.htm  
  **Location:** “Grant Okta API scopes.”
- **Exact quotations:**
  - “The scopes you grant here determine which tools load for this app.”
  - “Select the Okta API Scopes tab.”
  - “Click Grant for the required API scopes.”
  - “Save these values and the list of granted scopes to configure your Okta Managed MCP Server.”
- **Authority source:** https://developer.okta.com/docs/guides/implement-oauth-for-okta/main/  
  **Location:** “Define allowed scopes.”
- **Exact quotation:** “Only the Super Admin role has permission to grant scopes to an app.”
- **Scope-selection source:** https://help.okta.com/mcp/en-us/content/topics/mcpserver/scope-based-tool-loading.htm  
  **Location:** “Scope-to-tool mapping.”
- **Exact table values:**
  - `okta_user_management`: `okta.users.read` and `okta.users.manage`.
  - `okta_group_management`: `okta.groups.read` and `okta.groups.manage`.
  - `okta_syslog`: `okta.logs.read`.
- **Interpretation:** These scope values are examples for specific tools, not a minimum scope set for every connection. Topic 3 must identify the intended access. Topic 4 must use the corresponding scopes in the token request.

### T2-05 — Complete the application authentication settings and obtain its client ID

- **Status:** Required for the documented OIDC with PKCE procedure.
- **Actor and scope:** The application administrator configures the OIDC application and supplies its client ID to the client setup owner.
- **Documented action:**
  - Open **General** and confirm that PKCE is selected.
  - Copy **Client ID** from **General**.
  - Keep the client ID and granted-scope list for connection setup.
- **Source:** https://help.okta.com/mcp/en-us/content/topics/mcpserver/oidc-pkce-browser-based.htm  
  **Location:** End of “Grant Okta API scopes.”
- **Exact quotations:**
  - “Go to the General tab and confirm that the Proof Key for Code Exchange (PKCE) is selected.”
  - “Go to the General tab and copy the Client ID.”
- **Interpretation:** Topic 4 must resolve the client authentication settings for the selected application type. The MCP procedure does not instruct every application type to use a client secret.

### T2-06 — Assign users or groups before connection

- **Status:** Required.
- **Actor and scope:** The application administrator assigns the intended users or groups to the OIDC application.
- **Documented action:** Use the **Assignments** selection during application creation. Topic 3 owns the individual access requirements.
- **Source:** https://help.okta.com/mcp/en-us/content/topics/mcpserver/oidc-pkce-browser-based.htm  
  **Location:** Note after **Assignments**.
- **Exact quotation:** “A user or group must be assigned before they can connect to the Okta Managed MCP Server through this app integration, regardless of which scopes are granted.”
- **Interpretation:** Scope grants alone do not permit a user to connect.

### T2-07 — Use separate applications when user types need different permissions

- **Status:** Conditional. Applies when the organization needs different permission levels for different user types.
- **Actor and scope:** The application administrator creates separate OIDC applications and gives each user group the correct client ID.
- **Documented action:** Repeat the OIDC with PKCE procedure for each user type. Grant the appropriate scopes to each application.
- **Source:** https://help.okta.com/mcp/en-us/content/topics/mcpserver/configure-apps-multiple-user-types.htm  
  **Locations:** “About this task”; “Procedure.”
- **Exact quotations:**
  - “If your Okta org requires different permission levels for different user types, create separate OIDC apps:”
  - “For Okta admins,” grant management scopes “such as okta.users.manage.”
  - “For end users,” grant limited scopes “such as okta.governance.accessRequests.read.”
  - “Share the appropriate client ID with each user group.”
- **Interpretation:** These are scope examples. Do not grant the example management scope unless the intended tasks need it.

## Unresolved questions

1. **Non-blocking for Topic 2 — application administration authority.**  
   The MCP procedure gives concrete application creation and configuration steps. It does not name the exact required role. Topic 1 must confirm authority for T2-03, T2-05, T2-06, and T2-07. Authority for feature enablement and scope grants is established above.

2. **Non-blocking for Topic 2 — final application type and token settings.**  
   The source supports several application types. Topic 4 and the coordinator must select the type for Speakeasy and check PKCE and client authentication. The documented organization actions can be completed after that selection. No claim is made here that Speakeasy supports the required protocol or authentication details.

3. **Non-blocking — additional organization policies or API activation.**  
   The overview, getting-started page, OIDC setup, scope-loading page, and multiple-user-type page did not establish another MCP-specific API activation or client-approval action. This does not prove that organization-specific policies are absent.

4. **Non-blocking — release-note confirmation.**  
   The supplied Topic 5 report records an unreadable release-note destination. The live setup pages checked for this report showed no replacement notice. This does not prove that there are no relevant changes.

## Cross-topic dependencies

- **Topic 1:** Confirm application-administration authority. Use T2-02 for super-admin feature authority and T2-04 for Super Admin scope-grant authority.
- **Topic 3:** Use T2-06 for required assignments. Select task-specific scopes and check the user’s underlying permissions. Use T2-07 when administrator and end-user access must differ.
- **Topic 4:** Use T2-03 and T2-05 for authorization code, callback registration, PKCE, and client ID. Confirm client-secret and refresh-token settings for the selected application type. The shared OAuth source states: “Only the org authorization server can mint access tokens that contain Okta API scopes.”
- **Topic 5:** Organization feature enablement and subscriptions are prerequisites for the organization-specific managed endpoint.
- **Coordinator:** Select the Speakeasy application type with Topic 4. Do not assume that the VS Code example applies unchanged. Complete the explicit MCP protocol-version check identified by Topic 5 before final setup-path selection.## Topic and status

**Topic 3: Connecting-user setup — complete.**

The connecting user must have access to the OIDC app integration. The app and access token must have the scopes for the required tools. The user must also have permission to perform the underlying Okta actions. App assignment and API scopes do not replace user permissions.

All sources below were checked live on **2026-09-11**. No files or provider settings were changed.

## Findings

### T3-01 — Assign the user or a group to the OIDC app integration

- **Status:** Required.
- **Who acts:** An administrator who can assign access to the app. Topic 1 must confirm the applicable administrative authority.
- **Who receives access:** Each connecting user, directly or through a group.
- **Scope:** The OIDC app integration for the target Okta organization.
- **Documented action:** During app creation, use the **Assignments** section to select who can use the app integration. If assignment was skipped during creation, open the app's **Assignments** tab and assign one or more users before they connect.
- **Required values:** Use the intended users or groups from the organization's directory. Assign them to the OIDC app that supplies the client ID for this connection.
- **Source:** https://help.okta.com/mcp/en-us/content/topics/mcpserver/oidc-pkce-browser-based.htm  
  **Location:** “Procedure” → “Create the app integration,” Assignments step and note.  
  **Observed:** 2026-09-11.  
  **Exact quotations:**
  - “In the Assignments section, select who can use this app integration.”
  - “A user or group must be assigned before they can connect to the Okta Managed MCP Server through this app integration, regardless of which scopes are granted.”
- **Supporting source:** https://developer.okta.com/docs/guides/implement-oauth-for-okta/main/  
  **Location:** “Create an OAuth 2.0 app in Okta.”  
  **Observed:** 2026-09-11.  
  **Exact quotations:**
  - “Click the Assignments tab and ensure that the right users are assigned to the app.”
  - “If you skipped the assignment during the app integration creation, you must add one or more users now.”
- **Interpretation:** A scope grant alone does not give a user access to the app. The documented procedure is sufficient to make the assignment.

### T3-02 — Give the app and token the scopes for the required tools

- **Status:** Required. The exact scopes depend on the selected tools and actions.
- **Who acts:** A Super Admin grants Okta API scopes to the app. The authentication configuration must request the required scopes; Topic 4 owns that configuration.
- **Who receives access:** The app receives scope grants. The user's access token carries the scopes used by the MCP server.
- **Scope:** App integration and user session.
- **Documented action:** Open the app's **Okta API Scopes** tab. Click **Grant** for each required scope. Select scopes from the official scope-to-tool table, based on the intended tasks.
- **Examples from the documented table:** User management lists `okta.users.read` and `okta.users.manage`; system log access lists `okta.logs.read`. These are examples, not a requirement to grant all three.
- **Source:** https://help.okta.com/mcp/en-us/content/topics/mcpserver/oidc-pkce-browser-based.htm  
  **Location:** “Grant Okta API scopes.”  
  **Observed:** 2026-09-11.  
  **Exact quotations:**
  - “Select the Okta API Scopes tab.”
  - “Click Grant for the required API scopes.”
- **Source:** https://help.okta.com/mcp/en-us/content/topics/mcpserver/scope-based-tool-loading.htm  
  **Location:** “How it works” → “Startup filtering” and “Runtime enforcement”; “Scope-to-tool mapping.”  
  **Observed:** 2026-09-11.  
  **Exact quotations:**
  - “After authentication completes, the server reads the scopes in your access token.”
  - “Tools whose required scope isn't present are silently removed from the tool registry and don't appear in the tools list.”
  - “If you don't have the required scope, you can't perform the action and receive an error message in the tool execution response.”
- **Authority source:** https://developer.okta.com/docs/guides/implement-oauth-for-okta/main/  
  **Location:** “Define allowed scopes.”  
  **Observed:** 2026-09-11.  
  **Exact quotation:** “Only the Super Admin role has permission to grant scopes to an app.”
- **Interpretation:** Assigning the user to the app does not select the tools. A visible tool also does not prove that the user can perform every action that the tool supports.

### T3-03 — Keep the user's underlying Okta permissions

- **Status:** Required for each selected action. Administrative permissions are conditional on the action.
- **Who acts:** The organization administrator checks the connecting user's existing permissions. An administrator with the required authority must make any necessary role or resource-access changes. Topic 1 must verify that authority.
- **Who receives access:** The connecting Okta user.
- **Scope:** The Okta resources and operations used by the selected MCP tools.
- **Documented action and values:** Check that the user can perform the intended Okta API actions. Choose access for the intended resources, not only a broad OAuth scope. The required role or resource assignment depends on those actions.
- **Source:** https://developer.okta.com/docs/guides/implement-oauth-for-okta/main/  
  **Location:** “Get an access token and make a request.”  
  **Observed:** 2026-09-11.  
  **Exact quotation:** “Scopes requested for the access token must exist in the app's grants collection, and the user must have permission to perform those actions.”
- **Same source:**  
  **Location:** “Silent downscoping.”  
  **Observed:** 2026-09-11.  
  **Exact quotations:**
  - “It doesn't matter whether you have permissions for all the scopes that you request.”
  - “However, when you make requests to perform actions that you don't have permissions for, the token doesn't work, and you receive an error.”
- **Same source:**  
  **Location:** “Scope naming.”  
  **Observed:** 2026-09-11.  
  **Exact quotation:** “For example, a GET request to the /users endpoint with the okta.users.read scope returns all the users that the admin has access to.”
- **Interpretation:** Token scopes do not increase the user's underlying permissions. Do not state that a connecting user must be a Super Admin. The cited Super Admin requirement applies to granting app scopes, not to every MCP user.

### T3-04 — Use separate apps when user types need different scope sets

- **Status:** Conditional — when the organization requires different permission levels for different user types.
- **Who acts:** The app setup administrator creates and assigns the apps. A Super Admin grants their Okta API scopes.
- **Who receives access:** The appropriate administrator or end-user group.
- **Scope:** Separate OIDC app integrations.
- **Documented action:** Create separate apps for the user types. Grant the appropriate scopes. Share the correct client ID with each user group. Apply T3-01 to each app.
- **Required values:** Obtain each client ID from its app integration. Select the group and scopes from the organization's intended tasks.
- **Source:** https://help.okta.com/mcp/en-us/content/topics/mcpserver/configure-apps-multiple-user-types.htm  
  **Location:** “About this task” and “Procedure.”  
  **Observed:** 2026-09-11.  
  **Exact quotations:**
  - “If your Okta org requires different permission levels for different user types, create separate OIDC apps:”
  - “For Okta admins: Follow OpenID Connect (OIDC) with Proof Key for Code Exchange (PKCE) to create an app integration, and grant management scopes such as okta.users.manage.”
  - “For end users: Follow OpenID Connect (OIDC) with Proof Key for Code Exchange (PKCE) to create an app integration, and grant limited scopes such as okta.governance.accessRequests.read.”
  - “Share the appropriate client ID with each user group.”
- **Interpretation:** Okta documents both administrator and end-user access. Separate apps are conditional, not a universal setup requirement.

### T3-05 — Confirm the organization has the applicable service entitlement

- **Status:** Required at organization level. The selected service depends on the tools.
- **Who acts:** The organization setup owner confirms the subscriptions. Topic 2 owns this prerequisite.
- **Who receives access:** The organization. The source does not describe a separate per-user MCP license.
- **Scope:** Target Okta organization.
- **Documented requirement:** The organization needs **IT Products - Okta Managed MCP Server**, plus **Core Identity**, **Identity Governance**, or both. Existing product subscriptions are also required for the selected service.
- **Source:** https://help.okta.com/mcp/en-us/content/topics/mcpserver/mcpserver.htm  
  **Location:** Opening subscription note.  
  **Observed:** 2026-09-11.  
  **Exact quotations:**
  - “The Okta Managed MCP Server requires a subscription to IT Products - Okta Managed MCP Server, plus at least one of the following:”
  - “Okta Managed MCP Server - Core Identity”
  - “Okta Managed MCP Server - Identity Governance”
  - “Identity Governance requires an existing subscription to Okta Identity Governance (OIG).”
- **Interpretation:** This is an organization prerequisite. Do not convert it into an individual license-assignment step without further evidence.

## Unresolved questions

1. **Non-blocking — exact authority for user assignment and role changes.**  
   The MCP OIDC procedure and the shared OAuth guide give an actionable app-assignment procedure. They do not establish every administrator role that can perform assignments or change a user's underlying roles. Topic 1 must verify the applicable authority. This does not block the documented assignment action.

2. **Non-blocking — exact role and resource set for future tasks.**  
   The input identifies an IT administrator persona but does not list the intended MCP operations. No single role or resource set can be selected from that information. The shared OAuth guide establishes that underlying permissions remain in force. Select task-specific access when the intended actions are known. Do not grant Super Admin solely to make the connection work.

3. **Non-blocking — separate individual enablement or license.**  
   The MCP overview, OIDC procedure, scope-loading page, and multiple-user-types page do not document a separate individual MCP registration, user toggle, or per-user MCP license assignment. This is not proof that all such requirements are absent.

4. **Non-blocking — release-note confirmation.**  
   The supplied Topic 5 report records that the linked release notes could not be read. The live setup pages checked for this topic showed no replacement notice. No concrete user-access action depends on that missing confirmation.

## Cross-topic dependencies

- **Topic 1:** Verify authority to assign users or groups to the OIDC app and to change underlying user roles or resource access. The shared OAuth guide explicitly requires Super Admin to grant app scopes.
- **Topic 2:** Include the required app assignment and organization subscriptions. Use separate OIDC apps when user types need different scope sets.
- **Topic 4:** Ensure the token requests the required granted scopes. Token scopes do not replace the user's underlying permissions.
- **Topic 5:** Tool availability depends on token scopes; access to the remote endpoint alone does not establish tool access.
- **Coordinator:** Keep app access, tool scopes, and underlying permissions as three separate checks. Do not require every connecting user to be a Super Admin. Client implementation checks remain with the coordinator.## Topic and status

**Topic 4: Authentication — complete.**

The selected setup is compatible with the supplied central client evidence:

- Manual OAuth with a registered **Web app**.
- **Authorization code** with PKCE.
- **Client secret** authentication with `client_secret_basic`.
- **Refresh Token** grant.
- `offline_access` and the Okta API scopes needed for the selected tools.
- The Okta organization authorization server.

**Updated findings:** T4-01 and T4-03 now have resolved client checks. T4-02 replaces the application-type uncertainty with the selected Web app setup. New finding T4-08 provides the client-secret retrieval steps and Basic authentication evidence. The two previous blocking questions are resolved.

All provider sources below were observed on **2026-09-11**. Unchanged findings retain their original sources. No files or provider settings were changed.

## Findings

### T4-01 — Use a registered OAuth application with PKCE

- **Status:** Required.
- **Actor and scope:** The application administrator configures the Okta application. The connecting user signs in. The application receives access for that user.
- **Documented action and values:**
  1. In the Admin Console, go to **Applications and resources > Applications**.
  2. Click **Create App Integration**.
  3. Select **OIDC - OpenID Connect**.
  4. Select the Web application type. See T4-02.
  5. Click **Next** and enter an application name.
  6. Under **Grant type**, select **Authorization code**.
  7. Enter the client callback address in **Sign-in redirect URIs**.
  8. Configure assignments and click **Save**.
  9. On the **General** tab, confirm that **Proof Key for Code Exchange (PKCE)** is selected. Copy the **Client ID**.
- **Environment-specific values:** Use `{{ gram.oauth.callback_url }}` from the supplied client context as the callback address. Obtain the Client ID from the Okta application.
- **Source:** https://help.okta.com/mcp/en-us/content/topics/mcpserver/oidc-pkce-browser-based.htm
- **Location:** “Procedure,” “Create the app integration,” and the final General-tab steps.
- **Exact quotations:**
  - “In the Grant type, select Authorization code.”
  - “Copy the redirect URI from your MCP client and enter it in the Sign-in redirect URIs field.”
  - “Go to the General tab and confirm that the Proof Key for Code Exchange (PKCE) is selected.”
  - “Go to the General tab and copy the Client ID.”
- **Interpretation:** Use a registered OAuth client. The central client check confirms automatic S256 PKCE for Manual OAuth. No separate Speakeasy PKCE action is necessary.

### T4-02 — Select a Web app and enable PKCE

**Replaces the previous unresolved application-type finding.**

- **Status:** Required for the selected hosted-client setup.
- **Actor and scope:** The application administrator configures the Okta Web app.
- **Documented action and values:** Select **Web app**. On the application's **General** tab, use **Client secret** authentication and select **Proof Key for Code Exchange (PKCE)**. Save the configuration.
- **Sources:**
  - https://help.okta.com/mcp/en-us/content/topics/mcpserver/oidc-pkce-browser-based.htm
  - https://help.okta.com/oie/en-us/content/topics/apps/apps_app_integration_wizard_oidc.htm
- **Locations:** “Create the app integration,” application-type selection; “Configure OIDC settings > Web apps.”
- **Exact quotations:**
  - “Web app: Select this if you're embedding the Okta Managed MCP Server into your app, such as a chatbot or a server-side web app.”
  - “Proof Key for Code Exchange (PKCE): Indicates if a PKCE code challenge is required to verify client requests.”
  - “This is optional for both the Client secret and Public key / Private key authentication methods.”
- **Interpretation:** Shared platform instructions permit PKCE with a Web app and a client secret. The MCP-specific instructions require PKCE to be selected. Thus, select it for this setup even though the general Web app setting is optional. The central client evidence confirms support for this combination.

### T4-03 — Enable refresh tokens and request offline access

- **Status:** Required for the selected refresh-token setup.
- **Actor and scope:** The application administrator enables the grant. The client requests offline access during the user's initial authorization.
- **Documented action and values:**
  - Select **Refresh Token** as a **Grant type** in **General Settings**.
  - For an existing application, open it, click **Edit** in **General Settings**, select **Refresh Token**, and click **Save**.
  - Include `offline_access` in the authorization request to `/authorize`.
  - Also request the Okta API scopes needed for the selected tools.
- **Sources:**
  - https://developer.okta.com/docs/guides/refresh-tokens/main/
  - https://help.okta.com/oie/en-us/content/topics/apps/apps_app_integration_wizard_oidc.htm
- **Locations:** “Set up your app,” “Get a refresh token”; “Configure OIDC settings > Web apps > General Settings.”
- **Exact quotations:**
  - “If you're using the Admin Console to create an app, select Refresh Token as a Grant type in the General Settings section.”
  - “The offline_access scope must be requested as part of the code request to the /authorize endpoint, not the request sent to the /token endpoint.”
  - “Mobile apps and web apps use persistent refresh token behavior as the default.”
  - “Refresh Token: Rotate your token after every use or use a persistent token.”
- **Interpretation:** Both the grant and the authorization scope are needed. The central client evidence confirms support for an explicit scope override and upstream refresh-token use. Set the override to include `offline_access` and the selected API scopes. Do not treat `offline_access` as a replacement for API scopes.

### T4-04 — Use the organization authorization server for Okta API scopes

- **Status:** Required.
- **Actor and scope:** A Super Admin grants API scopes to the application. The client requests tokens from the target organization's authorization server.
- **Required values:**

  | Value | Organization-specific setting |
  |---|---|
  | Issuer | `https://{yourOktaDomain}` |
  | Authorization endpoint | `https://{yourOktaDomain}/oauth2/v1/authorize` |
  | Token endpoint | `https://{yourOktaDomain}/oauth2/v1/token` |

- **Documented action:** On the application's **Okta API Scopes** tab, click **Grant** for the scopes needed by the selected tools. Request those scopes during authorization.
- **Environment-specific values:** Obtain `{yourOktaDomain}` from the target organization. Topic 3 supplies the API scope list.
- **Sources:**
  - https://developer.okta.com/docs/guides/implement-oauth-for-okta/main/
  - https://help.okta.com/mcp/en-us/content/topics/mcpserver/oidc-pkce-browser-based.htm
- **Locations:** “Define allowed scopes,” “Get an access token and make a request”; “Grant Okta API scopes.”
- **Exact quotations:**
  - “Only the org authorization server can mint access tokens that contain Okta API scopes.”
  - “Only the Super Admin role has permission to grant scopes to an app.”
  - “Auth URL: Enter the authorization endpoint for your org authorization server, for example, https://{yourOktaDomain}/oauth2/v1/authorize.”
  - “Access Token URL: Enter the token endpoint for your org authorization server, for example, https://{yourOktaDomain}/oauth2/v1/token.”
  - “Select the Okta API Scopes tab.”
  - “Click Grant for the required API scopes.”
- **Interpretation:** Do not substitute the `/oauth2/default` custom authorization server. The OAuth endpoints are not the `/mcp` resource address.

### T4-05 — Account for token expiration

- **Status:** Required for the access-duration warning.
- **Actor and scope:** The setup owner must understand the limits of tokens from the organization authorization server.
- **Documented values:** Access token: **60 minutes**. Refresh token: **90 days**.
- **Source:** https://developer.okta.com/docs/api/openapi/okta-oauth/guides/overview/
- **Location:** “Tokens and claims > Token lifetime.”
- **Exact quotation:** “When you are using the Okta Authorization Server, the lifetime of the JWT tokens is hard-coded to the following values: ID token: 60 minutes Access token: 60 minutes Refresh token: 90 days”
- **Interpretation:** Use the organization-server limits, not custom-server configurable limits.
- **Concise warning:** “Access tokens expire after 60 minutes. Okta documents a 90-day refresh-token lifetime for the organization authorization server. When the refresh token expires or access is revoked, another sign-in is necessary.”

### T4-06 — Do not select DCR or API-key authentication

- **Status:** Required restriction for this interactive managed-server setup.
- **Actor and scope:** The person who configures the client selects Manual OAuth.
- **Documented action:** Supply the registered application's credentials and authenticate with the organization.
- **Source:** https://help.okta.com/mcp/en-us/content/topics/mcpserver/configure-vscode-github-copilot.htm
- **Location:** “Procedure,” connection and authentication steps.
- **Exact quotations:**
  - “After the MCP client connects, you receive a prompt indicating that dynamic client registration isn't supported.”
  - “Enter the client ID that you copied earlier.”
  - “API key-based authentication isn't supported.”
- **Interpretation:** Do not use DCR or a static Okta API key. Do not select the private-key JWT alternative identified in the supplied endpoint research: the central client check reports that its private-key JWT authentication branch is not implemented.

### T4-07 — Complete sign-in and applicable consent

- **Status:** Required for user authentication. Consent prompts are conditional on application and scope settings.
- **Actor and scope:** The assigned connecting user signs in to the target organization and completes applicable authorization prompts.
- **Sources:**
  - https://help.okta.com/mcp/en-us/content/topics/mcpserver/configure-vscode-github-copilot.htm
  - https://developer.okta.com/docs/api/openapi/okta-oauth/guides/overview/
- **Locations:** “Procedure”; “Scopes > Scope properties.”
- **Exact quotations:**
  - “Authenticate with your org.”
  - “A consent dialog appears depending on the values of three elements:”
- **Source detail:** The three elements are `prompt`, `consent_method`, and the scope's `consent` property.
- **Interpretation:** Do not invent a mandatory `prompt=consent` parameter. The refresh-token procedure requires `offline_access`, but it does not prescribe that additional parameter for this setup.

### T4-08 — Obtain the Web app client secret and use Basic authentication

**New finding. Resolves the previous secret and authentication-method gap.**

- **Status:** Required for the selected setup.
- **Actor and scope:** The application administrator obtains the credentials. The client uses them to authenticate to the organization's token endpoint.
- **Documented action and values:**
  - Open the Web app's **General** tab.
  - In **Client Credentials**, select **Client secret** under **Client authentication**.
  - Click **Save** to generate the secret, then view or copy it.
  - Copy the application's **Client ID**.
  - Configure the client with that ID and secret, and use `client_secret_basic`.
- **Sources:**
  - https://help.okta.com/oie/en-us/content/topics/apps/apps_app_integration_wizard_oidc.htm
  - https://developer.okta.com/docs/api/openapi/okta-oauth/guides/client-auth/
- **Locations:** “Configure OIDC settings > Web apps”; introduction and “Client secret.”
- **Exact quotations:**
  - “Client authentication: Choose the client authentication method.”
  - “Click Save to generate the client secret and then view or copy the client secret.”
  - “If you don't specify a method when registering your client, the default method is client_secret_basic.”
  - “client_secret_basic: Provide the client_id and client_secret values in the Authorization header as a Basic auth base64-encoded string with the POST request”
- **Interpretation:** A Web app with a client secret is documented. Basic authentication is supported and is the documented registration default. The central client evidence confirms Basic authentication support. Do not invent a separate Okta console control named `client_secret_basic`.

## Unresolved questions

### Resolved checks

1. **PKCE and refresh-token compatibility — resolved.**  
   The supplied central implementation evidence confirms S256 PKCE, code-verifier submission, explicit scope overrides, and upstream refresh-token use for Manual OAuth.

2. **Application type and token authentication — resolved.**  
   Official Okta sources support Web app, client secret, and PKCE together. They also support `client_secret_basic`. The central client evidence confirms the matching client functions.

The central evidence is from official repository commit `0d9e5079540a7208a3b7cb0762ec7f8b9295e76c`, observed 2026-09-11:

- [challenge.go](https://github.com/speakeasy-api/gram/blob/0d9e5079540a7208a3b7cb0762ec7f8b9295e76c/server/internal/remotesessions/challenge.go), lines 333–359, 652–790, and 1192–1214. Supplied exact code quotations include `q.Set("code_challenge_method", "S256")` and `form.Set("code_verifier", state.CodeVerifier)`.
- [tokenservice.go](https://github.com/speakeasy-api/gram/blob/0d9e5079540a7208a3b7cb0762ec7f8b9295e76c/server/internal/remotesessions/tokenservice.go), lines 58–100 and 537–600. Supplied exact code quotations include `req.SetBasicAuth(url.QueryEscape(clientID), url.QueryEscape(clientSecret))` and `form.Set("grant_type", "refresh_token")`.

These are supplied coordinator checks. This follow-up did not repeat client research or test a live tenant.

### Remaining non-blocking questions

1. **Refresh-token idle limit.**  
   The [refresh-token guide](https://developer.okta.com/docs/guides/refresh-tokens/main/), “Refresh token lifetime,” states: “The refresh token lifetime does expire every seven days if it hasn't been used.” That section also discusses access-policy settings and an Unlimited default. The OAuth reference separately fixes the organization-server lifetime at 90 days. The exact application of the idle statement remains uncertain. It does not prevent the documented initial grant and scope configuration. Do not claim that the selected refresh token lasts indefinitely.

2. **Client-secret lifetime.**  
   The checked Web app and client-authentication instructions do not specify a fixed secret expiration period. Do not claim that the secret never expires. This does not prevent initial secret retrieval.

3. **Testing status and access programs.**  
   The checked authentication instructions do not state a testing-mode restriction or publication requirement for refresh tokens. This does not prove that none exists. Topic 2 owns organization eligibility and Early Access checks.

4. **Release-note confirmation.**  
   The original endpoint report records an unreadable release-note destination. The checked maintained authentication pages showed no replacement notice. This does not prove that no relevant release changes exist.

## Cross-topic dependencies

- **Topic 1:** Confirm authority to create or edit the Web app, configure its secret and PKCE, and enable the Refresh Token grant. **Super Admin** authority is explicitly required to grant Okta API scopes.
- **Topic 2:** Use the selected Web app settings in T4-01, T4-02, T4-03, and T4-08. Register `{{ gram.oauth.callback_url }}`. Preserve separate applications for different user permission sets when applicable.
- **Topic 3:** Supply the minimum API scopes. Confirm assignments and the user's underlying permissions.
- **Topic 5:** Use the organization issuer and OAuth endpoints in T4-04. Keep them separate from the `/mcp` resource URL.
- **Coordinator:** Authentication compatibility is resolved by the central evidence and the official Okta checks. Use **Manual OAuth**, Client ID, Client Secret, `client_secret_basic`, and an explicit scope override with `offline_access` plus the selected API scopes. Use the supplied canonical client instructions for UI actions. No credential-maintenance procedure is needed.## Topic and status

**Topic 5: MCP endpoint and connection configuration — complete.**

Okta documents a remote MCP server at `https://{yourOktaDomain}/mcp`. A local process is not required. The address is specific to the Okta organization.

**The coordinator must check client support for MCP protocol version `2025-11-25` before it selects the final setup path.** Okta states that clients without this support cannot connect.

All sources below were observed on **2026-09-11**. No files or provider settings were changed.

## Findings

### T5-01 — Use the organization-specific remote MCP address

- **Status:** Required for the managed server.
- **Actor and scope:** The person who configures the client enters the address for the target Okta organization. The client connects to that organization's MCP server.
- **Documented action and values:** Use:
  ```
  https://{yourOktaDomain}/mcp
  ```
  Replace `{yourOktaDomain}` with the organization's Okta domain. `/mcp` is fixed. This is an MCP address, not a general API address.
- **Source:** https://help.okta.com/mcp/en-us/content/topics/mcpserver/mcp-client-configuration-overview.htm  
  **Location:** Main text, after “Early Access release.”  
  **Quotation:** “The Okta Managed MCP Server endpoint uses this format: https://{yourOktaDomain}/mcp.”
- **Source:** Same page and location.  
  **Quotation:** “The Okta Managed MCP Server is hosted in the cloud, so you don't need to download packages or manage local server processes.”
- **Interpretation:** The managed server meets the remote URL requirement. Mark this remote as `tenanted: true`.

### T5-02 — Find the domain in the Admin Console

- **Status:** Required when the exact organization domain is not already known.
- **Actor and scope:** An administrator obtains the domain for the target organization.
- **Documented action:** Sign in to the organization with an administrator account. Click the username in the upper-right corner of the Admin Console. Copy the domain from the menu.
- **Environment-specific value:** The organization domain. Documented examples include `example.oktapreview.com`, `example.okta.com`, and `example.okta-emea.com`. These are examples, not shared server addresses.
- **Source:** https://developer.okta.com/docs/guides/find-your-domain/main/  
  **Location:** “Find your Okta domain.”  
  **Quotations:**
  - “Sign in to your Okta organization with your administrator account.”
  - “Locate the Okta domain by clicking your username in the upper-right corner of the Admin Console. The domain appears in the dropdown menu.”
- **Interpretation:** The domain supplies the tenant and deployment value. The MCP instructions do not give a separate region or project field.

### T5-03 — Distinguish the two documented MCP server options

- **Status:** Conditional. Select the option that meets the supported connection requirements.
- **Actor and scope:** The setup owner selects the server deployment for access to the Okta organization.
- **Source:** https://developer.okta.com/docs/guides/okta-open-source-mcp-server/main/  
  **Locations:** Introduction, server descriptions, and “Choose a deployment option.”  
  **Quotation:** “Okta offers two ways to deploy an MCP server: the Okta Open Source MCP Server and the Okta Managed MCP Server.”

| Server | Address and function | Documented differences | Result |
|---|---|---|---|
| **Okta Managed MCP Server** | `https://{yourOktaDomain}/mcp`. Connects an LLM client to Okta APIs for organization tasks. | Okta hosts it. HTTPS connection. OIDC with PKCE for interactive users. JWT private key for service-to-service authentication. | Applicable remote option. |
| **Okta Open Source MCP Server** | No remote MCP URL is given in the deployment comparison. Provides access to Okta through a self-hosted server. | Runs on the customer's computer or infrastructure. Uses STDIO. Device Authorization code flow for interactive users. JWT private key for service-to-service authentication. | The documented STDIO setup is unsupported for this URL-only connection. It does not prevent use of the managed server. |

- **Exact quotations from the comparison:**
  - Open Source transport: “Uses STDIO.”
  - Managed setup: “No installation required. Connect through an HTTPS endpoint.”
  - Open Source user authentication: “Device Authorization code flow (interactive users).”
  - Managed user authentication: “OpenID Connect (OIDC) with Proof Key for Code Exchange (PKCE) for interactive users.”
  - Service-to-service authentication, both options: “JWT private key (API Services for autonomous agents).”
- **Interpretation:** These are two deployment options. Organization domain variants are not additional servers. The managed server's Core Identity and Identity Governance features use the documented managed-server address; the sources do not present them as separate MCP servers with separate URLs.

### T5-04 — Check the required MCP protocol version

- **Status:** Required.
- **Actor and scope:** The coordinator checks the connecting client's implementation.
- **Documented required value:** MCP protocol version `2025-11-25`.
- **Source:** https://help.okta.com/mcp/en-us/content/topics/mcpserver/mcp-client-configuration-overview.htm  
  **Location:** Note after the endpoint instructions.  
  **Quotation:** “The Okta Managed MCP Server supports the 2025-11-25 MCP protocol version. MCP clients that don't support this protocol version can't connect to the server.”
- **Interpretation:** A remote HTTP connection alone does not establish client compatibility. The supplied client context does not establish support for this protocol version.

### T5-05 — Use OAuth, not an API key or DCR

- **Status:** Required for the documented interactive managed-server connection.
- **Actor and scope:** The application setup owner supplies the registered client ID. The connecting user authenticates with the target organization.
- **Documented connection settings:** The official client example specifies:
  ```json
  {
    "servers": {
      "okta-managed-mcp": {
        "type": "http",
        "url": "https://yourorg.okta.com/mcp"
      }
    }
  }
  ```
  `yourorg.okta.com` is an example organization domain.
- **Documented action:** Enter the previously created client ID when prompted, then authenticate with the organization.
- **Source:** https://help.okta.com/mcp/en-us/content/topics/mcpserver/configure-vscode-github-copilot.htm  
  **Location:** “Procedure,” connection configuration and authentication steps.  
  **Quotations:**
  - “After the MCP client connects, you receive a prompt indicating that dynamic client registration isn't supported.”
  - “Enter the client ID that you copied earlier.”
  - “The Okta Managed MCP Server uses OAuth 2.0 for authentication.”
  - “API key-based authentication isn't supported.”
- **Interpretation:** Use a pre-registered OAuth client for the interactive path. The connection example does not specify additional custom headers or URL parameters. This observation does not prove that every unmentioned setting is unnecessary.

### T5-06 — Enable the managed-server feature for the organization

- **Status:** Required. The feature selection is conditional on the required tools.
- **Actor and scope:** An authorized organization administrator enables the relevant feature. Topic 1 must confirm the required authority.
- **Documented action and values:** In **Settings > Features** in the Admin Console, enable:
  - **Okta Managed MCP Server - Core Identity** for IAM tools.
  - **Okta Managed MCP Server - Identity Governance** for OIG tools.
- **Source:** https://help.okta.com/mcp/en-us/content/topics/mcpserver/mcpserver.htm  
  **Location:** Opening note and Early Access instructions.  
  **Quotations:**
  - “Okta Managed MCP Server is a self-service Early Access feature.”
  - “To enable it, go to Settings > Features in the Admin Console and turn on the following features:”
  - “For IAM tools - Okta Managed MCP Server - Core Identity”
  - “For OIG tools - Okta Managed MCP Server - Identity Governance”
- **Interpretation:** Do not assume that the endpoint is ready only because the organization domain exists. Organization-level enablement is a setup dependency. Okta manages the server infrastructure.

### T5-07 — Confirm service and environment eligibility

- **Status:** Required for managed-server setup.
- **Actor and scope:** The organization setup owner confirms the subscriptions and deployment environment.
- **Source:** https://help.okta.com/mcp/en-us/content/topics/mcpserver/mcpserver.htm  
  **Location:** Opening note.  
  **Quotations:**
  - “The Okta Managed MCP Server requires a subscription to IT Products - Okta Managed MCP Server, plus at least one of the following:”
  - “Okta Managed MCP Server - Core Identity”
  - “Okta Managed MCP Server - Identity Governance”
  - “The Okta Managed MCP Server isn't available for Okta for Government Moderate (FedRAMP Moderate, HIPAA), Okta for US Military (DoD IL4), or Okta for Government High (FedRAMP High).”
- **Additional source statement:** Core Identity requires an existing UD, SSO, MFA, AMFA, or LCM subscription. Identity Governance requires an existing OIG subscription.
- **Interpretation:** Feature and subscription differences do not establish separate server addresses. Topics 1 and 2 must include the applicable prerequisites.

## Unresolved questions

1. **Blocking for final client compatibility; coordinator owns the check:** Does the supplied Speakeasy client support MCP protocol version `2025-11-25`?  
   The provider explicitly requires it. The supplied client context describes remote connections and OAuth configuration, but does not state this protocol version. The coordinator cannot confirm the final connection path without this check.

2. **Non-blocking — release-note confirmation:** The release-note link on the maintained setup pages points to:  
   https://help.okta.com/okta_help.htm?type=mcp&id=mcpserver-releasenotes  
   The fetch returned an “Okta Docs” page without readable release notes. The checked setup pages showed no replacement notice. This failed lookup does not prove that no relevant changes exist.

3. **Non-blocking — unmentioned connection settings:** The official remote example does not specify additional custom headers, URL parameters, or custom-domain rules. No material setup action depends on these undocumented possibilities when the reader uses the documented organization domain and OAuth path.

## Cross-topic dependencies

- **Topic 1:** Confirm authority to enable the Early Access features and satisfy subscription prerequisites. T5-06 and T5-07 supply the documented actions.
- **Topic 2:** Include organization feature enablement and the registered OAuth application. Do not create separate endpoint steps for Core Identity and Identity Governance.
- **Topic 3:** Check connecting-user assignments and permissions. The client page states: “The Okta Managed MCP Server loads all available tools and actions based on the scopes in your access token.”
- **Topic 4:** Use the managed-server OAuth requirements. DCR and API key authentication are not supported in the documented interactive connection. Do not apply the Open Source server's Device Authorization flow to this server.
- **Coordinator:** Check MCP `2025-11-25` support before final path selection. Use remote pattern `https://{yourOktaDomain}/mcp` with `tenanted: true`. Under the supplied client rules, select **Custom remote server**. Use the client-configuration overview as the primary MCP documentation link.
# Client evidence

Observed: 2026-09-11. Official repository commit: 0d9e5079540a7208a3b7cb0762ec7f8b9295e76c. Base URL for all paths: https://github.com/speakeasy-api/gram/blob/0d9e5079540a7208a3b7cb0762ec7f8b9295e76c/

- C1: server/internal/remotesessions/challenge.go lines 652–790 and 1192–1214. Upstream authorization sets `q.Set("code_challenge_method", "S256")`. The code exchange sets `form.Set("code_verifier", state.CodeVerifier)`. This shared remote-session flow applies to stored manual clients, not only DCR. PKCE is automatic; no extra client setup action is necessary. Test: server/internal/remotesessions/challenge_unchanged_regression_test.go lines 143–174 checks S256 and the matching verifier.
- C2: server/internal/remotesessions/challenge.go lines 333–359: `IssuerScopeOverride` is used verbatim. Otherwise advertised standard scopes, including `offline_access`, are appended. Use an explicit scope override with offline_access and the granted API scopes.
- C3: server/internal/remotesessions/tokenservice.go lines 58–100 supports Basic, Post, and public client authentication. `req.SetBasicAuth(url.QueryEscape(clientID), url.QueryEscape(clientSecret))`. Select a registered Web app with a client secret and client_secret_basic. The private-key JWT branch explicitly reports not implemented; do not select that alternative.
- C4: server/internal/remotesessions/tokenservice.go lines 537–600: `form.Set("grant_type", "refresh_token")`. Refresh uses the saved upstream grant and client credentials. It runs on expired or near-expiry tokens when a refresh grant is available. Test: server/internal/remotesessions/challenge_jwt_expiry_test.go, TestRemoteLoginCallback_JWTAccessToken_RefreshesOnceExpPasses. This is upstream token use, not downstream client refresh. No maintenance step is needed.
- C5: server/internal/externalmcp/mcpclient_discoverprobe_test.go lines 89 and 122–139 supplies upstream protocolVersion 2025-11-25 and checks successful connection after the newer discovery probe is rejected. The client uses github.com/modelcontextprotocol/go-sdk v1.7.0 (go.mod line 58). This establishes upstream connection support, not only downstream version acceptance. server/internal/remotemcp/proxy/protocol_version.go describes the separate pass-through path where downstream and upstream agree their version.

Conditions: A manual remote identity provider must contain the selected scope override, organization issuer, client ID, secret, and matching token authentication method. Refresh requires the provider to return a refresh token. No relevant feature flag was found in the inspected authorization and token paths. Source tests were inspected, not run. This check does not test a live Okta tenant. No concrete release mismatch was found. Use doctrine/speakeasy-setup.md for user actions, not source code.

Selected candidate: Manual OAuth; Okta Web app; Authorization code with PKCE; Refresh Token grant; organization authorization server; client secret with Basic authentication; offline_access plus the API scopes selected for the required tools. Retain distinct apps for distinct user permission sets when required.
# Speakeasy setup — canonical file

The single source for every Guide's `speakeasy.md`: the steps a reader
follows in the Speakeasy AI Control Plane after finishing External setup
(`external.md`). This file is doctrine — maintained by a human, read-only
to pipeline agents (constitution I7), changed only per invariant I8.
Technical Research transcludes the skeleton below into each guide's
Research Dossier and records the per-guide values it renders with; the
Writer renders `speakeasy.md` from the Dossier like any other facts.
Consumers may omit this file when Speakeasy setup is already in context
(for example an installed MCP server's detail page showing only
`external.md`).

UI facts below are drawn from the product source
(`speakeasy-api/gram`, `client/dashboard`, branch `main`): add-server and
Manual OAuth / Upstream Headers labels from commit `96f7f73` (observed
2026-07-23); Dynamic Client Registration (DCR) attach-sheet labels from
commit `f1d60da` (observed 2026-07-27). Labels are verbatim code-level
strings; a rendered-UI spot check on first use is still worthwhile. No
role may invent a label this file does not carry.

## Per-guide values (recorded in the Dossier's Speakeasy setup section)

- `<remote URL>` — from `meta.yaml` `remotes`. (The Control Plane
  proxies remote servers over streamable-http; the add form's
  **Transport** field is read-only.) Mark each remote
  `tenanted: true` when the reader must paste a region, instance, or
  org-specific URL rather than a single shared public endpoint. When the
  URL is shared but the guide must still skip the catalog (unreliable
  mapping, multi-endpoint selection), set guide-level
  `speakeasy_add_server: custom-remote` instead of mislabeling remotes
  as tenanted.
- Optional `speakeasy_add_server`: `auto` (default), `catalog`, or
  `custom-remote`.
- The Authentication Option the guide documents, which External-setup
  step produced each credential field, and — for OAuth options — any
  scopes the provider requires. For DCR, also record the **Issuer URL**
  (often the remote origin) when the Control Plane cannot discover it
  from protected-resource metadata alone.
- `<further-reading URL>` — the provider's primary MCP documentation
  page, for the closing pointer.

## Add-server path selection

There are two add-server paths. Pick **exactly one** when the path is
resolved; keep both only when Pulse presence is unresolved **and** no
override applies.

1. **Tenanted** — any `remotes[].tenanted: true` → **Custom remote only**
   (treat as non-registry), even if Pulse lists the provider.
2. Else **`speakeasy_add_server`**:
   - `custom-remote` → Custom remote only
   - `catalog` → catalog only
   - `auto` / omitted → Pulse catalog presence in operator notes:
     - **present** → catalog (3rd-party server) only
     - **absent** → Custom remote only
     - **ambiguous** / **skipped** / no lookup → both bullets + soft
       catalog-presence open question

Do not keep the alternate path or a catalog-presence open question when
the path is resolved (tenanted, `speakeasy_add_server` override, present,
or absent).

## The skeleton (anchors are fixed; carry them verbatim)

Both bullets below are **source material**. Research emits only the
matching imperative path (or both when unresolved). Writer renders what
the Dossier chose — not the conditional "If … is in the catalog" framing
when presence is known.

### Add the server in Speakeasy {#add-server-in-speakeasy}

In the Speakeasy AI Control Plane sidebar, under **Connect**, select
**Sources**, then click **Add Source**.

**Catalog path** (Pulse **present** with `auto`, or
`speakeasy_add_server: catalog`; never when tenanted or
`custom-remote`): choose **3rd-party server**. On the **MCP Catalog**
page, find <Provider> (the search box reads **Search MCP servers...**),
open its entry with **View**, and click **Add**. In the **Add to
Project** dialog, click **Add to Project**.

**Custom remote path** (tenanted, `speakeasy_add_server: custom-remote`,
or Pulse **absent**): choose **Custom remote server**. On the **Add a
custom remote MCP server** page, paste `<remote URL>` into **Remote MCP
server URL** and click **Add server**.

**Dual conditional** (Pulse **ambiguous** / **skipped** only, `auto`,
and not tenanted / not forced) — keep both as bullets:

- If <Provider> is in the catalog: choose **3rd-party server**. On the
  **MCP Catalog** page, find <Provider> (the search box reads
  **Search MCP servers...**), open its entry with **View**, and click
  **Add**. In the **Add to Project** dialog, click **Add to Project**.
- If it is not: choose **Custom remote server**. On the
  **Add a custom remote MCP server** page, paste `<remote URL>` into
  **Remote MCP server URL** and click **Add server**.

Either resolved path (or either dual branch) creates the hosted MCP
server and opens its **Overview** page. When only one path is emitted,
close with: This creates the hosted MCP server and opens its
**Overview** page.

<!-- screenshot: the Add Source menu open on the Sources page, or the provider's catalog entry -->

### Connect your credentials {#connect-speakeasy-credentials}

From the server's **Overview**, open **Settings**. The Writer renders
only the variant matching the guide's Authentication Option, names the
guide's actual fields, and cross-links each value to the External-setup
step that produced it (or, for DCR with no External credentials, to the
step that produced the issuer / region URL).

- OAuth with a pre-registered client: under **Authentication**, click
  **Configure Manually** (or **Use Discovered** when offered — the
  Dossier records whether the provider publishes discoverable OAuth
  metadata). In the **Attach Remote Identity Provider** sheet, set
  **Client Type** to **Manual**. The sheet shows the **Redirect URI**
  with a copy button — the callback URL the guide had the reader
  register in External setup (`{{ gram.oauth.callback_url }}`).
  <!-- verify(operator): the template key substitutes this same Redirect URI value -->
  Paste the **Client ID** and **Client Secret (optional)** from
  External setup, then click **Attach Identity Provider**. Confirm the
  sheet's **Redirect URI** matches the `{{ gram.oauth.callback_url }}`
  value registered under the provider's redirect/callback field in
  External setup — readers paste that template key directly there; they
  do not visit this sheet mid–External-setup only to copy the URI.
- OAuth with Dynamic Client Registration (DCR): under **Authentication**,
  click **Configure Manually** (or **Use Discovered** when offered — the
  Dossier records whether protected-resource metadata makes discovery
  available without a pasted issuer). In the **Attach Remote Identity
  Provider** sheet, when the issuer is not already known, paste the
  provider **Issuer URL** from External setup (typically the remote MCP
  origin). Keep the auto-derived **Slug** and **Display name (optional)**
  unless the Dossier records a project naming requirement. Under
  **Endpoints**, click **Discover** so authorization, token, and
  registration endpoints fill from the provider's authorization-server
  metadata. Under **Session Client**, keep **Client Type** set to
  **Dynamic Client Registration (DCR)** (the default when a registration
  endpoint is discovered). Keep **Token Endpoint Auth Method** at the
  discovered default unless the Dossier records a required override.
  Leave **Scope (override)** and **Audience (optional)** empty unless
  the Dossier records values to enter. Click **Attach Identity
  Provider**. The Control Plane registers the OAuth client at the
  provider's registration endpoint — there is no **Client ID** or
  **Client Secret** to paste, and readers do not register
  `{{ gram.oauth.callback_url }}` on the provider for this path. When a
  client first needs provider access, complete the provider's on-screen
  browser authorization prompts with the intended account (exact prompt
  labels are provider-specific; do not invent them).
- API key / token: under **Upstream Headers**, click **Add header**,
  enter the **Header name** (for example `Authorization`), leave
  **Value source** as **Static value**, paste the value from External
  setup, check **Secret**, and click **Save**. (Catalog installs may
  collect the same headers earlier, in the **Add to Project** dialog's
  **Upstream headers** section.)
<!-- screenshot: the Attach Remote Identity Provider sheet (Manual with Redirect URI, or DCR after Discover with Client Type Dynamic Client Registration), or the Upstream Headers editor; values redacted -->

## The closing pointer

The guide's final line — plain prose after the last Speakeasy step in
`speakeasy.md`:

> This guide covers setup only. For anything beyond it — billing, tool
> behavior, limits — see [<Provider>'s MCP documentation](<further-reading URL>).

Rendered as a normal sentence, not a blockquote; the quote above is
template text.

## Out of scope (operator note)

The server's Settings also carry the hosted **Server URL**, publishing,
and plugin surfaces (the dashboard's readiness checklist runs Server URL
→ Authentication → Source → Included in Plugin). Guides stop after
credentials; extend this file deliberately if distribution steps should
ever join guide scope.
