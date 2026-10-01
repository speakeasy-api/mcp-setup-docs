---
research_version: 1
slug: netsuite
researched_at: 2026-08-07T22:23:30Z
---

# NetSuite — Research Dossier

## Server facts

- NetSuite calls the official remote MCP service the **NetSuite AI Connector Service**. This Guide uses the account-specific MCP Standard Tools SuiteApp endpoint:

  `https://<accountid>.suitetalk.api.netsuite.com/services/mcp/v1/suiteapp/com.netsuite.mcpstandardtools`

  Replace `<accountid>` with the NetSuite account ID. The MCP Standard Tools SuiteApp documentation explicitly gives this endpoint and says it returns only the tools from that SuiteApp. The broader `/services/mcp/v1/all` endpoint returns all available custom tools in the account and is not the endpoint selected for this Guide.
- The endpoint is account-specific, so the Metadata marks it `tenanted: true`. NetSuite documents streamable HTTP, MCP protocol version 2025-06-18, and OAuth 2.0 Authorization Code Grant with PKCE as client requirements.
- Authentication is OAuth 2.0 with a manually registered **public client**. The Speakeasy AI Control Plane needs the resulting **Client ID**, but no client secret. The integration record must have **Authorization Code Grant**, **Public Client**, and the **NetSuite AI Connector Service** scope enabled, and its **Redirect URI** must equal `{{ gram.oauth.callback_url }}`. All Token-based Authentication boxes, all Client Credentials boxes (including **Client Credentials (Machine to Machine) Grant**), and the other OAuth 2.0 scope boxes (**RESTlets**, **REST Web Services**, and **SuiteAnalytics Connect**) must remain cleared.
- The NetSuite AI Connector Service itself is not a paid feature, and Oracle describes MCP Standard Tools as a free SuiteApp. The selected path nevertheless requires the MCP Standard Tools SuiteApp. Operator validation identifies it as Bundle ID **522506**; Oracle's current public install page confirms the SuiteApp name and Marketplace install path but does not print the Bundle ID.
- Required account configuration: **Server SuiteScript**, **OAUTH 2.0**, and **REST Web Services** enabled. The first two are required for the AI Connector Service; REST Web Services is additionally required for MCP Standard Tools.
- Runtime access must use a non-Administrator role. Under **Permissions > Setup**, that role needs **MCP Server Connection**, **Log in using OAuth 2.0 Access Tokens** (not **Log in using Access Tokens**), and **REST Web Services** for MCP Standard Tools record operations. Existing record permissions continue to control what the tools can see and do. Oracle recommends a separate, least-privilege role; this Guide requires a scoped non-admin role rather than expanding a broad role.
- The MCP Standard Tools SuiteApp uses the role's existing permissions. Its tools can create and update records through REST Web Services where that role already permits those records and actions. The role also needs access to the SuiteApp folder in the File Cabinet; a restricted folder can cause an access-denied or empty-tool result.
- Compliance gate: Oracle states that the service has not been assessed for HIPAA and must not be used to store, process, or transmit ePHI unless the organization has independently determined that use meets its obligations. An administrator should obtain the application or cloud security owner's approval before proceeding where regulated data may be involved.

## Credential flow

An administrator enables the required SuiteCloud features, installs MCP Standard Tools, prepares a least-privilege non-Administrator role, finds the account ID, and manually creates an OAuth 2.0 integration record. The integration record is a public client: NetSuite issues a **Client ID**, while the Speakeasy AI Control Plane does not need the displayed client secret. Enter `{{ gram.oauth.callback_url }}` directly in NetSuite's **Redirect URI** field. Later, the Speakeasy **Add Client** form on the custom identity provider displays the resolved **Redirect URI**; confirm that it matches the callback registered in NetSuite.

The MCP endpoint embeds the account ID. Oracle's MCP connection page says an Administrator can provide this account-specific URL. Oracle's account-domain page places account-specific URLs at **Setup > Company > Company Information > Company URLs**, but does not identify an MCP-specific row there. For this documented endpoint, copy the account ID shown in NetSuite and substitute it exactly as the MCP page directs; note that sandbox and Release Preview account IDs are normalized in hostnames (underscores become hyphens and letters become lowercase).

