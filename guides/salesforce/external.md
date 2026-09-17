---
setup_version: 1
---

# Connect Salesforce to the Speakeasy AI Control Plane

Use Salesforce System Administrator credentials for an API-enabled production org where Hosted MCP Servers are available. Salesforce documents availability for Enterprise Edition and above. You need authority to install the Speakeasy application or create an **External Client App**, and enable Hosted MCP Servers.

Sign in to the Salesforce org you want to connect. Install or create the app in that same org. This guide does not cover scratch orgs. For a lower-edition org, confirm Hosted MCP availability in [Salesforce Setup](#open-salesforce-setup) before starting either path.

### Open Salesforce Setup {#open-salesforce-setup}

1. At the top of any Salesforce page, select the setup gear icon.
2. Select **Setup**.

For a lower-edition org:

1. In **Quick Find**, enter `MCP Servers`.
2. Select **MCP Servers** under **API Catalog**.
3. Confirm that Hosted MCP Servers are available in the target org before continuing.

<!-- screenshot: the Salesforce page with the setup gear menu open and Setup visible -->

Choose one path: **use Speakeasy's Salesforce app** and finish OAuth with support, or **create your own Salesforce app** and connect it yourself.

## Use Speakeasy's Salesforce app

### Install Speakeasy's Salesforce application {#install-speakeasy-application}

Open this installation URL to install Speakeasy's Salesforce application into the intended org:

```
https://login.salesforce.com/packaging/installPackage.apexp?p0=04tdM000000cNGXQA2
```

<!-- screenshot-exception: no verified installation screen is available; use the exact installation link rather than a fabricated UI description -->

### Contact Speakeasy support to finish OAuth {#contact-speakeasy-support}

After installation, **contact Speakeasy support to finish OAuth setup**. Installation alone does not complete OAuth. Coordinate your selected endpoint and [server activation](#enable-sobject-server) with support. Your next step is with support—not the app-creation walkthrough below.

<!-- screenshot-exception: this is a support handoff, not a documented console UI -->

## Create your own Salesforce app

Before creating the app, choose a server in the [endpoint reference](#endpoint-reference) and confirm its prerequisites. Then create an **External Client App** in the org you want to connect and enable that server.

This path uses the app's **Consumer Key** without a client secret. Salesforce documents this configuration for compatible public clients; it has not been verified with the Speakeasy AI Control Plane.

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
3. In **Callback URL**, enter this value:

   ```
   {{ gram.oauth.callback_url }}
   ```

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

The app can take up to 30 minutes to become operational. If attachment fails immediately, allow that window before retrying.

<!-- screenshot-exception: Create is a standard action with no distinct configuration state to capture -->

### Copy the Consumer Key {#copy-consumer-key}

1. On the saved External Client App, select **Settings**.
2. Under **OAuth Settings**, select **Consumer Key and Secret**.
3. Complete the Salesforce verification prompt if it appears.
4. Copy **Consumer Key**. You will use it as the Speakeasy **Client ID**.

Do not copy the **Consumer Secret** for this path.

<!-- screenshot-exception: the credential is sensitive and the screen adds no setup information beyond the exact label; do not capture the key -->

### Enable the selected MCP server {#enable-sobject-server}

Choose the least-privileged server that meets your team's needs using the endpoint reference below. If you are unsure which capabilities are approved, ask the application or cloud security owner before enabling a server.

1. Return to **Setup**.
2. In **Quick Find**, enter `MCP Servers`.
3. Select **MCP Servers** under **API Catalog**.
4. Find the server whose API ID matches the approved choice.
5. Use the available control to enable that server. For Headless 360, find `headless-360` and select **Activate**.
6. Record its URL from the endpoint reference below.
7. Wait up to two minutes for the server to become active.

<!-- screenshot: MCP Servers under API Catalog, showing the available server list and the control used to enable the chosen MCP server; record the rendered row and control labels -->

If you created your own app, continue to [Speakeasy setup](speakeasy.md#add-server-in-speakeasy) with your selected URL and **Consumer Key**. If you installed Speakeasy's app, continue with Speakeasy support.

## Endpoint reference

The following endpoints are for production orgs. Copy the URL for your selected server.

**SObject Reads (sobject-reads)**

Discovery, query, search, and relationship traversal; no record changes.

```
https://api.salesforce.com/platform/mcp/v1/platform/sobject-reads
```

**SObject Mutations (sobject-mutations)**

Read, create, and update records; no deletes.

```
https://api.salesforce.com/platform/mcp/v1/platform/sobject-mutations
```

**SObject Deletes (sobject-deletes)**

Identify and delete records; no creates or updates.

```
https://api.salesforce.com/platform/mcp/v1/platform/sobject-deletes
```

**SObject All (sobject-all)**

Create, read, update, delete, query, and search records.

```
https://api.salesforce.com/platform/mcp/v1/platform/sobject-all
```

**Data 360 (data360)**

Query data and change customer-data configuration. Requires a Data 360 license, API v66.0+, and **Manage Data 360** for configuration or **View Data 360** for read-only operations.

```
https://api.salesforce.com/platform/mcp/v1/data/data360
```

**Headless 360 (Beta) (platform/headless-360)**

Broad Setup and platform operations, not read-only record access. Available starting July 2026 under Beta Services Terms. Requires API v67.0+, an External Client App with `mcp_api`, and an OAuth client.

```
https://api.salesforce.com/platform/mcp/v1/platform/headless-360
```

**Tableau Next (analytics/tableau-next)**

Semantic-model and analytics access. Confirm the org has the required Tableau Next capabilities.

```
https://api.salesforce.com/platform/mcp/v1/analytics/tableau-next
```

Calls remain subject to the signed-in user's field-level security, object permissions, and sharing rules. If the connection fails with valid credentials, confirm that the selected server is enabled, the URL matches the selected server, and the org has API access.
