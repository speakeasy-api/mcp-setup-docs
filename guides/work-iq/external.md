---
setup_version: 1
---

# WorkIQ

Connect Microsoft's unified Work IQ MCP to Speakeasy for employees within **one Entra tenant**, using one customer-owned single-tenant application. Administrators configure billing, application access, and consent once; each employee signs in with their own Microsoft account and authorizes a separate delegated session. Expand access in approved employee groups after validation.

Each employee needs Microsoft 365 and access to the relevant workloads. Identify the Entra, billing, security-approval, and Speakeasy owners. Administrators need authority to register apps, approve delegated permissions, and configure Microsoft usage-based billing; the Speakeasy owner needs permission to add and distribute a remote MCP. Start in the [Microsoft 365 admin center][admin]; ask your Microsoft administrator to open the Entra application-registration area for your tenant when needed. Agree on the Azure subscription, service scope, limits, and alerts before activating paid usage. Keep credentials and returned business data out of source control, screenshots, and support transcripts.

### Configure usage-based billing {#configure-usage-based-billing}

<!-- screenshot: Microsoft 365 Copilot Cost management policy with employee rollout audience, Work IQ API service, Auto-apply new services off, budgets and alerts; billing details redacted -->

In the [Microsoft 365 admin center][admin], open **Copilot → Cost management**. Follow Microsoft's [billing setup][billing-setup] and [spending-policy][spending-policies] instructions.

1. From **Get Started**, select **Customize setup configuration** before activation. The default setup can cover the entire organization. Alternatively, create a separate spending policy under **Configuration**.
2. Choose **Specific groups** and select directly populated employee rollout security groups. Include individual users through security groups. Expand by approved wave; use **All users** only after explicitly approving the broader tenant audience.
3. Select **Work IQ API for custom apps and agents** as the covered service.
4. Turn **Auto-apply new services** off.
5. Select the approved billing method and Azure subscription. Review resource group and region under advanced settings where available.
6. Set policy and per-user budgets, and enable alerts. Limits use credits, not necessarily currency; the portal can impose minimums.
7. Review the service, audience, and billing method, activate the policy, and confirm it shows **Enabled**.

Reconcile existing and overlapping policies before expanding: additional policies have independent limits, not a shared cap inherited from the default policy. Billing audiences, enterprise-app assignments, catalog availability, and Speakeasy access are separate controls; align their intended employee populations.

The October 2026 [Copilot Credits Guide][credits-guide], page 14, permits Work IQ API usage on behalf of any Microsoft 365 user with tenant enablement and usage-based billing, subject to underlying workload licenses. Work IQ APIs are not included as Copilot license entitlements. The older June [Foundry quickstart][foundry] instead requires a Microsoft 365 Copilot license per user. **This licensing conflict is unresolved:** confirm requirements with Microsoft for direct MCP access before committing employee eligibility or buying licenses; do not infer a license requirement from an entitlement error. Recheck the mutable Credits Guide before purchase or publication. Use the current guide's rate card; do not assume one MCP call equals one credit.

### Verify unified Work IQ availability for employees {#install-unified-work-iq}

<!-- screenshot: Tenant-approved unified Work IQ item and verified availability for a new employee; user details redacted -->

Use the unified **Work IQ MCP**, not the legacy workload-specific servers; see the [server comparison][server-options]. No local CLI or self-hosted MCP is needed.

1. Ask the Microsoft administrator to identify the exact tenant-approved unified item, its type, and the supported employee onboarding route. **Agents → Tools** is an admin registry/governance view, not proof of employee installation.
2. If the item is an installable **plugin or skill**, follow the documented [admin deployment][tool-governance] path: **Agents → Tools → select plugin/skill → Install → Specific users or groups → review → Install**. Verify availability for the rollout groups. This plugin/skill procedure does not establish deployment requirements for a standalone MCP server.
3. If it is an **MCP registry item**, follow the tenant's MCP approval, consent, and tool-governance workflow instead. Do not assume plugin installation or admin assignment replaces employee installation, or invent a universal self-install route.
4. Validate the approved route with a newly onboarded ordinary employee and record the exact item and steps before expanding. Catalog availability does not replace billing, OAuth consent, application assignment, or each employee's sign-in.

The source pilot reports reads succeeding after user installation, but captured no exact self-install link and did not exclude concurrent backend changes. Microsoft's [overview][work-iq-overview], [tenant enablement][tenant-enablement], and [Foundry quickstart][foundry] do not establish a universal additional employee catalog-install prerequisite. Confirm with Microsoft or compare fresh employee accounts before removing this check.

### Register and restrict the Entra application {#register-entra-application}

<!-- screenshot: Single-tenant Entra app Web redirect URI and Enterprise application user-assignment restriction; credentials and identifiers redacted -->

In **Entra → App registrations**, create one dedicated, production-managed application for this organization. Single-tenant means one home tenant, not one user; it can also include guests ([audience guidance][app-audience]).

**Before creating a client secret:** Entra displays its **Value** only once. Be ready to store it in your approved password manager; never put it in screenshots or support transcripts.