Before Speakeasy setup, assign the scoped non-Administrator role to every employee who will authorize the connection. At first authorization after Speakeasy is configured, the user signs in to NetSuite with that role and reviews the allow/deny access prompt. OAuth and tool access then run with that user's selected role and permissions.

## Console walkthrough

Start from the NetSuite application while signed in as an Administrator or an appropriately delegated administrator. Oracle says integration records can be created by an Administrator or a user with **Integration Application** permission. SuiteApp installation and role/feature changes require equivalent administrative access.

### Enable the required features {#enable-required-features}

- Navigate to **Setup > Company > Enable Features**, then open the **SuiteCloud** subtab.
- Under **SuiteScript**, check **Server SuiteScript**.
- Enable **OAUTH 2.0**.
- Under **SuiteTalk (Web Services)**, check **REST Web Services**.
- Click **Save**. These features must be enabled before installing and using MCP Standard Tools.
- Screenshot note: capture the **SuiteCloud** subtab with **Server SuiteScript**, **OAUTH 2.0**, and **REST Web Services** visible and enabled; exclude unrelated account details.

### Install MCP Standard Tools {#install-mcp-standard-tools}

- From the saved NetSuite page, open the **SuiteApps** tab.
- In **Search SuiteApps**, enter `MCP Standard Tools`. Operator validation identifies the package as Bundle ID `522506`; use the exact title to distinguish it in the Marketplace.
- Select the **MCP Standard Tools** icon.
- On the SuiteApp details page, click **Install** at the top right.
- Wait for installation to complete before continuing. It is a managed SuiteApp and Oracle updates it automatically.
- Screenshot note: capture the **MCP Standard Tools** SuiteApp details page with the title and **Install** control visible; include Bundle ID 522506 if the live Marketplace displays it.

### Configure a scoped non-admin role {#configure-scoped-role}

- Navigate to **Setup > Users/Roles > Manage Roles**.
- Edit the existing approved non-Administrator role intended for MCP. Do not use **Administrator** or a role with full permissions; NetSuite blocks the service for those roles.
- Open **Permissions > Setup** and add **MCP Server Connection**.
- Add **Log in using OAuth 2.0 Access Tokens**. Do not choose the similarly named **Log in using Access Tokens** permission.
- Add **REST Web Services** for MCP Standard Tools record operations.
- Retain only the record and task permissions approved for MCP use; these permissions determine which data and operations are available. Ensure the role is not restricted from the MCP Standard Tools SuiteApp folder in the File Cabinet. Oracle warns that File Cabinet restrictions can block the SuiteApp, but the reviewed public pages do not publish the exact SuiteApp folder path or the role-form control used to grant access; obtain those account-specific details from the NetSuite owner if File Cabinet restrictions are in use.
- Save the role. NetSuite's public MCP page names the path, subtab, and permissions but does not state the exact role form's save-button label.
- For each employee who will authorize the connection, navigate to **Lists > Employees > Employees**, click **Edit** for the employee, open **Access > Roles**, select the scoped role in **Role**, click **Add**, and click **Save**. Oracle's employee-access task documents this user-to-role assignment path.
- Screenshot note: capture the role's **Permissions > Setup** list showing the three required permissions and the non-Administrator role name; redact user and account-specific data.

### Record the account-specific MCP URL {#record-account-mcp-url}

- Navigate to **Setup > Company > Company Information**. Record the account ID for the currently logged-in account. The same page's **Company URLs** subtab lists account-specific service URLs.
- Form the MCP Standard Tools endpoint using the exact account-specific host form documented by NetSuite:

  `https://<accountid>.suitetalk.api.netsuite.com/services/mcp/v1/suiteapp/com.netsuite.mcpstandardtools`

- Replace `<accountid>` with the account's domain-form ID. For sandbox and Release Preview IDs, convert underscores to hyphens and uppercase letters to lowercase (for example, the documented account ID form `123456_SB1` becomes host component `123456-sb1`). Do not omit the `/suiteapp/com.netsuite.mcpstandardtools` suffix.
- Keep the completed URL for **MCP server URL** in the Speakeasy AI Control Plane.
- Screenshot note: capture **Company Information > Company URLs** with the account-specific SuiteTalk domain visible; redact unrelated URLs and account data. The final MCP path is assembled from Oracle's documented fixed suffix rather than copied from a named MCP row.

### Create the OAuth integration {#create-oauth-integration}

