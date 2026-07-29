---
setup_version: 1
---

# Connect Salesforce to the Speakeasy AI Control Plane

Use Salesforce System Administrator credentials for an API-enabled production or sandbox org where Hosted MCP Servers are available. Salesforce documents availability for Enterprise Edition and above. You need authority to create an **External Client App** and enable Hosted MCP Servers.

Sign in to the Salesforce org that will expose its records. Create the credentials in that same org. This guide does not cover scratch orgs.

### Open Salesforce Setup {#open-salesforce-setup}

1. At the top of any Salesforce page, select the setup gear icon.
2. Select **Setup**.

For a lower-edition org:

1. In **Quick Find**, enter `MCP Servers`.
2. Select **MCP Servers** under **API Catalog**.
3. Confirm that Hosted MCP Servers are available in the target org before continuing.

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
9. Leave **Require Proof Key for Code Exchange (PKCE) extension for Supported Authorization Flows** deselected.
10. Leave **Require Secret for Web Server Flow** deselected.
11. Leave **Require Secret for Refresh Token Flow** deselected.
12. Leave all other **Security** options that can be changed without Salesforce support deselected.

<!-- screenshot: the expanded API (Enable OAuth Settings) section with Callback URL, both selected OAuth scopes, and the security selections visible -->

### Create the External Client App {#create-external-client-app}

Select **Create**.

The app can take up to 30 minutes to become operational. If attaching it immediately fails even though the settings are correct, wait for that window before changing the configuration.

<!-- screenshot-exception: Create is a standard action with no distinct configuration state to capture -->

### Copy the Consumer Key {#copy-consumer-key}

1. On the saved External Client App, select **Settings**.
2. Under **OAuth Settings**, select **Consumer Key and Secret**.
3. Complete the Salesforce verification prompt if it appears.
4. Copy **Consumer Key**. You will use it as the Speakeasy **Client ID**.

<!-- screenshot-exception: the credential is sensitive and the screen adds no setup information beyond the exact label; do not capture the key -->

### Enable the selected SObject server {#enable-sobject-server}

Choose the least-privileged server that meets the team's needs:

- `sobject-reads` allows discovery, query, search, and relationship traversal without changing records.
- `sobject-mutations` allows reading, creating, and updating records without deleting them.
- `sobject-deletes` allows identifying and deleting records without creating or updating them.
- `sobject-all` allows creating, reading, updating, deleting, querying, and searching records.

If the ticket does not specify the team's approved read, write, or delete requirements, obtain the server choice from the application or cloud security owner.

1. Return to **Setup**.
2. In **Quick Find**, enter `MCP Servers`.
3. Select **MCP Servers** under **API Catalog**.
4. Find the server whose API ID matches the approved choice.
5. Use the available control to enable that server.
6. Record its URL from the table below, using the production or sandbox form that matches the org.
7. Wait up to two minutes for the server to become active.

| Server | Production URL | Sandbox URL |
| --- | --- | --- |
| `sobject-reads` | `https://api.salesforce.com/platform/mcp/v1/platform/sobject-reads` | `https://api.salesforce.com/platform/mcp/v1/sandbox/platform/sobject-reads` |
| `sobject-mutations` | `https://api.salesforce.com/platform/mcp/v1/platform/sobject-mutations` | `https://api.salesforce.com/platform/mcp/v1/sandbox/platform/sobject-mutations` |
| `sobject-deletes` | `https://api.salesforce.com/platform/mcp/v1/platform/sobject-deletes` | `https://api.salesforce.com/platform/mcp/v1/sandbox/platform/sobject-deletes` |
| `sobject-all` | `https://api.salesforce.com/platform/mcp/v1/platform/sobject-all` | `https://api.salesforce.com/platform/mcp/v1/sandbox/platform/sobject-all` |

If the connection fails with valid credentials, confirm that the selected server is enabled, the URL matches the server and org type, and the org has API access.

<!-- screenshot: MCP Servers under API Catalog, showing the available server list and the control used to enable the chosen SObject server; record the rendered row and control labels -->
