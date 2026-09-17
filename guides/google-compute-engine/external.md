---
setup_version: 1
---

# Google Compute Engine setup

Connect the Google Compute Engine remote MCP server to the Speakeasy AI Control Plane. This guide uses a Web OAuth client and read-only access to Compute Engine resources.

Use an existing Google Cloud project with billing enabled. Ask the resource owner for the project and the Google Account that will use the connection. Sign in to [console.cloud.google.com](https://console.cloud.google.com/).

Arrange these permissions before setup:

- The service setup person needs the roles listed in Google's setup procedure: **Compute Instance Admin (v1)**, **Compute Security Admin**, **Service Account User**, and **Service Usage Admin** on the project. An authorized helper can do this work. For the API enablement action alone, **Service Usage Admin** is sufficient.
- A **Project IAM Admin** must grant missing project access. This person can be a separate helper.
- An **OAuth Config Editor** must configure the OAuth application and client. Google marks this role as Beta. It does not give authority to grant project roles or accept organization terms.
- A person authorized to act for the organization must approve policy acceptance when Google requests it.

The user who connects later needs **MCP Tool User** and **Compute Viewer**, not the full setup role set. These roles permit the selected read-only use. They do not permit changes to resources or access to data stored on disks.

The server uses a shared global endpoint. It does not provide full regional isolation and can route tool calls through any region.

### Enable the Compute Engine API {#enable-compute-api}

1. Open [console.cloud.google.com/projectselector2/home/dashboard](https://console.cloud.google.com/projectselector2/home/dashboard).
2. Select the existing project supplied by the resource owner.
3. Confirm with the billing administrator that billing is enabled for this project.
4. If the Compute Engine API is not enabled, open [docs.cloud.google.com/compute/docs/use-compute-engine-mcp](https://docs.cloud.google.com/compute/docs/use-compute-engine-mcp).
5. Use **Enable the Compute Engine API** for the selected project.

Enabling the API also enables the MCP server. You do not deploy a separate server.

<!-- screenshot: the selected Google Cloud project and Compute Engine API status -->

### Grant access to the connecting user {#grant-user-access}

Ask a Project IAM Admin to do these steps if you cannot manage project access. Use the intended connecting user's account, not the more privileged setup helper's account.

1. Open **IAM** in the Google Cloud console.
2. Select the resource project.
3. Select **Grant access**.
4. In **New principals**, enter the connecting user's Google Account email address.
5. Select **MCP Tool User** and **Compute Viewer** as the roles.
6. Select **Save**.

OAuth consent does not replace these project permissions. The application can access only resources that the user can access, within the authorized scopes.

<!-- screenshot: IAM access grants for MCP Tool User and Compute Viewer; redact identities -->

### Configure the OAuth application {#configure-oauth-consent}

Use **Internal** when the project belongs to a Google Cloud organization and all connecting users are members of that organization. Otherwise, this guide uses **External** with **Testing** status. Public production application verification is outside this setup path.

**Warning:** For these Compute Engine scopes, External testing authorization and refresh tokens expire after seven days. The user must sign in again. Testing is limited to 100 listed users. Token limits or access restrictions can also require another sign-in.

Ask the application owner for the application name, support email address, and contact email address.

1. Open **Google Auth platform > Branding**.
2. If **Google Auth platform not configured yet** appears, select **Get Started**. If the platform is already configured, use **Branding**, **Audience**, and **Data Access** to check the settings below.
3. Under **App Information**, enter **App name** and select **User support email**.
4. Select **Next**.
5. Under **Audience**, select **Internal** or **External** with the conditions above.
6. Select **Next**.
7. Under **Contact Information**, enter the contact **Email address**.
8. Select **Next**.
9. Under **Finish**, review the policy with the person authorized to accept it for the organization.
10. If that person approves, select **I agree to the Google API Services: User Data Policy**.
11. Select **Continue**, then **Create**.

For an application used outside the Google Workspace organization, open **Data Access > Add or Remove Scopes**. Select these two scopes, then select **Save**:

```text
https://www.googleapis.com/auth/compute.read-only
https://www.googleapis.com/auth/compute.readonly
```

The first scope permits read-only MCP tools. The second permits read-only access through the Compute Engine API. Keep both spellings exactly as shown. You will also enter both scopes in [Speakeasy setup](speakeasy.md#connect-speakeasy-credentials).

<!-- screenshot: Google Auth platform Branding, Audience and Data Access; redact addresses -->

### Confirm user eligibility {#assign-test-users}

For an **Internal** application, confirm that the connecting user belongs to the project's parent organization. Project IAM access alone does not establish organization membership.

For an **External** application with **Testing** status, ask the OAuth Config Editor to add each connecting user:

1. Open **Audience**.
2. Under **Test users**, select **Add users**.
3. Enter the authorized users' email addresses.
4. Select **Save**.

<!-- screenshot: Audience and the test user list; redact identities -->

### Create the Web OAuth client {#create-oauth-client}

1. Open **Google Auth Platform > Clients > Create client** at [console.cloud.google.com/auth/clients/create](https://console.cloud.google.com/auth/clients/create).
2. In **Application type**, select **Web application**.
3. In **Name**, enter the application name supplied by its owner.
4. Under **Authorized redirect URIs**, select **+ Add URI**.
5. In **URIs**, enter:

   ```text
   {{ gram.oauth.callback_url }}
   ```

6. Select **Create**.

The selected connection uses server-side OAuth. Do not add an **Authorized JavaScript origins** value for this path. Google requires that field when client-side JavaScript accesses Google APIs.

<!-- screenshot: Web application client type and authorized redirect URI; redact environment-specific values -->

### Save the client credentials {#copy-client-credentials}

**Warning:** You can copy the client secret only once. Save it before you leave the client creation screen. Do not put it in a ticket or documentation file.

1. Copy the client ID for the new OAuth client.
2. In **OAuth 2.0 client created**, copy the **Client secret** from **Client secrets**.
3. Save both values in approved secure storage for the authorized Speakeasy operator.

Use these values in [Connect your credentials](speakeasy.md#connect-speakeasy-credentials).

<!-- screenshot: OAuth client details with the client ID and secret redacted -->
