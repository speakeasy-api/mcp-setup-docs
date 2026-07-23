---
setup_version: 1
---

# Google Compute Engine

## Prerequisites

A Google Cloud project with billing enabled, and a sign-in on that project
that can enable APIs, grant IAM roles, and configure the Google Auth
platform — project **Owner** covers all three. Everything in Provider setup
happens in the Google Cloud console at
[console.cloud.google.com](https://console.cloud.google.com). Each person
who will connect from the Speakeasy AI Control Plane needs their own Google
account; you grant their access in [Grant IAM roles](#grant-iam-roles).

Google hosts the MCP server at `https://compute.googleapis.com/mcp`; you
point the Speakeasy AI Control Plane at that address rather than installing
anything. The server's tools manage real Compute Engine resources — they
can create, start, stop, and delete VM instances — and everything they do
is ordinary Compute Engine activity billed to this project; a VM created
without explicit choices defaults to an `e2-medium` machine running
Debian 12. Google might process the server's tool calls in any region,
regardless of where your project's resources live.

## Provider setup

You will enable the Compute Engine API, grant roles to each connecting
user, configure the consent screen, and create one OAuth client. That
client's **Client ID** and **Client secret** are the values the
Speakeasy AI Control Plane needs.

### Enable the Compute Engine API {#enable-compute-engine-api}

1. Sign in at
   [console.cloud.google.com](https://console.cloud.google.com).
2. Pick your project in the project selector on the console toolbar.
3. In the navigation menu, go to **APIs & Services** > **API Library**.
4. In the **Search for APIs & Services** box, search for
   `Compute Engine API`.
5. Open the result named **Compute Engine API**
   (`compute.googleapis.com`).
6. Click **Enable**. If the page shows the API as already enabled, there
   is nothing more to do.

The MCP server is enabled together with the API — there is no separate
MCP switch to find.

<!-- screenshot: the API Library page showing the Compute Engine API entry with the Enable button visible, or the API's overview page showing it already enabled -->

### Grant IAM roles {#grant-iam-roles}

Do this for every user who will connect from the Speakeasy AI Control
Plane. Each user authorizes as themselves, so their own roles cap what
the server will do for them.

1. In the navigation menu, go to **IAM & Admin** > **IAM**, with the
   same project selected.
2. Click **Grant access**.
3. In the **New principals** field, enter the user's Google Account
   email address.
4. Click **Select a role**.
5. Search for and select **MCP Tool User** (`roles/mcp.toolUser`) —
   this role allows MCP tool calls.
6. Click **Add another role**.
7. Add **Compute Instance Admin (v1)**
   (`roles/compute.instanceAdmin.v1`) — full control of Compute Engine
   instances, instance groups, disks, snapshots, and images.
8. Click **Add another role**.
9. Add **Service Account User** (`roles/iam.serviceAccountUser`) —
   required for creating VMs.

   Google recommends granting **Service Account User** on a specific
   service account rather than project-wide; granting it here on the
   project also works.

10. Click **Save**.

Nothing here is final: you can return to the same **IAM** page and edit
roles at any time.

<!-- screenshot: the Grant access panel with a principal entered and MCP Tool User plus Compute Instance Admin (v1) visible in the role list -->

### Configure the consent screen {#consent-screen}

The consent screen is what your users see when they sign in to approve
the connection. One thing to know before you start: once configured, the
consent screen cannot be removed.

1. In the navigation menu, go to **Google Auth platform** >
   **Branding**.
2. If you see a message that says **Google Auth platform not configured
   yet**, click **Get Started**. If you do not see that message, the
   platform is already configured — skip ahead to adding the scope
   below.
3. Under **App Information**, in **App name**, enter a name your users
   will recognize, such as `Speakeasy AI Control Plane`.
4. In **User support email**, choose a support email address.
5. Click **Next**.
6. Under **Audience**, select **Internal** if everyone who will connect
   belongs to your Google Workspace organization; otherwise select
   **External**.
7. Click **Next**.
8. Under **Contact Information**, enter an **Email address**.
9. Click **Next**.
10. Under **Finish**, review the Google API Services User Data Policy
    and, if you agree, select **I agree to the Google API Services:
    User Data Policy**.
11. Click **Continue**.
12. Click **Create**.

Next, add the Compute Engine scope — the access the connection will
request:

1. Click **Data Access**.
2. Click **Add or Remove Scopes**.
3. Add `https://www.googleapis.com/auth/compute` — select it in the
   list if it appears there; otherwise enter it in the text box under
   **Manually add scopes**.
4. Click **Update**.
5. Click **Save**.

If the app's user type is **External** (you chose it in the wizard, or
it was chosen when the platform was first configured), list every
connecting user as a test user — while the app's publishing status is
**Testing**, only listed accounts can connect:

1. Click **Audience**.
2. Under **Test users**, click **Add users**.
3. Enter the Google account email address of every user who will
   connect from the Speakeasy AI Control Plane.
4. Click **Save**.

**Testing** status is temporary by design: an External app left in
Testing drops every connection after seven days, and Google caps a
Testing app at 100 test users. If your organization has more connecting
users than that, confirm the connection with a smaller group first, then
publish the app to cover everyone else. Once a user has signed in
successfully from the Speakeasy AI Control Plane (see
[Connect your credentials](#connect-speakeasy-credentials)), return to
the **Audience** page and click **Publish app** so connections persist.
Google notes that your app's configuration may be subject to
verification before it can request certain scopes, so publishing may
involve an extra review step.

<!-- screenshot: the Data Access page with the Compute Engine scope present in the selected-scopes table -->

### Create the OAuth client {#create-oauth-client}

1. Go to **Google Auth Platform** > **Clients**.
2. Click **Create client**.
3. In the **Application type** list, select **Web application**.
4. In the **Name** field, enter a name you will recognize later.
5. In the **Authorized redirect URIs** section, click **+ Add URI**.
6. Enter `{{ gram.oauth.callback_url }}` — the Speakeasy AI Control
   Plane's callback URL.
7. Leave **Authorized JavaScript origins** empty.

   The next click opens a dialog that shows the client secret exactly
   once. Have a secure place ready — your password manager works —
   before you continue.

8. Click **Create**. The **OAuth 2.0 client created** dialog opens;
   the next step copies the credentials out of it.

<!-- screenshot: the Create client form with Web application selected and one Authorized redirect URIs entry filled -->

### Copy the client credentials {#copy-client-credentials}

<!-- screenshot-exception: the credential values are plain text fields whose appearance adds nothing beyond the copied values -->

The **OAuth 2.0 client created** dialog shows both values the Speakeasy
AI Control Plane needs.

1. Copy the **Client ID** and save it in the secure place you prepared.
2. In the **Client secrets** section, copy the **Client secret** and
   save it alongside the ID.

Treat the client secret like a password, and note that you can only
copy it once: after this dialog closes, the **Client ID** stays visible
on the client's page, but the secret does not. If you lose the secret,
open the client from the **Clients** list, delete the secret, and
create a new one.

Both values go into the Speakeasy AI Control Plane in
[Connect your credentials](#connect-speakeasy-credentials).

## Speakeasy setup

### Add the server in Speakeasy {#add-server-in-speakeasy}

In the Speakeasy AI Control Plane sidebar, under **Connect**, select
**Sources**, then click **Add Source**.

- If Google Compute Engine is in the catalog: choose **3rd-party
  server**. On the **MCP Catalog** page, search for `Compute Engine`
  (the search box reads **Search MCP servers...**), open the entry with
  **View**, and click **Add**. In the **Add to Project** dialog, click
  **Add to Project**.
- If it is not: choose **Custom remote server**. On the **Add a custom
  remote MCP server** page, paste `https://compute.googleapis.com/mcp`
  into **Remote MCP server URL** and click **Add server**.

Either path creates the hosted MCP server and opens its **Overview**
page.

<!-- screenshot: the Add Source menu open on the Sources page, or the Google Compute Engine catalog entry -->

### Connect your credentials {#connect-speakeasy-credentials}

1. From the server's **Overview** page, open **Settings**.
2. Under **Authentication**, click **Configure Manually**. If
   **Use Discovered** is offered, choose **Configure Manually** anyway —
   manual configuration matches the client you created in
   [Create the OAuth client](#create-oauth-client). This opens the
   **Attach Remote Identity Provider** sheet.
3. Set **Client Type** to **Manual**.
4. Confirm the **Redirect URI** the sheet shows matches the URL you
   entered under **Authorized redirect URIs** in
   [Create the OAuth client](#create-oauth-client).
5. Paste the client ID from
   [Copy the client credentials](#copy-client-credentials) into
   **Client ID**.
6. Paste the client secret into **Client Secret (optional)** — despite
   the label, Google requires the secret, so treat the field as
   required.
7. Click **Attach Identity Provider**.

<!-- screenshot: the Attach Remote Identity Provider sheet showing the Redirect URI and credential fields, values redacted -->

Each user who then connects signs in with their own Google account.
For their sign-in to succeed, they need the roles from
[Grant IAM roles](#grant-iam-roles), and — while an External app's
publishing status is **Testing** — a listing under **Test users** in
[Configure the consent screen](#consent-screen).

This guide covers setup only. For anything beyond it — billing, tool
behavior, limits — see Google's Compute Engine MCP documentation at
https://docs.cloud.google.com/compute/docs/use-compute-engine-mcp.
