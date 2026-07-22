---
setup_version: 1
---

# HubSpot

## Prerequisites

A HubSpot account whose user can open the **Development** workspace from
the main navigation bar — this is where MCP auth apps are created and
managed (HubSpot's self-service MCP auth apps are in public beta). HubSpot
does not document a plan-tier requirement for the remote MCP server. All
MCP actions respect the connecting user's existing HubSpot permissions, so
the account you connect with determines what records are reachable.
Everything below happens at [app.hubspot.com](https://app.hubspot.com); no
prior HubSpot experience is assumed.

## Values from Gram

Add `{{ gram.oauth.callback_url }}` as the **Redirect URL** when you create
the MCP auth app.

## Provider setup

### Create an MCP auth app {#create-mcp-auth-app}

1. Sign in at [app.hubspot.com](https://app.hubspot.com).
2. In the main navigation bar of your HubSpot account, navigate to
   **Development**.
3. In the left sidebar menu, navigate to **MCP Auth Apps**.
4. In the upper right, click **Create MCP auth app**.
5. In the dialog, enter:
   - **App name**: a name for the connection, for example
     `Speakeasy AI Control Plane`.
   - **Description**: an optional description of the app.
   - **Redirect URL**: `{{ gram.oauth.callback_url }}`.
   - **Icon**: an optional icon for the app.
6. Save the dialog. If you later add multiple redirect URLs, the first
   redirect URL is used as the default redirect.

<!-- screenshot: the MCP Auth Apps page inside the Development workspace with the Create MCP auth app button in the upper right and the creation dialog open showing the App name, Description, Redirect URL, and Icon fields -->


### Copy the client credentials {#copy-client-credentials}

<!-- screenshot-exception: the credential values are plain text fields whose appearance adds nothing beyond the copied values -->

1. After you create the app, HubSpot redirects you to the app's details
   page, where you can view its client credentials and redirect URLs.
2. Copy the **Client ID** and **Client Secret** into the Speakeasy AI
   Control Plane fields. The credentials remain viewable on the details
   page, so there is no one-time display to worry about.

## Gotchas

### Scopes come from tools plus user grants {#scopes}

MCP auth apps do not declare scopes. Available scopes are determined by
the tools the MCP server exposes at installation time and the permissions
the user chooses to grant during installation.

### Scope updates require reinstalling {#scope-reinstall}

When scopes change (for example, HubSpot adds tools to the server), users
who already installed the app must re-install it to grant the new scopes.

### Sensitive Data blocks activity objects {#sensitive-data}

If the HubSpot account has Sensitive Data turned on, activity objects
(calls, emails, meetings, notes, and tasks) are blocked from access
through the MCP server. Custom Sensitive Data Properties, including
Personal Health Information, are never accessible.

### Marketing and content objects are read-only {#marketing-read-only}

Create and update support covers CRM records and activity objects only.
Campaigns, landing pages, website pages, and blog posts can be read but
not modified through the MCP server.

### Permissions still govern {#permissions-govern}

All actions respect existing HubSpot user permissions. Users can only
view and modify records they already have access to in HubSpot, so
granting the OAuth connection never widens what an individual user can
see or edit.

### Keyword search only {#keyword-search-only}

The MCP server is based on the CRM search API, which does not include
vector search. Searches match keywords and property filters, not
semantic similarity.

### Admin connects first {#admin-connects-first}

HubSpot's MCP server overview notes that the admin of the HubSpot account
needs to connect first to allow other users in the account to connect
thereafter.
