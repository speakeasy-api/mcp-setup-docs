---
setup_version: 1
---

# WorkIQ

Connect Microsoft's unified Work IQ MCP to Speakeasy with a customer-owned Microsoft Entra application. Each user signs in with their Microsoft account. Start with one pilot user and a private server before distributing access.

You need a Microsoft 365 user with access to the workloads you will test, permission to add a remote MCP in Speakeasy, and administrators authorized to register Entra apps, approve delegated permissions, and configure Microsoft usage-based billing. Start in the [Microsoft 365 admin center][admin]; ask your Microsoft administrator to open the Entra application-registration area for your tenant when needed. Agree on the Azure subscription, service scope, limits, and alerts before activating paid usage. Keep credentials and returned business data out of source control, screenshots, and support transcripts.

### Configure usage-based billing {#configure-usage-based-billing}

<!-- screenshot: Microsoft 365 Copilot Cost management policy with pilot audience, Work IQ API service, Auto-apply new services off, budgets and alerts; billing details redacted -->

In the [Microsoft 365 admin center][admin], open **Copilot → Cost management**. Follow Microsoft's [billing setup][billing-setup] and [spending-policy][spending-policies] instructions.

1. From **Get Started**, select **Customize setup configuration** before activation. The default setup can cover the entire organization. Alternatively, create a separate spending policy under **Configuration**.
2. Scope the policy to the pilot user, or a security group containing only that user if group selection is required. Prefer direct membership for the pilot.
3. Select **Work IQ API for custom apps and agents** as the covered service.
4. Turn **Auto-apply new services** off.
5. Select the approved billing method and Azure subscription. Review resource group and region under advanced settings where available.
6. Set limited policy and per-user budgets, and enable administrator alerts. Limits use credits, not necessarily currency; the portal can impose minimums.
7. Review the service, audience, and billing method, activate the policy, and confirm it shows **Enabled**.

The October 2026 [Copilot Credits Guide][credits-guide], page 14, permits Work IQ API usage on behalf of any Microsoft 365 user with tenant enablement and usage-based billing, subject to underlying workload licenses. Work IQ APIs are not included as Copilot license entitlements. The older June [Foundry quickstart][foundry] instead requires a Microsoft 365 Copilot license per user. Confirm current requirements with Microsoft if needed. Use the current guide's rate card; do not assume one MCP call equals one credit.

### Install the unified Work IQ MCP for the user {#install-unified-work-iq}

<!-- screenshot: Tenant-approved unified Work IQ MCP entry installed for the pilot user; user details redacted -->

Use the unified **Work IQ MCP**, not the separate workload-specific servers. Microsoft describes those as a legacy experience for testing and backward compatibility; see the [server comparison][server-options]. No local CLI or self-hosted MCP is needed.

1. Ask your Microsoft administrator for the tenant-approved unified Work IQ MCP catalog entry and user installation instructions. The source pilot did not capture the exact self-install URL and click path; confirm them for your tenant.
2. Have the pilot user open that entry and complete installation for their own account, with any required administrator approval.
3. Verify that the unified item is installed for that user.

Administrators can inspect **Agents → Tools** in the Microsoft 365 admin center. That admin registry view is distinct from user installation; administrator assignment as a substitute for self-installation was not independently validated.

The source pilot reports that reads first succeeded after user installation despite an already enabled spending policy. Treat installation as a setup check, not a proven universal cause of entitlement failures; concurrent Microsoft backend changes were not ruled out.

### Register and restrict the Entra application {#register-entra-application}

<!-- screenshot: Single-tenant Entra app Web redirect URI and Enterprise application user-assignment restriction; credentials and identifiers redacted -->

In **Entra → App registrations**, create a dedicated pilot application.

**Before creating a client secret:** Entra displays its **Value** only once. Be ready to store it in your approved password manager; never put it in screenshots or support transcripts.

1. Select **Accounts in this organizational directory only** for a single-tenant app.
2. Record its **Application (client) ID** and **Directory (tenant) ID**. The application's object ID is not its client ID.
3. Add a **Web** platform redirect URI. Enter the callback for your Speakeasy deployment:

   ```text
   {{ gram.oauth.callback_url }}
   ```

   During [Speakeasy credential setup](speakeasy.md#connect-speakeasy-credentials), verify that the displayed **Redirect URI** exactly matches this **Web** callback. Do not use an MCP client's localhost callback.

4. Under **Certificates & secrets**, create a short-lived pilot client secret. Store its **Value**, not its **Secret ID**, in your approved password manager for Speakeasy setup. Entra displays the value only once.
5. In the corresponding **Enterprise application → Properties**, require user assignment. Under **Users and groups**, assign only the pilot user.

This connection uses delegated access as the signed-in user. Do not enable application-only access as a substitute.

### Add the Work IQ permission and consent {#grant-work-iq-permission}

<!-- screenshot: Work IQ delegated permission in the dedicated app and approved principal-specific consent; identifiers redacted -->

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

**Warning:** `WorkIQAgent.Ask` includes read and write capabilities. Running read-only tests does not make the grant read-only. Obtain explicit administrator approval for its breadth and keep the pilot user restriction in place.

In the pilot app, add the Work IQ **delegated** permission **WorkIQAgent.Ask**. Review Microsoft's [permission description][permissions] first.

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

[admin]: https://admin.microsoft.com
[billing-setup]: https://learn.microsoft.com/en-us/microsoft-365/copilot/usage-based-billing-copilot-credits-setup
[spending-policies]: https://learn.microsoft.com/en-us/microsoft-365/copilot/usage-based-billing-manage-copilot-credits
[credits-guide]: https://aka.ms/CopilotCredits/LicensingGuide
[foundry]: https://learn.microsoft.com/en-us/microsoft-365/copilot/extensibility/work-iq/mcp/quickstart/foundry
[permissions]: https://learn.microsoft.com/en-us/microsoft-365/copilot/extensibility/work-iq/permissions
[server-options]: https://learn.microsoft.com/en-us/microsoft-agent-365/tooling-servers-overview
