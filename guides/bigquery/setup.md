---
setup_version: 1
---

# BigQuery

## Prerequisites

A Google Cloud project with billing enabled, and an account on that project
with permission to enable APIs, grant IAM roles, and create OAuth clients
(project Owner covers all three). Everything below happens in the Google
Cloud console at [console.cloud.google.com](https://console.cloud.google.com);
no prior console experience is assumed. Queries run through the MCP server
execute as BigQuery jobs billed to this project.

## Values from Gram

Add `{{ gram.oauth.callback_url }}` as an authorized redirect URI when you
create the OAuth client.

## Provider setup

### Enable the BigQuery API {#enable-bigquery-api}

1. Open the [Google Cloud console](https://console.cloud.google.com) and
   pick your project in the project selector on the console toolbar (create
   a project first if you don't have one).
2. Open the navigation menu and go to **APIs & Services > Library**.
3. In the **Search for APIs & Services** box, search for `BigQuery API` and
   open the result named **BigQuery API** (`bigquery.googleapis.com`).
4. Select **Enable**. If the page shows the API as already enabled, there is
   nothing more to do.
5. The remote MCP server is enabled together with the API — there is no
   separate MCP switch.

<!-- screenshot: the API Library page for the BigQuery API with the Enable button visible -->

### Grant IAM roles {#grant-iam-roles}

1. In the navigation menu, go to **IAM & Admin > IAM**, with the same
   project selected.
2. Select **Grant access**.
3. Under **New principals**, enter the email address of each user who will
   connect from the Speakeasy AI Control Plane.
4. Select **Select a role** and search for **MCP Tool User**
   (`roles/mcp.toolUser`).
5. Select **Add another role** and add **BigQuery Job User**
   (`roles/bigquery.jobUser`); repeat for **BigQuery Data Viewer**
   (`roles/bigquery.dataViewer`).
6. Select **Save**.

<!-- screenshot: the Grant access panel with a principal entered and the MCP Tool User, BigQuery Job User, and BigQuery Data Viewer roles selected -->

### Configure the consent screen {#consent-screen}

1. In the navigation menu, go to **Google Auth platform > Branding**. If the
   project has never been configured for OAuth, select **Get started**.
2. Under App information, enter an **App name** (for example
   `Speakeasy AI Control Plane`) and pick a **User support email**.
3. For Audience, choose **Internal** if only members of your Google
   Workspace organization will connect; otherwise choose **External**.
4. Enter a contact **Email address**, agree to the Google API Services User
   Data Policy, and finish the wizard.
5. Go to **Google Auth platform > Data access** and select
   **Add or remove scopes**. Add `https://www.googleapis.com/auth/bigquery`
   (paste it into the manual entry field if it is not in the list), then
   select **Save**.
6. If you chose External and the app's publishing status is Testing, go to
   **Google Auth platform > Audience**, select **Add users** under Test
   users, add each connecting Google account, and select **Save**.

<!-- screenshot: the Google Auth platform Data access page with the BigQuery scope in the selected scopes table -->

### Create the OAuth client {#create-oauth-client}

1. Go to **Google Auth platform > Clients** and select **Create client**.
2. Choose **Web application** as the application type and name the client.
3. Under **Authorized redirect URIs**, select **+ Add URI** and enter
   `{{ gram.oauth.callback_url }}`.
4. Select **Create**.

<!-- screenshot: the Create OAuth client form with Web application selected and the redirect URI field filled -->

### Copy the client credentials {#copy-credentials}

> Screenshot exception: the credential values are plain text fields whose
> appearance adds nothing beyond the copied values.

1. In the **OAuth 2.0 client created** dialog, copy the client ID and the
   client secret into the Speakeasy AI Control Plane fields. The secret can
   only be copied once — if you close the dialog without saving it, create a
   new client secret from the client's detail page.

## Gotchas

### Scope too narrow {#scope-too-narrow}

Request the `https://www.googleapis.com/auth/bigquery` scope. Query tools
create BigQuery jobs, so narrower read-only scopes surface as authorization
failures even when the IAM roles are correctly granted.

### Query timeout and row cap {#query-limits}

Query processing is limited to three minutes by default — longer queries are
automatically cancelled — and results are capped at 3,000 rows. Google Drive
external tables cannot be queried. There are no dedicated MCP quotas;
standard BigQuery quotas apply.

### SELECT-only is not side-effect-free {#select-only-side-effects}

`execute_sql` rejects INSERT, UPDATE, and DELETE statements and stored
procedures, but a SELECT can still trigger side effects by invoking remote
functions or Python UDFs. Every query is labeled as MCP-originated and
billed to the connected project.

### Testing status expires refresh tokens {#testing-status}

While the OAuth app's publishing status is Testing, refresh tokens expire
after seven days and the connection drops. Publish the app to production for
a persistent connection.
