---
setup_version: 1
---

# Set up Google BigQuery

Use a Google Account with access to an existing Google Cloud project. Billing is optional for the BigQuery sandbox, not for all workloads.

Obtain these setup permissions, or ask an administrator who has them to do the applicable steps:

- **Service Usage Admin**, or equivalent permission, to enable the BigQuery API if necessary.
- **Project IAM Admin**, or equivalent permissions, to grant project roles.
- **OAuth Config Editor** (`roles/oauthconfig.editor`), or equivalent permissions, to configure OAuth and create the client.
- Resource-specific grant permissions to give access to approved datasets, tables, or views. Existing **BigQuery Data Owner** access on a dataset is one option. Do not grant this role on the project only to manage a dataset grant.

These setup permissions are separate from the permissions each user needs to use BigQuery. Authority to accept an agreement for your organization is also separate. An IAM role does not give this authority. Obtain approval or help from an authorized representative before you accept the required agreement.

If an organization policy prevents access, ask the applicable policy owner for help.

Sign in to [console.cloud.google.com](https://console.cloud.google.com/).

### Enable the BigQuery API {#enable-bigquery-api}

1. Select the existing Google Cloud project.
2. Open [docs.cloud.google.com/bigquery/docs/use-bigquery-mcp](https://docs.cloud.google.com/bigquery/docs/use-bigquery-mcp).
3. If necessary, use **Enable the API** to enable the BigQuery API for the project.

New projects have the BigQuery API enabled automatically. The BigQuery API also enables the remote MCP server.

<!-- screenshot: Show the selected project and BigQuery API status. Hide project identifiers. -->

### Give users access {#grant-user-access}

Obtain the project ID, user email addresses, and approved data resources from their owners. Existing equivalent permissions can satisfy these requirements.

1. Ask the project access administrator to give each user **MCP Tool User** (`roles/mcp.toolUser`) on the selected project.
2. Ask the project access administrator to give each user **BigQuery Job User** (`roles/bigquery.jobUser`) on the project that runs the jobs.
3. Ask the resource access administrator to give each user **BigQuery Data Viewer** (`roles/bigquery.dataViewer`) on the approved datasets, tables, or views.

A project-level **BigQuery Data Viewer** grant is also an option if that access is approved. Other tasks can need more permissions. Do not grant permissions for unrelated tasks. OAuth consent does not give IAM access.

<!-- screenshot: Show the intended identity and approved roles. Hide user and project values. -->

### Configure the OAuth consent screen {#configure-oauth-consent}

Obtain the application name, support email, contact email, test-user addresses, and audience decision from the application owner.

Use **Internal** only if the project is associated with a Google Cloud organization and all users belong to that organization. Otherwise, use **External** with **Testing** for this setup. External Testing permits up to 100 test users. Its authorization and refresh token expire after seven days. Another sign-in is then required. It is not a production setup. Expiration, revoked access, or organization policy can also require another sign-in for Internal applications.

Open **Google Auth platform** > **Branding**.

If Google Auth platform is not configured:

1. Select **Get Started**.
2. Under **App Information**, enter **App name**.
3. Select **User support email**.
4. Select **Next**.
5. Under **Audience**, select **Internal** if the project and users qualify. Otherwise, select **External**.
6. Select **Next**.
7. Under **Contact Information**, enter the contact **Email address**.
8. Select **Next**.
9. Under **Finish**, review the Google API Services User Data Policy.

> Warning: Accept the agreement only if you agree and have authority to bind your organization. Otherwise, obtain approval or help from its authorized representative.

10. Select **I agree to the Google API Services: User Data Policy**.
11. Select **Continue**.
12. Select **Create**.

For External Testing:

1. Open **Audience** > **Test users** > **Add users**.
2. Enter the users who will connect.
3. Select **Save**.

For an application used outside your Google Workspace organization:

1. Open **Data Access** > **Add or Remove Scopes**.
2. Select the BigQuery scope:

   ```
   https://www.googleapis.com/auth/bigquery
   ```

3. Save the configuration.

<!-- screenshot: Show the audience and BigQuery scope. Hide email addresses. -->

### Create the OAuth client {#create-oauth-client}

1. Open **Google Auth Platform** > **Clients** > **Create client**.
2. Select the project if prompted.
3. Set **Application type** to **Web application**.
4. In **Name**, enter the application name from its owner.
5. Under **Authorized redirect URIs**, select **+ Add URI**.
6. Paste this value:

   ```
   {{ gram.oauth.callback_url }}
   ```

7. Prepare secure storage for the client ID and secret.

> Warning: You can copy the client secret only once. Save it before you close the result.

8. Select **Create**.

<!-- screenshot: Show Web application and the callback field. Hide client values. -->

### Copy the client credentials {#copy-client-credentials}

1. Copy the client ID from the created OAuth client.
2. Save the client ID in secure storage.
3. Copy the **Client secret**.
4. Save the secret in secure storage with the client ID.

Continue at [Add the server in Speakeasy](speakeasy.md#add-server-in-speakeasy). Use both values in [Connect your credentials](speakeasy.md#connect-speakeasy-credentials).

<!-- screenshot: Show the client result. Hide all credential values. -->
