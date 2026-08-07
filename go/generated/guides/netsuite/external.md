---
setup_version: 1
---

# Set up NetSuite

Sign in to the NetSuite application as an Administrator or delegated administrator who can enable SuiteCloud features, install SuiteApps, manage roles, and create OAuth integration records. Install the free managed **MCP Standard Tools** SuiteApp (Bundle ID `522506`) and use an approved scoped non-Administrator role. If regulated data may be involved, obtain approval from the application or cloud security owner before proceeding; Oracle states that the service has not been assessed for HIPAA and must not be used to store, process, or transmit ePHI without an independent compliance determination.

### Enable the required features {#enable-required-features}

1. Go to **Setup > Company > Enable Features**.
2. Open the **SuiteCloud** subtab.
3. Under **SuiteScript**, select **Server SuiteScript**.
4. Enable **OAUTH 2.0**.
5. Under **SuiteTalk (Web Services)**, select **REST Web Services**.
6. Click **Save**.

<!-- screenshot: the SuiteCloud subtab with Server SuiteScript, OAUTH 2.0, and REST Web Services visible and enabled; exclude unrelated account details -->

### Install MCP Standard Tools {#install-mcp-standard-tools}

1. Open the **SuiteApps** tab.
2. In **Search SuiteApps**, enter `MCP Standard Tools`.
3. Select the **MCP Standard Tools** icon. Use the exact title to distinguish the SuiteApp; its operator-validated Bundle ID is `522506`.
4. On the SuiteApp details page, click **Install** at the top right.
5. Wait for installation to complete before continuing.

<!-- screenshot: the MCP Standard Tools SuiteApp details page with the title and Install control visible; include Bundle ID 522506 if the live Marketplace displays it -->

### Configure a scoped non-admin role {#configure-scoped-role}

1. Go to **Setup > Users/Roles > Manage Roles**.
2. Edit the intended approved non-Administrator role. Do not use **Administrator** or a role with full permissions; NetSuite blocks those roles from the service.
3. Open **Permissions > Setup**.
4. Add **MCP Server Connection**.
5. Add **Log in using OAuth 2.0 Access Tokens**. Do not select **Log in using Access Tokens**.
6. Add **REST Web Services**.
7. Retain only the record and task permissions approved for MCP use. These permissions determine which records and operations the tools can access.
8. If your account restricts File Cabinet folders, ensure that the role can access the MCP Standard Tools SuiteApp folder. Oracle does not publish the exact folder path or role-form control; obtain those account-specific details from your NetSuite owner.
9. Save the role.
10. Go to **Lists > Employees > Employees**.
11. Click **Edit** for each employee who will authorize the connection.
12. Open **Access > Roles**.
13. In **Role**, select the scoped role.
14. Click **Add**.
15. Click **Save**.

<!-- screenshot: the role's Permissions > Setup list showing the three required permissions and the non-Administrator role name; redact user and account-specific data -->

### Record the account-specific MCP URL {#record-account-mcp-url}

1. Go to **Setup > Company > Company Information**.
2. Record the account ID for the current account. The **Company URLs** subtab on this page lists account-specific service URLs. If you cannot identify the account ID, obtain the current account ID or SuiteTalk domain from your NetSuite owner.
3. Replace `<accountid>` in this endpoint with the account's domain-form ID:

   ```text
   https://<accountid>.suitetalk.api.netsuite.com/services/mcp/v1/suiteapp/com.netsuite.mcpstandardtools
   ```

   For a sandbox or Release Preview account, replace underscores with hyphens and uppercase letters with lowercase letters. For example, `123456_SB1` becomes `123456-sb1`.
4. Keep the completed endpoint for **Remote MCP server URL** in the Speakeasy AI Control Plane.

<!-- screenshot: Company Information > Company URLs with the account-specific SuiteTalk domain visible; redact unrelated URLs and account data. The final MCP path is assembled from Oracle's documented fixed suffix rather than copied from a named MCP row. -->

### Create the OAuth integration {#create-oauth-integration}

1. Go to **Setup > Integration > Manage Integrations > New**.
2. In **Name**, enter an organization-approved name such as `Speakeasy NetSuite MCP`.
3. Set **State** to **Enabled**.
4. Open the **Authentication** subtab.
5. Under **OAuth 2.0**, select **Authorization Code Grant**.
6. In **Redirect URI**, enter:

   ```text
   {{ gram.oauth.callback_url }}
   ```
7. Select **Public Client**.
8. Leave **Dynamic Client Registration** cleared.
9. Select only the **NetSuite AI Connector Service** OAuth 2.0 scope.
10. Clear **RESTlets**, **REST Web Services**, and **SuiteAnalytics Connect** in the OAuth 2.0 scope area.
11. Ensure that every box in **Token-based Authentication** and **Client Credentials** is cleared, including **Client Credentials (Machine to Machine) Grant**.
12. Choose your organization's approved **OAuth 2.0 Consent Policy**. **Always Ask** is the default; **Ask First Time** prompts on first authorization and in additional cases. **Never Ask** is unavailable for the selected scope.
13. Before you click **Save**, prepare to copy the credential screen. NetSuite displays the client ID and client secret only after this first save, and neither can be retrieved after you leave the page.
14. Click **Save**.
15. Copy **Client ID** for the Speakeasy AI Control Plane. Because this is a public client, do not provide the displayed client secret to Speakeasy.

If you leave the credential page without recording **Client ID**:

1. Go to **Setup > Integration > Manage Integrations**.
2. Click **Edit** for the integration.
3. Warn affected owners that resetting replaces the integration's existing credentials.
4. Click **Reset Credentials**.
5. Click **OK** in the confirmation popup.
6. Copy the replacement **Client ID** from the new credential screen before leaving the page.

<!-- screenshot: the integration's Authentication subtab before save, showing Authorization Code Grant, Redirect URI, Public Client, and only NetSuite AI Connector Service selected; capture a separate credential screen with all values fully redacted -->