- Navigate to **Setup > Integration > Manage Integrations > New**.
- Enter an organization-approved name such as `Speakeasy NetSuite MCP` in **Name**.
- Set **State** to **Enabled**. **Description** and **Note** are optional.
- Open the **Authentication** subtab. Under **OAuth 2.0**, check **Authorization Code Grant**.
- In **Redirect URI**, enter:

  `{{ gram.oauth.callback_url }}`

  NetSuite validates redirect URIs when the record is saved and requires HTTPS or a custom URL scheme; the template resolves to the Speakeasy callback URL.
- Check **Public Client**. Do not check **Dynamic Client Registration**; this Guide uses a manually registered public client with PKCE.
- Check only the **NetSuite AI Connector Service** OAuth 2.0 scope. Clear **RESTlets**, **REST Web Services**, and **SuiteAnalytics Connect** in the OAuth 2.0 scope area even though the account-level REST Web Services feature and role permission are required for MCP Standard Tools.
- Ensure all boxes in **Token-based Authentication** and **Client Credentials** are cleared, including **Client Credentials (Machine to Machine) Grant**.
- Choose the organization's approved **OAuth 2.0 Consent Policy**. **Never Ask** is unavailable for the NetSuite AI Connector Service scope; **Always Ask** is the default, while **Ask First Time** prompts on first authorization and in the additional cases Oracle documents.
- Before clicking **Save**, be ready to copy the credential screen: Oracle displays the client ID and client secret only after the first save and they cannot be retrieved after leaving. Click **Save**.
- Copy **Client ID** for the Speakeasy **Client ID** field. Because **Public Client** is enabled, do not provide the displayed client secret to the Speakeasy AI Control Plane.
- If the credential page was closed before the **Client ID** was recorded, navigate to **Setup > Integration > Manage Integrations**, click **Edit** for the integration, and warn affected owners that resetting replaces its existing credentials. Click **Reset Credentials**, then click **OK** in the confirmation popup. On the new credential screen, copy the replacement **Client ID** before leaving the page.
- Screenshot note: capture the integration's **Authentication** subtab before save, showing **Authorization Code Grant**, **Redirect URI**, **Public Client**, and only **NetSuite AI Connector Service** selected; take a separate credential-screen image with all values fully redacted.

## Speakeasy setup

Canonical source: `doctrine/speakeasy-setup.md` (gram `main` commit
`68b3f78`), read 2026-09-30. The Speakeasy MCP Catalog result for query
`netsuite` was **overridden-tenanted**. Independently, the account-specific
remote has `tenanted: true`, which requires rendering only the **Hosted
remotely** path.

Per-guide values:

