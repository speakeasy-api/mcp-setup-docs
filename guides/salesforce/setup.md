---
setup_version: 1
---

# Connect Salesforce to the Speakeasy AI Control Plane

## Prerequisites

- Salesforce System Administrator access to a production or sandbox org.
- A Salesforce org edition with API access, such as Developer or Enterprise, or Professional with API access enabled.
- Authority to create an **External Client App** and enable Hosted MCP servers.
- Access to the Speakeasy AI Control Plane.

Sign in to the Salesforce org that will expose its records. Create credentials in that same production or sandbox org. This guide does not cover scratch orgs.

## Provider setup

### Open Salesforce Setup {#open-salesforce-setup}

1. At the top of any Salesforce page, select the setup gear icon.
2. Select **Setup**.

<!-- screenshot: the Salesforce page with the setup gear menu open and Setup visible -->

### Start an External Client App {#start-external-client-app}

1. In **Quick Find**, enter `external client`.
2. Select **External Client App Manager**.
3. Select **New External Client App**.
4. Under **Basic Information**, enter a descriptive **App Name**, such as `Speakeasy MCP`.
5. Accept the generated **API Name**.
6. Enter the responsible administrator's or application owner's email address in **Contact Email**.
7. Set **Distribution State** to **Local**.

<!-- screenshot: New External Client App with Basic Information filled and Distribution State set to Local -->

### Configure OAuth settings {#configure-oauth-settings}

1. Expand **API (Enable OAuth Settings)**.
2. Select **Enable OAuth**.
3. Enter `{{ gram.oauth.callback_url }}` in **Callback URL**.
4. In **Available OAuth Scopes**, select **Access MCP servers** (`mcp_api`).
5. Select the right-arrow control to move it to **Selected OAuth Scopes**.
6. In **Available OAuth Scopes**, select **Perform requests at any time** (`refresh_token`).
7. Select the right-arrow control to move it to **Selected OAuth Scopes**.
8. Under **Security**, select **Issue JSON Web Token (JWT)-based access tokens for named users**.
9. Select **Require Proof Key for Code Exchange (PKCE) extension for Supported Authorization Flows**.
10. Leave **Require Secret for Web Server Flow** deselected.
11. Leave **Require Secret for Refresh Token Flow** deselected.

<!-- screenshot: the expanded API (Enable OAuth Settings) section with Callback URL, both selected OAuth scopes, and the security selections visible -->

### Create the External Client App {#create-external-client-app}

Select **Create**.

The app can take up to 30 minutes to become operational. If attaching it immediately fails even though the settings are correct, wait for that window before changing the configuration.

<!-- screenshot-exception: a standard create action; the saved app's credential view is the meaningful state captured in the next step -->

### Copy the Consumer Key {#copy-consumer-key}

1. On the saved External Client App, select **Settings**.
2. Under **OAuth Settings**, select **Consumer Key and Secret**.
3. Complete the Salesforce verification prompt if it appears.
4. Copy **Consumer Key**.

<!-- screenshot-exception: the credential is sensitive and the screen adds no setup information beyond the exact label; do not capture the key -->

### Enable the selected SObject server {#enable-sobject-server}

Choose the least-privileged server that meets the team's needs:

- **sobject-reads** allows discovery, query, search, and relationship traversal without changing records.
- **sobject-mutations** allows reading, creating, and updating records without deleting them.
- **sobject-deletes** allows identifying and deleting records without creating or updating them.
- **sobject-all** allows creating, reading, updating, deleting, querying, and searching records.

If the ticket does not specify the team's approved read, write, or delete requirements, obtain the server choice from the application or cloud security owner.

1. Return to **Setup**.
2. In **Quick Find**, enter `MCP Servers`.
3. Select **MCP Servers** under **API Catalog**.
4. Turn on the selected server.
5. Record its URL from the table below, using the production or sandbox form that matches the org.
6. Wait up to two minutes for the server to become active.

| Server | Production URL | Sandbox URL |
| --- | --- | --- |
| **sobject-reads** | `https://api.salesforce.com/platform/mcp/v1/platform/sobject-reads` | `https://api.salesforce.com/platform/mcp/v1/sandbox/platform/sobject-reads` |
| **sobject-mutations** | `https://api.salesforce.com/platform/mcp/v1/platform/sobject-mutations` | `https://api.salesforce.com/platform/mcp/v1/sandbox/platform/sobject-mutations` |
| **sobject-deletes** | `https://api.salesforce.com/platform/mcp/v1/platform/sobject-deletes` | `https://api.salesforce.com/platform/mcp/v1/sandbox/platform/sobject-deletes` |
| **sobject-all** | `https://api.salesforce.com/platform/mcp/v1/platform/sobject-all` | `https://api.salesforce.com/platform/mcp/v1/sandbox/platform/sobject-all` |

If the connection fails with valid credentials, confirm that the selected server is enabled and the URL matches the server and org type.

<!-- screenshot: MCP Servers under API Catalog, with the chosen SObject server's enabled toggle visible -->

## Speakeasy setup

### Add the server in Speakeasy {#add-server-in-speakeasy}

1. In the Speakeasy AI Control Plane sidebar, under **Connect**, select **Sources**.
2. Select **Add Source**.

If Salesforce appears in the catalog:

1. Choose **3rd-party server**.
2. On the **MCP Catalog** page, enter `Salesforce` in **Search MCP servers...**.
3. Open the Salesforce entry with **View**.
4. Select **Add**.
5. In the **Add to Project** dialog, select **Add to Project**.

If Salesforce does not appear in the catalog:

1. Choose **Custom remote server**.
2. On the **Add a custom remote MCP server** page, paste the URL recorded in [Enable the selected SObject server](#enable-sobject-server) into **Remote MCP server URL**.
3. Select **Add server**.

Either path creates the hosted MCP Server and opens its **Overview** page.

<!-- screenshot: the Add Source menu open on the Sources page, or Salesforce's catalog entry -->

### Connect your credentials {#connect-speakeasy-credentials}

1. From the server's **Overview**, open **Settings**.
2. Under **Authentication**, select **Configure Manually**.
3. In **Attach Remote Identity Provider**, set **Client Type** to **Manual**.
4. Confirm that **Redirect URI** matches the `{{ gram.oauth.callback_url }}` registered in [Configure OAuth settings](#configure-oauth-settings).
5. Paste the [**Consumer Key**](#copy-consumer-key) into **Client ID**.
6. Leave **Client Secret (optional)** empty.
7. Select **Attach Identity Provider**.

<!-- screenshot: Attach Remote Identity Provider with Client Type, Redirect URI, and the credential labels visible; redact the Client ID -->

This guide covers setup only. For anything beyond it — billing, tool behavior, limits — see [Salesforce's MCP documentation](https://developer.salesforce.com/docs/platform/hosted-mcp-servers/guide/hosted-mcp-servers-overview.html).
