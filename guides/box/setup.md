---
setup_version: 1
---

# Box

## Prerequisites

A Box account with admin access to your enterprise's Admin Console and
permission to manage Integrations. The Box MCP Server is available on
Business plans and above. Everything below happens in the Admin Console,
reached from [app.box.com](https://app.box.com); no prior Admin Console
experience is assumed.

## Values from Gram

Add `{{ gram.oauth.callback_url }}` as the Redirect URI when you create the
integration credentials.

## Provider setup

### Enable the Box MCP Server {#enable-mcp-server}

1. Sign in at [app.box.com](https://app.box.com) and open the
   **Admin Console** from the left navigation (it is only visible to Box
   admins).
2. Select **Integrations** in the Admin Console sidebar and search for
   **Box MCP server** in the search field.
3. Locate **Custom Box MCP Server** and set its availability to
   **Available for all users** (or the user set that should connect from
   the Speakeasy AI Control Plane).

<!-- screenshot: the Admin Console Integrations page with Box MCP server in the search results and Custom Box MCP Server availability enabled -->


### Create integration credentials {#create-integration-credentials}

1. Hover over the **Box MCP server** application and select **Configure**.
2. In the **Additional Configuration** section, select
   **+ Add Integration Credentials**.
3. Enter a name for the integration and select **Save**, then expand the
   newly created entry.
4. Enter `{{ gram.oauth.callback_url }}` as the **Redirect URI**.
5. Select the **Access Scopes** your users need: `root_readwrite` for
   content tools, `ai.readwrite` for Box AI tools, and `docgen.readwrite`
   for Doc Gen tools (requires Enterprise Advanced licensing).

<!-- screenshot: the Additional Configuration section with a credential entry expanded showing the Client ID, Client Secret, Redirect URI, and Access Scopes fields -->


### Copy the client credentials {#copy-credentials}

> Screenshot exception: the credential values are plain text fields whose
> appearance adds nothing beyond the copied values.

1. From the expanded credential entry, copy the auto-generated **Client ID**
   and **Client Secret** into the Speakeasy AI Control Plane fields.

## Gotchas

### AI tools bill AI units {#ai-billing}

Box AI tools (`ai_qa_*`, `ai_extract_*`) consume billable AI units on the
connected enterprise's plan.

### Doc Gen requires Enterprise Advanced {#docgen-licensing}

The `create_docgen_*` and `list_docgen_*` tools depend on Doc Gen
availability, which requires Enterprise Advanced licensing.

### Scopes cap actions; permissions still govern {#scopes-vs-permissions}

Access scopes define the maximum actions the integration can perform. Users
can only reach content their existing Box permissions already allow, so
granting a scope never widens what an individual user can see or edit.

### Restricted mutating tools {#restricted-tools}

Several mutating tools (uploads, moves, copies, hub changes) only work on
items with no external collaborators or shared links anywhere up their
parent chain.