- Remote URL:
  `https://<accountid>.suitetalk.api.netsuite.com/services/mcp/v1/suiteapp/com.netsuite.mcpstandardtools`,
  formed in {#record-account-mcp-url}.
- Authentication Option: `oauth-public-client` → **User Identity**. OAuth 2.0
  Authorization Code Grant with PKCE, manual public client, **Client ID** only
  (from {#create-oauth-integration}); no client secret.
- Probe outcome: not observed. Account-specific hosts resolve only for real
  accounts (sample IDs did not resolve in DNS on 2026-09-30), and no account
  was available. Oracle's MCP pages do not document protected-resource
  metadata. Whether the create form preselects **User Identity** is unknown,
  so the guide tells the reader to select it.
- PRM issuer: unknown (see probe). Treat discovery as unavailable and render
  the custom identity provider route.
- CIMD/DCR: unknown for the MCP resource. NetSuite integration records carry a
  **Dynamic Client Registration** checkbox and Oracle says an integration
  record is created automatically on first connection from Claude, which
  suggests DCR exists; this guide keeps DCR cleared and uses the manual
  public client.
- Custom provider values (New Remote Identity Provider), `<accountid>` in
  domain form:
  - **Issuer URL**: `https://<accountid>.suitetalk.api.netsuite.com`. Oracle
    documents the account's OIDC metadata at
    `https://<accountid>.suitetalk.api.netsuite.com/.well-known/openid-configuration`
    (NetSuite as OIDC Provider), which places the issuer on this host. The
    exact issuer string was not observed.
  - **Authorization Endpoint**:
    `https://<accountid>.app.netsuite.com/app/login/oauth2/authorize.nl`
    (Oracle, Step One GET Request to the Authorization Endpoint).
  - **Token Endpoint**:
    `https://<accountid>.suitetalk.api.netsuite.com/services/rest/auth/oauth2/v1/token`
    (Oracle, Step Two POST Request to the Token Endpoint; public clients send
    `client_id` in the body with PKCE and no secret).
  - **Discover** is not used: the OIDC metadata exists only when the NetSuite
    as OIDC Provider feature is enabled.
- Registration choice: a **Manual** client created under the custom
  provider's **Add Client** (**Client Type** **Manual**, **Client ID**,
  **Client Secret (optional)** left empty, **Scope (override)** `mcp`,
  confirm **Redirect URI**), then **Existing client** on the server's
  **Settings > Identity**.
- Scope string: `mcp`. Oracle lists `mcp` as the scope value for the NetSuite
  AI Connector Service and says it can only be used on its own (scopes are
  otherwise space-separated). There is no PRM scope list to fall back on, so
  the scope must be entered.
- Server Availability: when creation left the server **Disabled**, finish
  with **Settings > Danger Zone > Server Availability** → **Enable MCP
  server**.
- Further reading:
  `https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/article_4160616848.html`

### Add the server in Speakeasy {#add-server-in-speakeasy}

In the Speakeasy AI Control Plane sidebar, under **MCP Gateway**, select
**MCP**, then click **Add new** to open **Add MCP server**. Choose **Hosted
remotely**. On **New remote MCP server**, paste the account-specific URL from
{#record-account-mcp-url} into **MCP server URL**, leave **User session
issuer** at its default, click **Verify connectivity**, select **User
Identity**, leave **Guardrails** off, and click **Save**.

- Screenshot note: capture **New remote MCP server** after verification with
  the NetSuite endpoint (account ID redacted) and **User Identity** selected.

### Connect your credentials {#connect-speakeasy-credentials}

In **Settings > Identity**, select **User Identity**, open **Choose an
identity provider**, and click **Create a custom identity provider** (opens
**Remote Identity Providers**). Click **New Remote Identity Provider**, enter
the **Issuer URL**, **Authorization Endpoint**, and **Token Endpoint** above,
keep the derived **Slug**, and click **Create**. On the provider, click **Add
Client**: **Client Type** **Manual**, the **Client ID** from
{#create-oauth-integration}, leave **Client Secret (optional)** empty, enter
`mcp` in **Scope (override)**, confirm **Redirect URI** matches
`{{ gram.oauth.callback_url }}`, and click **Create**. Back in the server's
**Settings > Identity**, select that provider, choose **Existing client**,
pick the client under **Client**, and click **Save** (confirm with **Save
changes** when asked). Then turn on **Enable MCP server** under **Settings >
Danger Zone > Server Availability**.

When a person first requests access, they complete NetSuite's browser sign-in
with the intended scoped non-Administrator role, review the allow/deny
prompt, and allow access only after reviewing the organization's
data-sharing controls.

- Screenshot note: capture **New Remote Identity Provider** with the NetSuite
  issuer and endpoints (account ID redacted), and **Settings > Identity** with
  the provider and **Existing client** selected.

The Writer should close with: This guide covers setup only. For anything beyond it — billing, tool behavior, limits — see [NetSuite's MCP documentation](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/article_4160616848.html).

## Open questions

- Oracle's current public Marketplace installation page names **MCP Standard Tools** but does not expose Bundle ID **522506** in its text. The ID comes from operator validation; confirm it against the authenticated SuiteApp Marketplace listing during screenshot capture.
- Oracle documents the account-ID endpoint template and the **Company URLs** page, but does not name a dedicated MCP URL field or give an exact text label for the account ID on that page. The Guide therefore uses the documented account ID and hostname normalization rather than claiming a copyable MCP row.
- Oracle does not publish, on the reviewed MCP setup and SuiteApp installation pages, the exact MCP Standard Tools folder path in the File Cabinet or the role-form control used to grant folder access. If File Cabinet restrictions are in use, obtain those account-specific details from the NetSuite owner.
- Oracle does not publish, on the reviewed MCP setup pages, whether this MCP endpoint exposes protected-resource metadata usable by Speakeasy discovery, and no account was available to probe it. The Speakeasy path therefore uses a custom identity provider. An operator with a NetSuite account should probe the remote (401 with or without `resource_metadata`), record the PRM issuer and whether it advertises DCR or CIMD, and confirm the **Issuer URL** value. If the PRM advertises working DCR, creation may auto-register its own client, and the guide should be re-rendered for that path.

## Provenance

### Source inventory

- **Oracle NetSuite Applications Suite Help Center** (`docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/`) — official product, administrator, OAuth, SuiteApp, and MCP documentation; used throughout. No `/llms.txt` index was available at the Help Center root (HTTP 404 when observed).
- **Oracle SuiteAnswers** (`suiteanswers.custhelp.com`) — official support KB linked from the MCP docs for client-specific setup. Its linked articles require the support property and were not needed for this client-neutral, manually registered Speakeasy path. No `/llms.txt` index was available (HTTP 404 when observed).
- **Speakeasy MCP Catalog tenant lookup** — operator reports result `overridden-tenanted` for query `netsuite`. The account-specific remote's `tenanted: true` status independently requires the Custom remote path.

### Sources used

- https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/article_4160616848.html — observed 2026-08-07T22:23:30Z, re-read 2026-09-30; official NetSuite AI Connector FAQ. Backs protocol version, streamable HTTP, OAuth authorization-code PKCE, endpoint forms and `/all` warning, required features and role permissions, non-Administrator restriction, no-cost statement, integration-record properties, and troubleshooting facts.
- https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/article_3200541651.html — observed 2026-08-07T22:23:30Z; official getting-started hub. Backs service identity, MCP Standard Tools availability, and compliance warning.
- https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_0714080625.html — observed 2026-08-07T22:23:30Z; official required features and permissions page. Backs exact feature path and labels, role path/subtab, exact permission labels, Administrator prohibition, and REST Web Services requirements.
- https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/article_143403258.html — observed 2026-08-07T22:23:30Z; official MCP Standard Tools overview. Backs role-based data/action boundaries, create/update implications, and separate least-privilege role recommendation.
- https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/article_0902023450.html — observed 2026-08-07T22:23:30Z; official SuiteApp installation page. Backs exact Marketplace navigation, controls, managed-update behavior, endpoint suffix, and File Cabinet access caveat.
- https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_0714082142.html — observed 2026-08-07T22:23:30Z, re-read 2026-09-30 (adds that an integration record is created automatically on first connection from Claude); official connection and namespacing page. Backs account-specific server URL, Standard Tools application ID, `/all` distinction, integration-record requirements, first-connection consent behavior, and role selection.
- https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_157771733782.html — observed 2026-08-07T22:23:30Z; official OAuth integration-record task. Backs navigation, field labels, public-client behavior, redirect rules, NetSuite AI Connector Service scope exclusivity, consent-policy choices, create permission, save action, one-time credential display, and the **Edit** > **Reset Credentials** > **OK** recovery path.
- https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_N895277.html — observed 2026-08-07T22:23:30Z; official employee-access task. Backs the employee record's **Access > Roles** path and assigning a role with **Role**, **Add**, and **Save**.
- https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_1498251763.html — observed 2026-08-07T22:23:30Z; official account-specific domains page. Backs **Company Information > Company URLs**, account-specific URL behavior, and sandbox/Release Preview hostname normalization.
- https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_158081944642.html — observed 2026-09-30; official authorization-endpoint step. Backs the authorization endpoint, the `mcp` scope value and its must-be-alone rule, space-separated scopes, and required S256 PKCE.
- https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_158081952044.html — observed 2026-09-30; official token-endpoint step. Backs the token endpoint and public-client authentication without a secret.
- https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_160855299656.html — observed 2026-09-30; official NetSuite as OIDC Provider page. Backs the account-specific metadata URL host used for **Issuer URL**, and that the metadata requires that feature.
- `doctrine/speakeasy-setup.md` — observed 2026-09-30; canonical Speakeasy AI Control Plane add-server, Identity section, custom identity provider labels, transitions, fixed anchors, and closing pointer.
- Draft-guide operator notes for `netsuite` — observed 2026-08-07T22:23:30Z; backs Bundle ID 522506, public-client PKCE path, scoped non-admin role decision, the then-verified **Attach Remote Identity Provider** layout (a retired surface; no longer rendered), matching Speakeasy callback requirement, and Speakeasy MCP Catalog result `overridden-tenanted` for query `netsuite`.