1. Select **Accounts in this organizational directory only** for a single-tenant app.
2. Record its **Application (client) ID** and **Directory (tenant) ID**. The application's object ID is not its client ID.
3. Add a **Web** platform redirect URI. Enter the callback for your Speakeasy deployment:

   ```text
   {{ gram.oauth.callback_url }}
   ```

   During [Speakeasy credential setup](speakeasy.md#connect-speakeasy-credentials), verify that the displayed **Redirect URI** exactly matches this **Web** callback. Do not use an MCP client's localhost callback.

4. Under **Certificates & secrets**, create a client secret with an approved lifetime. Store its **Value**, not its **Secret ID**, in your approved password manager for Speakeasy setup. Entra displays the value only once.
5. In the corresponding **Enterprise application → Properties**, set **Assignment required? → Yes**. Under **Users and groups**, assign approved employee rollout groups. [Group assignment][app-assignment] requires Entra ID P1/P2 and does **not** expand nested groups; use direct membership or direct user assignment if group assignment is not licensed.

Keep an owner and expiry/rotation procedure for the secret; employees must not receive it or another employee's access/refresh tokens. Single-tenant alone is not employee-only: exclude guests from assignments. Global Administrators can bypass the assignment restriction, so validate allowed and denied access with ordinary accounts ([application properties][app-properties]).

This connection uses delegated access as the signed-in user. Do not enable application-only access as a substitute.

### Add the Work IQ permission and consent {#grant-work-iq-permission}

<!-- screenshot: Work IQ delegated permission in the dedicated app and approved tenant-wide delegated consent; identifiers redacted -->

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

**Warning:** `WorkIQAgent.Ask` includes read and write capabilities. Running read-only tests does not make the grant read-only. Obtain explicit administrator approval for its breadth and keep employee assignment restrictions in place. Access remains bounded by the signed-in user's permissions.

In the dedicated app, add the Work IQ **delegated** permission **WorkIQAgent.Ask**. Review Microsoft's [permission description][permissions] first.

Adding a requested permission is separate from granting consent. Inspect existing grants first. An authorized administrator must approve **tenant-wide delegated consent** for employee rollout using the [Entra portal workflow][admin-consent]:

1. Open **Entra ID → App registrations → select the dedicated app → API permissions**.
2. Verify the requested Work IQ permission is **Delegated: WorkIQAgent.Ask**, then select **Grant admin consent for <tenant>**. Review the permissions and confirm only the approved grant.
3. Verify consent is granted and **Assignment required?** remains **Yes** on the enterprise application.

Tenant-wide delegated consent (`AllPrincipals`) approves the scope; it is not application-only access, employee assignment, billing enrollment, or a shared employee session. Employees still sign in individually. Do not add unrelated Graph permissions as a speculative fix. If administrators separately automate consent through Graph, `clientId` and `resourceId` refer to service-principal **object IDs**, not application/client IDs; review existing grants rather than blindly creating duplicates.

### Optional pilot before expansion {#optional-pilot}

<!-- screenshot-exception: Acceptance checks span employee sessions and access controls; no single console screenshot proves isolation or eligibility. -->

Use a directly populated pilot employee group for billing, application assignment, and any verified catalog deployment. Keep Speakeasy distribution limited until acceptance tests pass. The same single-tenant registration can serve later employee waves; a separate app per employee is unnecessary.

Before expansion, verify two ordinary employees authorize separately and see only their own accessible data; test that an unassigned employee and guest are denied, plus token refresh, offboarding, and actual per-user billing. Validate Speakeasy session isolation in your deployment; Microsoft documentation does not establish Speakeasy's implementation. Start with tiny read-only tests despite the broad read/write grant.

[admin]: https://admin.microsoft.com
[billing-setup]: https://learn.microsoft.com/en-us/microsoft-365/copilot/usage-based-billing-copilot-credits-setup
[spending-policies]: https://learn.microsoft.com/en-us/microsoft-365/copilot/usage-based-billing-manage-copilot-credits
[credits-guide]: https://aka.ms/CopilotCredits/LicensingGuide
[foundry]: https://learn.microsoft.com/en-us/microsoft-365/copilot/extensibility/work-iq/mcp/quickstart/foundry
[permissions]: https://learn.microsoft.com/en-us/microsoft-365/copilot/extensibility/work-iq/permissions
[server-options]: https://learn.microsoft.com/en-us/microsoft-agent-365/tooling-servers-overview
[work-iq-overview]: https://learn.microsoft.com/en-us/microsoft-365/copilot/extensibility/work-iq/mcp/overview
[tenant-enablement]: https://learn.microsoft.com/en-us/microsoft-365/copilot/extensibility/work-iq/enable-work-iq
[tool-governance]: https://learn.microsoft.com/en-us/microsoft-agent-365/admin/manage-plugins-skills-mcp-servers
[app-audience]: https://learn.microsoft.com/en-us/entra/identity-platform/single-and-multi-tenant-apps
[app-assignment]: https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/assign-user-or-group-access-portal
[app-properties]: https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/application-properties
[admin-consent]: https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/grant-admin-consent
