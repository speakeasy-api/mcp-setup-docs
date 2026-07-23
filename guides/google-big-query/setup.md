---
setup_version: 1
---

# Set up Google BigQuery

## Prerequisites

You need:

- A Google Cloud project and a Google Account that can administer it, configure the **Google Auth platform**, and create OAuth credentials.
- **Service Usage Admin** or **Owner** access if the BigQuery API is not already enabled.
- Suitable IAM administration access, such as **Project IAM Admin**, to grant roles.
- The Google Account email address of every user who will connect from the Speakeasy AI Control Plane.

Billing is optional for initial setup.

Sign in to the [Google Cloud console](https://console.cloud.google.com).

## Provider setup

### Enable the BigQuery API {#enable-bigquery-api}

1. On the Google Cloud console toolbar, click the resource selector.
2. In **Select a resource**, select the project you are configuring.
3. Open **APIs & Services** > **API Library**.
4. In **Search for APIs & Services**, enter `BigQuery API`.
5. Open **BigQuery API**.
6. If the API is not active, click **Enable**.

<!-- screenshot: the BigQuery API page showing Enable, or the enabled status if the API is already active -->

### Grant the BigQuery MCP roles {#grant-bigquery-mcp-roles}

1. Open the project's [**IAM** page](https://console.cloud.google.com/iam-admin/iam).
2. Click **Grant access**.
3. In **New principals**, enter the Google Account email address of a user who will connect from the Speakeasy AI Control Plane.
4. Click **Select a role**.
5. Search for **MCP Tool User**.
6. Select **MCP Tool User**.
7. Click **Add another role**.
8. Click **Select a role**.
9. Search for **BigQuery Job User**.
10. Select **BigQuery Job User**.
11. Click **Add another role**.
12. Click **Select a role**.
13. Search for **BigQuery Data Viewer**.
14. Select **BigQuery Data Viewer**.
15. Click **Save**.
16. Repeat steps 2–15 for every connecting user.

If your organization requires narrower data access, have the cloud security owner review dataset-level grants and required discovery permissions.

<!-- screenshot: the Grant access panel with MCP Tool User, BigQuery Job User, and BigQuery Data Viewer visible -->

### Configure the OAuth consent screen {#configure-oauth-consent}

> Warning: An OAuth 2.0 consent screen cannot be removed after it is configured.

Before you start, obtain an approved, monitored contact address from the application owner or cloud security owner.

Open **Google Auth platform** > **Branding**.

If **Google Auth platform not configured yet** appears:

1. Click **Get Started**.
2. Under **App Information**, enter an **App name**, such as `Speakeasy AI Control Plane`.
3. Choose a regularly monitored **User support email** from the signed-in Google Account or a Google Group that account manages.
4. Click **Next**.
5. Under **Audience**, select **Internal** if every connecting user belongs to the project's Google Workspace organization.
6. If any connecting user does not belong to that organization, select **External**.
7. Click **Next**.
8. Under **Contact Information**, enter the **Email address**.
9. Click **Next**.
10. Under **Finish**, review the Google API Services User Data Policy.
11. After the application owner, cloud security owner, or legal owner approves acceptance, select **I agree to the Google API Services: User Data Policy**.
12. Click **Continue**.
13. Click **Create**.

If the Google Auth platform was already configured, use its existing **Branding**, **Audience**, and **Data Access** pages.

After either path:

1. Open **Audience**.
2. Under **User Type**, note whether the current setting is **Internal** or **External**.
3. For an External app, note whether the publishing status is **Testing** or **In production**.

For an External app:

1. Open **Data Access**.
2. Click **Add or Remove Scopes**.
3. In the **API** column, search for `BigQuery API`.
4. If a row with the scope `https://www.googleapis.com/auth/bigquery` appears, select it.
5. If that row does not appear, enter `https://www.googleapis.com/auth/bigquery` under **Manually add scopes**.
6. Click **Update**.
7. Click **Save**.

Internal apps do not list scopes on the consent screen. For an Internal app, skip the remaining steps in this section and continue at [Create the OAuth client](#create-oauth-client).

If the External app's publishing status is **Testing**:

1. Return to **Audience**.
2. Under **Test users**, click **Add users**.
3. Enter every connecting user's email address.
4. Click **Save**.

**Testing** supports at most 100 test users, and each user's authorization expires after seven days. Unless you need persistent authorization, continue at [Create the OAuth client](#create-oauth-client).

If a Testing authorization expires, the user remains under **Test users**. Have the user connect again and complete Google's browser authorization flow to receive another seven-day authorization.

For persistent External-app authorization:

If the publishing status is already **In production**, skip both publishing controls below.

1. Click **Publish app**.
2. In the confirmation dialog, click **Confirm**.

The publishing status changes to **In production**, and accounts outside the test-user list can use the app. Google can still show an unverified-app warning or limit authorization of sensitive or restricted scopes until the applicable verification is complete.

Obtain the approved branding and verification materials from the application owner or cloud security owner before the steps below.

Complete branding verification:

1. Open **Branding**.
2. Complete **App name**.
3. Add the logo in **App logo**.
4. Enter the contact address in **Developer contact information**.
5. Enter the home-page URL in **App home page**.
6. Enter the privacy-policy URL in **App privacy policy**.
7. Enter the domains in **Authorized domains**.
8. Click **Verify Branding**.

After review sets branding to **Ready to publish**, click **Publish branding** within seven days or the status becomes **Need to re-verify**.

If the status is **Need to re-verify**, click **Verify Branding** again. After the status returns to **Ready to publish**, click **Publish branding** within seven days.

If **Data Access** classifies the BigQuery scope as sensitive or restricted, complete scope verification:

1. Open **Verification Center**.
2. Confirm that the app's branding is published.
3. If **Prepare for Verification** appears, click it.
4. Review the configured app information.
5. Click **Save and Continue**.
6. Confirm that **Data Access** declares every requested scope.
7. Provide up to three feature-documentation links. If the **Verification Center** field labels differ from this step, obtain the correct labels from the application owner or cloud security owner.
8. In **Scope Justification**, provide the justification for each sensitive or restricted scope.
9. In the same field, explain why a narrower scope is insufficient.
10. In **YouTube link**, paste the URL of an unlisted YouTube demonstration showing the English OAuth grant flow and how the app uses each requested scope.
11. Click **Submit for Verification**.

Google can request more information through the support and developer-contact email addresses. Check **Branding** and **Verification Center** for the current review status, including whether review is paused for a response.

<!-- screenshot: the Data Access page with the BigQuery scope in the selected-scopes table -->

### Create the OAuth client {#create-oauth-client}

1. Follow [Add the server in Speakeasy](#add-server-in-speakeasy).
2. On the server's **Overview**, open **Settings**.
3. Under **Authentication**, click **Configure Manually**.
4. If **Use Discovered** is offered instead, click **Use Discovered**.
5. In **Attach Remote Identity Provider**, set **Client Type** to **Manual**.
6. Copy the **Redirect URI**.

Return to the Google Cloud console.

1. Open **Google Auth platform** > **Clients**.
2. Click **Create client**.
3. Set **Application type** to **Web application**.
4. In **Name**, enter a recognizable name, such as `Speakeasy AI Control Plane`.
5. Under **Authorized redirect URIs**, click **+ Add URI**.
6. Paste the copied **Redirect URI**, shown here as `{{ gram.oauth.callback_url }}`.
7. Prepare a secure location for the client secret, which the next dialog shows for one-time copying.
8. Click **Create**.

This opens **OAuth 2.0 client created**.

<!-- screenshot: Create client with Web application selected and the Authorized redirect URIs row populated -->

### Copy the client credentials {#copy-client-credentials}

1. In **OAuth 2.0 client created**, copy the **Client ID**.
2. Store the **Client ID** in the secure location you prepared.
3. In **Client secrets**, copy the **Client secret**.
4. Store the **Client secret** as a password alongside the Client ID.

Continue at [Connect your credentials](#connect-speakeasy-credentials).

If you lose the one-time **Client secret**:

1. Open **Google Auth platform** > **Clients**.
2. Open the OAuth 2.0 client.

> Warning: The next action immediately revokes the old secret.

1. On the **Client ID** page, click **Reset secret**.
2. In the confirmation dialog, click **Reset**.
3. Copy the new secret.
4. Store the new secret as a password.

Continue with the new secret at [Connect your credentials](#connect-speakeasy-credentials).

<!-- screenshot-exception: do not capture credential values; the dialog contains secrets and its visual state adds no safe setup information beyond the field labels -->

## Speakeasy setup

### Add the server in Speakeasy {#add-server-in-speakeasy}

In the Speakeasy AI Control Plane sidebar, under **Connect**, select **Sources**, then click **Add Source**.

- If Google BigQuery is in the catalog: choose **3rd-party server**. On the **MCP Catalog** page, find Google BigQuery (the search box reads **Search MCP servers...**), open its entry with **View**, and click **Add**. In the **Add to Project** dialog, click **Add to Project**.
- If it is not: choose **Custom remote server**. On the **Add a custom remote MCP server** page, paste `https://bigquery.googleapis.com/mcp` into **Remote MCP server URL** and click **Add server**.

Either path creates the hosted MCP server and opens its **Overview** page.

If you came here from [Create the OAuth client](#create-oauth-client), return there and continue with the next step.

<!-- screenshot: the Add Source menu open on the Sources page, or the provider's catalog entry -->

### Connect your credentials {#connect-speakeasy-credentials}

Google's web client requires its generated secret even though the Speakeasy AI Control Plane field is labeled **Client Secret (optional)**.

If **Attach Remote Identity Provider** is not already open, repeat steps 2–5 from [Create the OAuth client](#create-oauth-client).

1. Paste the **Client ID** from [Copy the client credentials](#copy-client-credentials) into **Client ID**.
2. Paste the **Client secret** into **Client Secret (optional)**.
3. In **Scope (override)**, enter `https://www.googleapis.com/auth/bigquery`.
4. Click **Attach Identity Provider**.

<!-- screenshot: Attach Remote Identity Provider showing Client Type: Manual, Redirect URI, credential labels, and scope configuration, with credential values redacted -->

This guide covers setup only. For anything beyond it — billing, tool behavior, limits — see Google's BigQuery MCP documentation at https://docs.cloud.google.com/bigquery/docs/use-bigquery-mcp.
