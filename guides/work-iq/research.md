---
research_version: 1
slug: work-iq
---

# WorkIQ — Research Dossier

## Evidence boundary and provenance

The original evidence below transfers the complete supplied MDX for [marketing-site PR #2620](https://github.com/speakeasy-api/marketing-site/pull/2620), not a new tenant validation. Original research and pilot dates were not supplied. The original transfer did not recheck provider URLs, tenant consoles, billing settings, OAuth flows, or MCP operations. The employee-rollout supplement below adds live public-document research, not tenant tests.

Metadata `observed_at: 2026-10-28T19:19:08Z` records this transfer's local reading of the supplied source artifact, with a UTC clock reading captured during the task. It is **not** the pilot date or an observation of the linked PR, Microsoft documentation, or live endpoints. No `researched_at` is asserted because no original research timestamp was provided. Inherited source URLs in the historical appendix are original evidence; the supplement identifies the public sources fetched for the employee-rollout revision.

Native UI facts come from `doctrine/speakeasy-setup.md` (existing source inspection dated 2026-09-30, revision `68b3f78ffec0ab6072ece4b7cc2ee3868c6a7c06`). Client capabilities come from `doctrine/ai-control-plane-oauth.md` (existing inspection dated 2026-09-15, revision `4e1fef388aa0f5b498f5d35400780ff2b99815e4`). These are inherited evidence dates, not new validation dates. The full source evidence below retains billing, access, and test limitations.

## Employee-rollout supplement (2026-10-29)

This supplement is the current basis for the employee-rollout guide and supersedes pilot-only instructions in the historical walkthrough and appendices below. The complete source register and section-by-section recommendations are in [employee-rollout research](../../docs/work-iq-employee-rollout-research.md). Public Microsoft documentation was fetched and inspected; no tenant changes, OAuth sessions, paid calls, or cross-user tests were performed.

The external guide displays the owner-requested [Microsoft 365 (2022) logo](https://commons.wikimedia.org/wiki/File:Microsoft_365_(2022).svg) using the Wikimedia-hosted SVG; this is Microsoft 365 branding, not a verified standalone Work IQ logo. See the research note for the source and trademark caveat.

### Organization setup and access model

- Keep one customer-owned **single-tenant** confidential client and tenant-specific OAuth endpoints. Single-tenant describes the organizational audience, not one employee. Home-tenant guests are not automatically excluded; use approved employee assignments. [Entra audiences](https://learn.microsoft.com/en-us/entra/identity-platform/single-and-multi-tenant-apps).
- Keep **User Identity** and separate delegated employee sessions. Shared client configuration is not a shared employee token. Work IQ's delegated permission operates as the signed-in user and includes read/write capabilities; the documented Foundry integration does not support application-only access. [Permission reference](https://learn.microsoft.com/en-us/microsoft-365/copilot/extensibility/work-iq/permissions), [Foundry quickstart](https://learn.microsoft.com/en-us/microsoft-365/copilot/extensibility/work-iq/mcp/quickstart/foundry).
- The default consent path is administrator-reviewed tenant-wide **delegated** consent through Entra, not one `Principal` Graph grant per employee. Consent does not replace assignment, sign-in, billing, or Speakeasy access. Graph's equivalent is `AllPrincipals`, with no user-specific `principalId`; service-principal object IDs remain distinct from app IDs. The historical Principal example is pilot-only. [Admin consent](https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/grant-admin-consent).
- Require assignment on the client enterprise application and assign approved employees/groups. Group assignment requires Entra ID P1/P2 and does not cascade into nested groups. The Global Administrator exception means negative tests must use ordinary nonadministrator accounts. [Assignment](https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/assign-user-or-group-access-portal), [Application properties](https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/application-properties).
- Billing policies support **All users** or selected groups independently of app assignment. Retain service-specific scope, Auto-apply new services off, policy/per-user budgets, and alerts; do not accidentally activate the organization-wide default. [Billing setup](https://learn.microsoft.com/en-us/microsoft-365/copilot/usage-based-billing-copilot-credits-setup), [Spending policies](https://learn.microsoft.com/en-us/microsoft-365/copilot/usage-based-billing-manage-copilot-credits).

### Availability and licensing evidence boundaries

- Use the unified Work IQ remote, not legacy workload-specific servers. Follow tenant enablement and reuse the existing resource service principal when present. [MCP overview](https://learn.microsoft.com/en-us/microsoft-365/copilot/extensibility/work-iq/mcp/overview), [Tenant enablement](https://learn.microsoft.com/en-us/microsoft-365/copilot/extensibility/work-iq/enable-work-iq), [Server comparison](https://learn.microsoft.com/en-us/microsoft-agent-365/tooling-servers-overview).
- Microsoft documents administrator installation for plugins/skills and separately describes MCP governance. This does not establish universal self-install requirements or a centralized installation replacement for this unified MCP connection. Confirm the exact tenant item and route, then test a newly onboarded employee. The source pilot's successful read after installation does not establish causality. [Admin deployment and governance](https://learn.microsoft.com/en-us/microsoft-agent-365/admin/manage-plugins-skills-mcp-servers).
- The October 2026 [Credits Guide](https://aka.ms/CopilotCredits/LicensingGuide), pages 13–14, permits API use on behalf of any Microsoft 365 user, subject to tenant enablement/billing and workload licenses, and says the APIs are not Copilot-license entitlements. The live [Foundry quickstart](https://learn.microsoft.com/en-us/microsoft-365/copilot/extensibility/work-iq/mcp/quickstart/foundry) still requires per-user Copilot licenses. Confirm applicability with Microsoft before broad rollout or purchasing; `notEntitled` alone proves neither a missing license nor an exhausted budget.

### Current rendering and rollout gates {#optional-pilot}

- Retain existing anchors `configure-usage-based-billing`, `install-unified-work-iq`, `register-entra-application`, and `grant-work-iq-permission`. Current screenshot notes cover approved employee billing audiences, verified tenant availability, employee assignments, and approved tenant-wide delegated consent, not proof of tenant validation.
- `optional-pilot`: optional acceptance-check section; screenshot exception because no single console view proves employee isolation or eligibility. Keep an optional pilot group as a validation stage, not the final audience. Align billing, enterprise-app assignments, any catalog controls, and Speakeasy access independently before expansion.
- The Speakeasy admin sets up the server/client once; each employee separately authenticates their downstream MCP client. Exact distribution UI and enforcement remain unvalidated; use administrator-confirmed access controls, not public visibility.
- Before expansion, verify two independent employee sessions, correct `/me` identity, refresh/reauthorization, ordinary unassigned-user denial, and policy/logging behavior with approved test data. Do not use broad write-capable operations as smoke tests. Source pilot reads establish none of these rollout gates.
- Operational recommendations: name a secret owner, track expiry/rotation, verify authorization after rotation, and remove employee access/revoke relevant sessions on offboarding. Do not assume assignment removal immediately invalidates issued tokens. Review billing/catalog audiences separately; preserve shared Microsoft resources on retirement.

## Server facts

- Provider: Microsoft. Display title: WorkIQ. Product: unified Work IQ MCP, distinct from legacy workload-specific servers and a local CLI/self-hosted server.
- Public remote: `https://workiq.svc.cloud.microsoft/mcp`. One shared endpoint; `tenanted: false`. Native transport is `streamable-http`, as supported by the canonical remote-server flow; no fresh transport probe was run.
- Authentication Option `delegated-oauth`: OAuth, manually registered customer-owned single-tenant Entra application, delegated signed-in-user access. No application-only substitute is established.
- Remote ID `unified` is new for this transferred guide; there was no prior native bundle or published remote ID to preserve.
- `speakeasy_add_server: custom-remote` preserves the source's explicit public-URL/custom-authorization-server route. This is not a claim of catalog absence or a Pulse lookup. The OAuth issuer is tenant-specific, but the MCP endpoint is not.
- Requirements: Microsoft 365 employees with underlying workload access; administrators authorized to register apps, approve delegated permissions, and configure usage-based billing; approved billing method, Azure subscription, approved employee audience, budgets, and alerts; Speakeasy project permission to add the remote and configure identity.
- The source cites the October 2026 Copilot Credits Guide, page 14, for usage-based Work IQ API access on behalf of Microsoft 365 users subject to workload licenses, versus the older June Foundry quickstart requiring a Microsoft 365 Copilot license per user. Do not establish a universal license requirement or exemption from these conflicting sources. Work IQ APIs are not included as Copilot license entitlements according to the source. Check rates/minimums rather than equating a call with a credit.

## Credential flow

`register-entra-application` produces **Directory (tenant) ID**, **Application (client) ID**, and client secret **Value**, not **Secret ID**. Substitute tenant ID into the three source OAuth URLs. Enter the native callback template in the Entra **Web** redirect URI field:

```text
{{ gram.oauth.callback_url }}
```

The original pilot used `https://ai.speakeasy.com/mcp/remote_login_callback`. The native custom-provider **Add Client** flow confirms its displayed **Redirect URI** matches. Do not use the downstream MCP client's localhost callback. The template is a native rendering adaptation, not a new provider requirement.

The source gives delegated permission `WorkIQAgent.Ask`, resource application ID `fdcc1f02-fc51-4226-8753-f668596af7f7`, and permission ID `0b1715fd-f4bf-4c63-b16d-5be31f9847c2`. The grant includes read **and** write capabilities despite read-only connectivity checks. Requested permissions, consent, user assignment, billing scope, and user installation are separate gates. Principal-specific Graph consent uses service-principal **object IDs**, not application IDs. Provision the shared Work IQ resource service principal only after a successful query finds no existing match; never delete it to resolve a conflict.

Manual client scope set, preserved from the source:

```text
openid profile offline_access fdcc1f02-fc51-4226-8753-f668596af7f7/WorkIQAgent.Ask
```

The canonical custom-provider **Scope (override)** takes comma-separated entries. The guide renders these same four scopes in that input format. Do not substitute Graph scopes, broaden the grant for troubleshooting, or treat blank scope as safe.

The source reports that **selected** `client_secret_post` (`tokenEndpointAuthMethod`) resolved `invalid_client` in the pilot. **Token endpoint authentication methods** lists supported methods, not the selected client method. Existing client doctrine supports Basic/Post, requires a nonempty secret for explicit Basic/Post, and defaults to Basic when no recognized method is stored and a secret is present. Thus discovery alone does not satisfy the selection check. Refresh-token implementation support does not establish Work IQ token issuance or successful refresh.

## Historical console walkthrough (pilot transfer)

Provider anchors are minted here and reused in `external.md` and `meta.yaml`. The source appendix below supplies the exact steps, commands, Graph request, and documentation URLs.

- `configure-usage-based-billing`: screenshot note — Copilot Cost management policy, pilot audience, Work IQ API service, Auto-apply new services off, budgets/alerts; redact billing details.
- `install-unified-work-iq`: screenshot note — approved unified Work IQ entry installed for the pilot user; redact user details. Tenant administrator supplies the approved entry/instructions because the original click path was not captured.
- `register-entra-application`: screenshot note — single-tenant Entra app Web callback and Enterprise application user assignment; redact identifiers/secrets. Source starts at Entra app registrations, not a universal Entra landing URL. Ask the tenant administrator to open that area instead of inventing a portal path. Warn that secret Value is shown once before creation.
- `grant-work-iq-permission`: screenshot note — delegated permission and approved principal-specific consent; redact identifiers. Warn about broad read/write capabilities before adding/consenting.

CLI lookup, conditional service-principal creation, and Graph consent in the source are instructions for an authorized administrator, not operations performed during this transfer.

## Historical Speakeasy rendering (pilot transfer)

The selected rendering below carries the canonical skeleton's two fixed anchors and source-specific values. Use custom remote only. Create a dedicated custom provider/manual client, then select **Existing client** for that newly created client. No discovery default, automatic registration outcome, or catalog status is assumed.

Source **Settings → Authentication** becomes native **Settings > Identity**. The current inline Manual surface chooses a token method from issuer metadata and has no method control; it must not silently replace the source's explicit selection. The separate custom-provider/client route comes from the canonical skeleton; the token-method control/value comes from the pilot and existing client reference. Precise control location in deployed UI is unverified. If absent, stop for an administrator to verify the selected method instead of silently accepting a default.

The source's space-separated scopes become comma-separated entries only for **Scope (override)**, as the native UI requires. Source-only labels **Connect/Authorize** and the client-method control receive deployment-equivalent wording, not a new UI-validation claim. Further reading is the inherited Microsoft Foundry MCP quickstart, with its licensing conflict retained.

### Add the server in Speakeasy {#add-server-in-speakeasy}

Keep this pilot private and undistributed. Private visibility does not replace explicit access controls.

1. Select the intended project in the Speakeasy AI Control Plane.
2. In the sidebar, under **MCP Gateway**, select **MCP**.
3. Click **Add new** to open **Add MCP server**.
4. Choose **Hosted remotely**.
5. On **New remote MCP server**, enter this **MCP server URL**:

   ```text
   https://workiq.svc.cloud.microsoft/mcp
   ```

6. Leave **User session issuer** at its default.
7. Click **Verify connectivity**.
8. Under **Identity**, select **User Identity**.
9. Leave **Guardrails** off unless your organization requires one.
10. Click **Save** to open the server's **Overview**.

If the server stays **Disabled** and asks you to finish setup in **Settings > Identity**, continue below. Connectivity verification does not prove access to Microsoft 365 data.

<!-- screenshot: New remote MCP server with the unified Work IQ URL and User Identity selected; tenant and user details redacted -->

### Connect your credentials {#connect-speakeasy-credentials}

Use the dedicated, single-tenant application from [Register and restrict the Entra application](external.md#register-entra-application). Do not modify an identity provider shared by unrelated servers. Use a custom provider with a manually registered client, not automatic client registration.

The source pilot used **Settings → Authentication**. The native flow below uses **Settings > Identity**. The source pilot required the selected client method `client_secret_post`; do not treat an issuer's list of supported methods as proof that this method is selected. If your deployment does not expose the client-method control, ask your Speakeasy administrator to verify the selected method before continuing.

1. Open the server's **Settings > Identity**.
2. Select **User Identity**.
3. Open **Choose an identity provider** and click **Create a custom identity provider**. This opens **Remote Identity Providers**.
4. Click **New Remote Identity Provider**.
5. In **Issuer URL**, enter the following, replacing `<TENANT_ID>` with the **Directory (tenant) ID** from [Register and restrict the Entra application](external.md#register-entra-application):

   ```text
   https://login.microsoftonline.com/<TENANT_ID>/v2.0
   ```

6. Click **Discover** to populate the endpoints.
7. Under **Endpoints**, verify **Authorization Endpoint**:

   ```text
   https://login.microsoftonline.com/<TENANT_ID>/oauth2/v2.0/authorize
   ```

8. Verify **Token Endpoint**:

   ```text
   https://login.microsoftonline.com/<TENANT_ID>/oauth2/v2.0/token
   ```

9. Keep the derived **Slug** and click **Create**.
10. On the dedicated provider, click **Add Client**.
11. Set **Client Type** to **Manual**.
12. Paste the application's **Application (client) ID** into **Client ID**.
13. Paste the secret **Value** from [Register and restrict the Entra application](external.md#register-entra-application) into **Client Secret (optional)**. A secret is required for this flow despite the field's optional label.
14. In **Scope (override)**, enter the following comma-separated scopes:

    ```text
    openid,profile,offline_access,fdcc1f02-fc51-4226-8753-f668596af7f7/WorkIQAgent.Ask
    ```

15. In the client credentials/session client section, select **Token endpoint authentication** as `client_secret_post` (`tokenEndpointAuthMethod`), using the equivalent client-method control on your deployment.
16. Confirm that the displayed **Redirect URI** matches the **Web** callback registered in [Register and restrict the Entra application](external.md#register-entra-application).
17. Save the client with **Create**, or the equivalent save control on your deployment.
18. Reopen the provider and confirm that `client_secret_post` persisted as the selected client method.
19. Return to the server's **Settings > Identity** and select **User Identity**.
20. In **Choose an identity provider**, select the dedicated provider you created.
21. Choose **Existing client** and pick the new client under **Client**.
22. Click **Save**. If prompted, confirm with **Save changes**.
23. If the server is **Disabled**, open **Settings > Danger Zone > Server Availability** and turn on **Enable MCP server** so it shows **Enabled**.

The discovery field **Token endpoint authentication methods** lists supported methods, not the selected client method. The source pilot reports that selecting `client_secret_post` resolved `invalid_client`; other advertised methods may need different credentials or key configuration. That result was not retested for this migration.

The requested scope set is the following space-separated OAuth value; the custom-provider **Scope (override)** input above uses commas between entries:

```text
openid profile offline_access fdcc1f02-fc51-4226-8753-f668596af7f7/WorkIQAgent.Ask
```

The source reports that Work IQ advertised the GUID-prefixed scope through this protected-resource metadata URL:

```text
https://workiq.svc.cloud.microsoft/.well-known/oauth-protected-resource/mcp
```

Microsoft examples also use `api://workiq.svc.cloud.microsoft/WorkIQAgent.Ask`. Preserve the pilot's working advertised scope; do not substitute a Microsoft Graph scope or leave the configured scope blank.

<!-- screenshot: Dedicated tenant-scoped Remote Identity Provider and manual client with selected client_secret_post; credentials and tenant identifiers redacted -->


## Original source evidence

The following text is inherited source evidence. Statements about testing, validation, and source publication dates are attributed to that source only. Its original Speakeasy UI and callback are intentionally retained here; the native rendering above explains adaptations.

Connect Microsoft's unified Work IQ MCP to Speakeasy with a customer-owned Microsoft Entra application. Each user signs in with their Microsoft account. Start with one pilot user and a private server before distributing access.

You need a Microsoft 365 user with access to the workloads you will test, permission to add a remote MCP in Speakeasy, and administrators authorized to register Entra apps, approve delegated permissions, and configure Microsoft usage-based billing. Agree on the Azure subscription, service scope, limits, and alerts before activating paid usage. Keep credentials and returned business data out of source control, screenshots, and support transcripts.

## Source appendix: Microsoft setup

### 1. Configure usage-based billing {#configure-usage-based-billing}

In the [Microsoft 365 admin center][admin], open **Copilot → Cost management**. Follow Microsoft's [billing setup][billing-setup] and [spending-policy][spending-policies] instructions.

1. From **Get Started**, select **Customize setup configuration** before activation. The default setup can cover the entire organization. Alternatively, create a separate spending policy under **Configuration**.
2. Scope the policy to the pilot user, or a security group containing only that user if group selection is required. Prefer direct membership for the pilot.
3. Select **Work IQ API for custom apps and agents** as the covered service.
4. Turn **Auto-apply new services** off.
5. Select the approved billing method and Azure subscription. Review resource group and region under advanced settings where available.
6. Set limited policy and per-user budgets, and enable administrator alerts. Limits use credits, not necessarily currency; the portal can impose minimums.
7. Review the service, audience, and billing method, activate the policy, and confirm it shows **Enabled**.

The October 2026 [Copilot Credits Guide][credits-guide], page 14, permits Work IQ API usage on behalf of any Microsoft 365 user with tenant enablement and usage-based billing, subject to underlying workload licenses. Work IQ APIs are not included as Copilot license entitlements. The older June [Foundry quickstart][foundry] instead requires a Microsoft 365 Copilot license per user. Confirm current requirements with Microsoft if needed. Use the current guide's rate card; do not assume one MCP call equals one credit.

### 2. Install the unified Work IQ MCP for the user {#install-unified-work-iq}

Use the unified **Work IQ MCP**, not the separate workload-specific servers. Microsoft describes those as a legacy experience for testing and backward compatibility; see the [server comparison][server-options]. No local CLI or self-hosted MCP is needed.

1. Ask your Microsoft administrator for the tenant-approved unified Work IQ MCP catalog entry and user installation instructions. The exact self-install URL and click path were not captured during validation; confirm them for your tenant.
2. Have the pilot user open that entry and complete installation for their own account, with any required administrator approval.
3. Verify that the unified item is installed for that user.

Administrators can inspect **Agents → Tools** in the Microsoft 365 admin center. That admin registry view is distinct from user installation; administrator assignment as a substitute for self-installation was not independently validated.

In testing, reads first succeeded after user installation despite an already enabled spending policy. Treat installation as a setup check, not a proven universal cause of entitlement failures; concurrent Microsoft backend changes were not ruled out.

### 3. Register and restrict the Entra application {#register-entra-application}

In **Entra → App registrations**, create a dedicated pilot application.

1. Select **Accounts in this organizational directory only** for a single-tenant app.
2. Record its **Application (client) ID** and **Directory (tenant) ID**. The application's object ID is not its client ID.
3. Add a **Web** platform redirect URI. For hosted Speakeasy, the validated callback is:

   ```text
   https://ai.speakeasy.com/mcp/remote_login_callback
   ```

   When configuring Speakeasy below, verify that this exactly matches the callback displayed in **Settings → Authentication** for your deployment. Do not use an MCP client's localhost callback.

4. Under **Certificates & secrets**, create a short-lived pilot client secret. Store its **Value**, not its **Secret ID**, in your approved password manager for Speakeasy setup. Entra displays the value only once.
5. In the corresponding **Enterprise application → Properties**, require user assignment. Under **Users and groups**, assign only the pilot user.

This connection uses delegated access as the signed-in user. Do not enable application-only access as a substitute.

### 4. Add the Work IQ permission and consent {#grant-work-iq-permission}

Microsoft's public Work IQ identifiers are:

| Item                    | Value                                  |
| ----------------------- | -------------------------------------- |
| Resource application ID | `fdcc1f02-fc51-4226-8753-f668596af7f7` |
| Delegated permission    | `WorkIQAgent.Ask`                      |
| Delegated permission ID | `0b1715fd-f4bf-4c63-b16d-5be31f9847c2` |

Check the active tenant and whether the resource service principal already exists:

```bash
az account show --query tenantId -o tsv
az ad sp list \
  --filter "appId eq 'fdcc1f02-fc51-4226-8753-f668596af7f7'" \
  --query '[].{id:id,appId:appId}' -o json
```

Only if the query succeeds with no match, provision the resource service principal:

```bash
az ad sp create --id fdcc1f02-fc51-4226-8753-f668596af7f7
```

Reuse an existing resource. A conflict is not an instruction to delete it. Creating the resource does not configure billing or grant your client access.

In the pilot app, add the Work IQ **delegated** permission **WorkIQAgent.Ask**. Review Microsoft's [permission description][permissions] first.

**Warning: This is a broad read/write permission.**
  `WorkIQAgent.Ask` includes read and write capabilities. Running read-only
  tests does not make the grant read-only. Obtain explicit administrator
  approval for its breadth and keep the pilot user restriction in place.


Adding a requested permission is separate from granting consent. Use the minimum approved consent scope. For a one-user pilot, an authorized administrator can grant principal-specific consent with Microsoft Graph, after inspecting existing grants:

```http
POST https://graph.microsoft.com/v1.0/oauth2PermissionGrants
Content-Type: application/json

{
  "clientId": "<CLIENT_SERVICE_PRINCIPAL_OBJECT_ID>",
  "consentType": "Principal",
  "principalId": "<PILOT_USER_OBJECT_ID>",
  "resourceId": "<WORK_IQ_SERVICE_PRINCIPAL_OBJECT_ID>",
  "scope": "WorkIQAgent.Ask"
}
```

Here, `clientId` and `resourceId` are service-principal **object IDs**, not application/client IDs. The `principalId` is the pilot user's object ID. Tenant-wide admin consent is broader and requires a separate decision. Do not add unrelated Graph permissions as a speculative fix.

## Source appendix: original Speakeasy pilot

#### Add the server in Speakeasy

1. Select the intended Speakeasy project.
2. Add a [remote MCP server](/docs/ai-control-plane/mcp-gateway/remote-servers) using Microsoft's public upstream URL:

   ```text
   https://workiq.svc.cloud.microsoft/mcp
   ```

3. Keep the server private and undistributed during setup. Private visibility does not replace explicit access controls.
4. Open **Settings → Authentication** and verify that the displayed callback exactly matches the Entra **Web** redirect URI registered above.

#### Connect credentials

In the server’s **Settings → Authentication**, add a new custom authorization server. Use manual, pre-registered client setup rather than automatic client registration. Do not modify a provider shared by unrelated servers.

| Field                                  | Value                                                                                |
| -------------------------------------- | ------------------------------------------------------------------------------------ |
| Issuer URL                             | `https://login.microsoftonline.com/<TENANT_ID>/v2.0`                                 |
| Authorization endpoint                 | `https://login.microsoftonline.com/<TENANT_ID>/oauth2/v2.0/authorize`                |
| Token endpoint                         | `https://login.microsoftonline.com/<TENANT_ID>/oauth2/v2.0/token`                    |
| Client ID                              | `<CLIENT_ID>` from your Entra application                                            |
| Client secret                          | The secret **Value**, entered only in the secure field                               |
| Selected token endpoint authentication | `client_secret_post`                                                                 |
| Scopes                                 | `openid profile offline_access fdcc1f02-fc51-4226-8753-f668596af7f7/WorkIQAgent.Ask` |

Use discovery to populate endpoints, then verify the tenant and values. In the client credentials/session client section, select **Token endpoint authentication** as `client_secret_post` (`tokenEndpointAuthMethod`). Save and reopen the provider to confirm that selection persisted, and attach this provider to the remote MCP.

The discovery field **Token endpoint authentication methods** lists supported methods; it does not show the selected client method. Selecting `client_secret_post` resolved `invalid_client` in the pilot. Other advertised methods may require different credentials or key configuration.

Work IQ advertised the GUID-prefixed scope above through its protected-resource metadata:

```text
https://workiq.svc.cloud.microsoft/.well-known/oauth-protected-resource/mcp
```

Microsoft examples also use `api://workiq.svc.cloud.microsoft/WorkIQAgent.Ask`. Preserve the working advertised scope; do not substitute a Microsoft Graph scope.

#### Connect and test

1. Use **Connect/Authorize** in Speakeasy and sign in as the assigned pilot user.
2. Copy the **Speakeasy MCP endpoint** from the connection settings into your MCP client, rather than connecting directly to Microsoft for this test.
3. Complete that client's authorization separately. A successful dashboard connection does not authenticate every separate client.
4. Initialize MCP and list tools.

Use `search_paths` and `get_schema` to discover operations, then run small, explicitly read-only `fetch` requests one at a time. Discovery alone does not prove data access.

| Workload | `entityUrls` entry               | Expected result                        |
| -------- | -------------------------------- | -------------------------------------- |
| Mail     | `/me/messages?$select=id&$top=1` | HTTP 200 and a collection              |
| Calendar | `/me/events?$select=id&$top=1`   | HTTP 200; an empty collection is valid |
| Teams    | `/me/chats?$select=id&$top=1`    | HTTP 200 and a collection              |
| OneDrive | `/me/drive?$select=id,driveType` | HTTP 200 and drive metadata            |

Example arguments for the discovered `fetch` tool:

```json
{ "entityUrls": ["/me/messages?$select=id&$top=1"] }
```

Do not use `create_entity`, `update_entity`, `delete_entity`, or `do_action` as connectivity checks. A broad `ask` prompt is not a guaranteed read-only smoke test. Record success/failure and error codes, not returned record IDs or business content.

An empty calendar confirms an authorized read, not useful calendar coverage. Drive metadata does not prove file-content retrieval. These smoke tests do not validate token refresh, writes, file content, Copilot reasoning, or cross-user isolation. Test those separately, with actual workflows and Speakeasy policy/logging behavior, before rollout.

If OAuth fails with `invalid_client`, check the attached provider's application/client ID, tenant-specific endpoints, Web callback, unexpired secret **Value**, and **selected** `client_secret_post` method. Save, reopen, and reauthorize the client.

If reads report a missing WorkIQ billing policy or `notEntitled`, check the enabled policy's service and user/group scope, unified Work IQ MCP installation, and billing activation. An enabled policy alone does not prove eligibility. Microsoft's [read-only cost-management diagnostics][cost-api] can help an authorized administrator: a selected policy with remaining credits and `isConsumptionAllowed: false` indicates an entitlement denial, not an exhausted budget or a specific missing license. Do not broaden the Work IQ app's grants, raise budgets, or buy licenses solely from this error. Escalate unresolved failures to Microsoft with sanitized request IDs and timestamps.

When retiring the pilot, revoke only dedicated credentials, grants, assignments, and resources after checking dependencies. Do not delete the shared Microsoft Work IQ resource service principal or a Dataverse environment.

[admin]: https://admin.microsoft.com
[billing-setup]: https://learn.microsoft.com/en-us/microsoft-365/copilot/usage-based-billing-copilot-credits-setup
[spending-policies]: https://learn.microsoft.com/en-us/microsoft-365/copilot/usage-based-billing-manage-copilot-credits
[credits-guide]: https://aka.ms/CopilotCredits/LicensingGuide
[foundry]: https://learn.microsoft.com/en-us/microsoft-365/copilot/extensibility/work-iq/mcp/quickstart/foundry
[permissions]: https://learn.microsoft.com/en-us/microsoft-365/copilot/extensibility/work-iq/permissions
[server-options]: https://learn.microsoft.com/en-us/microsoft-agent-365/tooling-servers-overview
[cost-api]: https://learn.microsoft.com/en-us/microsoft-365/copilot/extensibility/api/admin-settings/cost-management/overview

## Research limitations

- No new tenant/API tests were performed. Public-source fetches for the employee-rollout supplement do not validate tenant behavior. The appendix's “In testing” and “validated” language describes the original source pilot only, not this transfer.
- Original observation dates are unknown. Metadata dates record the local source-artifact reading, not a live provider observation.
- No fresh 401/PRM challenge, issuer metadata, CIMD advertisement, DCR endpoint, or anonymous registration outcome was captured. The source provides the PRM URL and a working advertised scope, not those other discovery details or a complete scope inventory. Manual tenant-scoped issuer/endpoints come from the source, not an inference that the MCP URL is an issuer.
- Exact user self-install URL/click path and whether administrator assignment can replace self-installation were not independently validated. Enabled billing alone did not prove eligibility. Reads succeeded after installation, but concurrent backend changes were not ruled out; causality and universality remain unproven.
- Current licensing, billing minimums, tenant rollout status, and deployed client-method control location need confirmation. Conflicting Microsoft licensing sources remain unresolved. Do not buy licenses or raise budgets solely because of `notEntitled`.
- The bounded smoke tests establish only the stated reads. Empty calendar data is not calendar coverage; drive metadata is not file-content access. Token refresh, writes, file content, Copilot reasoning, cross-user isolation, actual workflows, and Speakeasy policy/logging remain rollout checks, not validated capabilities.
- No screenshots were captured; screenshot notes are placeholders. No live provider writes or model-paid factory run was performed.

## Operator decisions

Before employee rollout, the tenant owner must approve billing subscription/method, employee audience/service scope, budgets/alerts, broad delegated read/write grant, tenant-wide consent, employee assignments, tenant-approved availability/installation route, and selected client-secret authentication method. These are per-deployment approvals, not invented requirements. Escalate unresolved entitlement/licensing questions to Microsoft with sanitized evidence.

## Publication and generation

This revision updates the four guide artifacts and includes the supporting employee-rollout research note. `GO-MODULE.md` says guide-only PR validation runs generation/size checks without requiring a committed `go/` sync. After merge to main, the regen workflow opens the generated embed/index update. No shared index, generated bundle, published-server registry, or other guide is edited here. `research.md` is authoring-only and is not embedded.
