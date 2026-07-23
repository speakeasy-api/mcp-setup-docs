---
setup_version: 1
---

# HubSpot

## Prerequisites

You need a HubSpot account and a sign-in that can open the
**Development** workspace from the main navigation bar — that workspace
is where **MCP auth apps** are created and managed. If **Development** is
missing from your navigation bar, ask whoever manages your HubSpot
users to check your **Developer tools access** permission (on the
**Account** tab, under **Settings access**, when editing a user's
permissions) — it covers app management and is the most likely gate.
If the permission is in place and **Development** still does not
appear, ask HubSpot support whether your account is on the new HubSpot
Developer Platform. Everything below happens at
[app.hubspot.com](https://app.hubspot.com).

HubSpot hosts the MCP server itself at `https://mcp.hubspot.com`; you
point the Speakeasy AI Control Plane at that address rather than
installing or running anything yourself. The server is generally
available to all HubSpot accounts.

One thing to plan for beyond the steps below: see
[Admin connects first](#admin-connects-first) before rolling this out
to your users.

## Provider setup

When people connect from the Speakeasy AI Control Plane, each user
signs in with their own HubSpot account and approves access. To allow
that, you create one **MCP auth app** in your account's Development
workspace; HubSpot generates the **Client ID** and **Client secret**
the Speakeasy AI Control Plane needs. The steps below open the right
page, create the app, and copy out its credentials.

### Open MCP Auth Apps in the Development workspace {#open-mcp-auth-apps}

1. Sign in at [app.hubspot.com](https://app.hubspot.com).
2. In the main navigation bar of your HubSpot account, navigate to
   **Development**. This opens the Development workspace.
3. In the left sidebar menu, navigate to **MCP Auth Apps**. This opens
   the **MCP Auth Apps** page, which lists your account's MCP auth
   apps.

If **Development** is not in the main navigation bar, the sign-in you
used likely lacks the **Developer tools access** permission — see the
permission note in Prerequisites.

<!-- screenshot: the HubSpot main navigation bar with Development visible, and the resulting Development workspace with MCP Auth Apps highlighted in the left sidebar menu -->

### Create the MCP auth app {#create-mcp-auth-app}

1. In the upper right, click **Create MCP auth app**. This opens a
   dialog box for the app's details.
2. In **App name**, enter a name your users will recognize, such as
   `Speakeasy AI Control Plane`.
3. Add a **Description** if you want one; it's optional.
4. In **Redirect URL**, paste `{{ gram.oauth.callback_url }}`, the
   callback URL from the Speakeasy AI Control Plane.
5. Add an **Icon** if you want one; it's optional.
6. Click **Create**.

Two notes on this dialog. There is no permissions choice here —
nothing is missing; what each user can access is set automatically
when they connect (see
[No permissions step — access is set when each user connects](#scopes-are-automatic)).
And nothing here is final: every detail can be changed later from the
app's details page.

Keep `{{ gram.oauth.callback_url }}` as the app's only redirect URL,
or at least its first one — when an app has more than one redirect
URL, the first is used as the default.

<!-- screenshot: the MCP Auth Apps page with the Create MCP auth app button in the upper right and the creation dialog open, showing the App name, Description, Redirect URL, and Icon fields -->

### Copy the client credentials {#copy-client-credentials}

After you click **Create**, HubSpot redirects you to the app's details
page, where its client credentials and redirect URLs live.

1. Copy the **Client ID** into the Speakeasy AI Control Plane's Client
   ID field.
2. Copy the **Client secret** into the Speakeasy AI Control Plane's
   Client secret field.

Treat the **Client secret** like a password. There is no one-time
display to worry about: both values stay viewable on the app's details
page, so if you leave before copying them, repeat
[Open MCP Auth Apps in the Development workspace](#open-mcp-auth-apps),
then click the app's name in the list to open its details page and
copy them from there. To change any app detail later — the name, the
redirect URL — click **Edit info** in the upper right of the details
page.

That completes the HubSpot side. When people connect from the
Speakeasy AI Control Plane, each user selects the HubSpot account to
connect, grants permissions to the app, and authorizes the connection.
Have the account's admin make the first connection before rolling it
out to other users (see
[Admin connects first](#admin-connects-first)).

<!-- screenshot-exception: the credential values are plain text fields whose appearance adds nothing beyond the copied values -->

## Gotchas

### No permissions step — access is set when each user connects {#scopes-are-automatic}

There is no permissions or access-selection step anywhere in the MCP
auth app flow — nothing is missing from the dialog. What the app can
access is determined automatically by two things: the tools the MCP
server offers at the time a user connects, and the permissions that
user chooses to grant when connecting. Access is also always capped
per user: users can only view and modify records they already have
access to in HubSpot. Connecting never widens what an individual user
can see or edit.

### Server tool updates can require users to reconnect {#scope-updates-require-reinstall}

As the MCP server's tools are updated, the access available to grant
may change. When that happens, users who have already connected need
to reconnect — go through the HubSpot approval flow again — to grant
the new access; new connections prompt for it automatically. This
happens in practice: when HubSpot added landing-page tools in June
2026, already-connected users had to reconnect to grant the new
access.

### Sensitive Data blocks activity objects {#sensitive-data-blocks-activities}

If your HubSpot account has Sensitive Data turned on, activity objects
— calls, emails, meetings, notes, and tasks — are blocked from access
through the MCP server. The server also does not allow access to
custom Sensitive Data Properties, including Personal Health
Information and other forms of Highly Sensitive Data.

### Most content and marketing objects are read-only {#content-write-limits}

Campaigns, website pages, blog posts, and marketing events can be read
but not modified through the MCP server. The one exception is landing
pages: AI assistants can create, edit, and publish them, starting from
an existing template or a clone of a page you already have, with an
explicit confirmation step before a page goes live. The landing-page
tools exclude bulk operations, custom module creation, A/B test setup,
and first-time site or account setup.

### Keyword search only {#keyword-search-only}

Searches match keywords and property filters, not meaning — a record
that expresses an idea without using the searched words will not come
back. Set expectations with your users accordingly.

### Admin connects first {#admin-connects-first}

The admin of the HubSpot account needs to connect first, to allow
other users in the account to connect thereafter. Plan for the
account's admin to complete the first connection from the Speakeasy AI
Control Plane before inviting anyone else to connect.
