# Speakeasy setup

### Add the server in Speakeasy {#add-server-in-speakeasy}

Configure one server for the approved employee audience in your organization. An administrator configures the OAuth client once; each employee signs in with their own Microsoft account. Share the server configuration, never an employee's access or refresh token. Keep access limited to the validation group until the rollout checks below pass; private visibility alone is not an access control.

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

### Connect as an employee and test {#connect-as-employee}

An administrator must first complete the Entra consent, employee assignments, billing audience, and tenant availability checks in [Microsoft setup](external.md). Tenant-wide consent does not sign employees in or give them a shared session. Employees do not need the Entra client secret.

1. Use **Connect/Authorize**, or the equivalent authorization control in your deployment, and sign in with your own assigned employee account.
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

An empty calendar confirms an authorized read, not useful calendar coverage. Drive metadata does not prove file-content retrieval. The migration did not rerun the source pilot’s tests. These smoke tests do not validate token refresh, writes, file content, Copilot reasoning, or cross-user isolation. Test those separately, with actual workflows and Speakeasy policy/logging behavior, before rollout.

If OAuth fails with `invalid_client`, check the attached provider's application/client ID, tenant-specific endpoints, Web callback, unexpired secret **Value**, and **selected** `client_secret_post` method. Save, reopen, and reauthorize the client.

If reads report a missing WorkIQ billing policy or `notEntitled`, check the affected employee's assignment, the enabled policy's service and user/group scope, tenant-approved Work IQ availability or installation requirements, and billing activation. An enabled policy alone does not prove eligibility. Microsoft's [read-only cost-management diagnostics][cost-api] can help an authorized administrator: a selected policy with remaining credits and `isConsumptionAllowed: false` indicates an entitlement denial, not an exhausted budget or a specific missing license. Do not broaden the Work IQ app's grants, raise budgets, or buy licenses solely from this error. Escalate unresolved failures to Microsoft with sanitized request IDs and timestamps.

### Validate and distribute employee access {#distribute-employee-access}

Before widening access, have at least two assigned employees connect independently through the Speakeasy MCP endpoint. Verify that `/me` requests run as the correct employee and do not reuse the administrator's or another employee's session. Use approved test data; do not copy business content into logs or the rollout record. Verify refresh or reauthorization and test that an unassigned account is denied, using an ordinary nonadministrator test account. These are required rollout checks, not capabilities established by the source pilot.

Have your Speakeasy administrator grant server access to the approved employee audience using the access controls available in your deployment, and distribute the Speakeasy MCP endpoint and employee sign-in instructions. The exact sharing UI and its enforcement have not been validated for this guide. Do not make the server public as a substitute. Keep **User Identity** selected; one dashboard connection does not authenticate everyone.

Align the approved employee population across Entra assignment, billing policies, any tenant catalog controls, and Speakeasy access. Each control is separate. If tenant installation or licensing requirements remain unresolved, keep the rollout restricted until your Microsoft administrator confirms eligibility.

### Maintain and revoke access {#maintain-employee-access}

Assign an owner for the Entra client secret, track its expiry, and rotate it using your approved secret-management process. Update the configured Speakeasy client and verify fresh authorization and existing sessions during rotation. Never distribute the secret to employees.

For offboarding, remove the employee's access in Entra and Speakeasy, and revoke relevant sessions through your administrators' established process; do not assume a group change immediately invalidates an already issued token. Review billing and catalog audiences separately. When retiring the integration, revoke only dedicated credentials, grants, assignments, and resources after checking dependencies. Do not delete the shared Microsoft Work IQ resource service principal or a Dataverse environment.

[cost-api]: https://learn.microsoft.com/en-us/microsoft-365/copilot/extensibility/api/admin-settings/cost-management/overview

This guide covers setup only. For anything beyond it — billing, tool behavior, limits — see [Microsoft's Work IQ MCP documentation](https://learn.microsoft.com/en-us/microsoft-365/copilot/extensibility/work-iq/mcp/quickstart/foundry).
