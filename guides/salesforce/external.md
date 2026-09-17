---
setup_version: 1
---

# Connect Salesforce to the Speakeasy AI Control Plane

Use Salesforce System Administrator credentials for an API-enabled production or sandbox org where Hosted MCP Servers are available. Salesforce documents availability for Enterprise Edition and above. You need authority to install the Speakeasy application or create an **External Client App**, and enable Hosted MCP Servers.

Sign in to the Salesforce org you want to connect. Install or create the app in that same org. This guide does not cover scratch orgs. For a lower-edition org, confirm Hosted MCP availability in [Salesforce Setup](#open-salesforce-setup) before beginning either method.

Choose one method:

- **Method 1 — Speakeasy application:** [install the application](#install-speakeasy-application), then [contact Speakeasy support](#contact-speakeasy-support) to finish OAuth. Do not follow the own-app credential steps.
- **Method 2 — Your own External Client App:** begin at [Open Salesforce Setup](#open-salesforce-setup), then create the app and copy its **Consumer Key**.

Both methods require an approved endpoint and administrator activation of the [selected MCP server](#enable-sobject-server). For method 1, coordinate activation and OAuth sequencing with Speakeasy support. The endpoint list documents Salesforce URLs, not live-tested Speakeasy compatibility.

### Install Speakeasy's Salesforce application {#install-speakeasy-application}

**Method 1 only.** Install Speakeasy's Salesforce application into the intended org using [login.salesforce.com/packaging/installPackage.apexp?p0=04tdM000000cNGXQA2](https://login.salesforce.com/packaging/installPackage.apexp?p0=04tdM000000cNGXQA2).

<!-- screenshot-exception: no verified installation screen is available; use the exact installation link rather than a fabricated UI description -->

### Contact Speakeasy support to finish OAuth {#contact-speakeasy-support}

After installation, **contact Speakeasy support to finish OAuth setup**. Installation alone does not complete OAuth setup. Coordinate the selected endpoint, org type, and server activation with support; do not create another app or apply the own-app credential instructions below to the installed package.

<!-- screenshot-exception: this is a support handoff, not a documented console UI -->

### Open Salesforce Setup {#open-salesforce-setup}

1. At the top of any Salesforce page, select the setup gear icon.
2. Select **Setup**.

For a lower-edition org:

1. In **Quick Find**, enter `MCP Servers`.
2. Select **MCP Servers** under **API Catalog**.
3. Confirm that Hosted MCP Servers are available in the target org before continuing.

<!-- screenshot: the Salesforce page with the setup gear menu open and Setup visible -->

### Start an External Client App {#start-external-client-app}

**Method 2 only.** Follow this step through [Copy the Consumer Key](#copy-consumer-key) only if you are creating your own app.

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

The app can take up to 30 minutes to become operational. If attaching it immediately fails even though the settings are correct, wait for that window before changing the configuration.

<!-- screenshot-exception: Create is a standard action with no distinct configuration state to capture -->

### Copy the Consumer Key {#copy-consumer-key}

1. On the saved External Client App, select **Settings**.
2. Under **OAuth Settings**, select **Consumer Key and Secret**.
3. Complete the Salesforce verification prompt if it appears.
4. Copy **Consumer Key**. You will use it as the Speakeasy **Client ID**.

Do not copy the **Consumer Secret** for this path.

<!-- screenshot-exception: the credential is sensitive and the screen adds no setup information beyond the exact label; do not capture the key -->

### Enable the selected MCP server {#enable-sobject-server}

**Both methods.** Choose the least-privileged server that meets the team's needs. For method 1, coordinate this step with Speakeasy support:

- `sobject-reads` allows discovery, query, search, and relationship traversal without changing records.
- `sobject-mutations` allows reading, creating, and updating records without deleting them.
- `sobject-deletes` allows identifying and deleting records without creating or updating them.
- `sobject-all` allows creating, reading, updating, deleting, querying, and searching records.

- Data 360 (`data360`) can change customer-data configuration as well as query data. It requires a Data 360 license and API v66.0 or later, with **Manage Data 360** for configuration or **View Data 360** for read-only operations.
- Headless 360 (Beta), API ID `platform/headless-360`, provides broad Setup and platform operations, not read-only record access. It is available starting July 2026 under Beta Services Terms and requires API v67.0 or later, an External Client App with `mcp_api`, and an OAuth client.
- Tableau Next, API ID `analytics/tableau-next`, provides semantic-model and analytics access. Confirm that the target org has the required Tableau Next capabilities before selecting it.

If the ticket does not specify the team's approved records, data-platform, admin, or analytics requirements, obtain the server choice from the application or cloud security owner.

1. Return to **Setup**.
2. In **Quick Find**, enter `MCP Servers`.
3. Select **MCP Servers** under **API Catalog**.
4. Find the server whose API ID matches the approved choice.
5. Use the available control to enable that server. For Headless 360, find `headless-360` and select **Activate**.
6. Record its URL from the list below, using the production or sandbox form that matches the org.
7. Wait up to two minutes for the server to become active.

Data 360's sandbox URL places `/sandbox` after `/data`, unlike the platform and analytics endpoints. Copy the exact URL for your server and org type.

**SObject Reads — production**

```
https://api.salesforce.com/platform/mcp/v1/platform/sobject-reads
```

**SObject Reads — sandbox**

```
https://api.salesforce.com/platform/mcp/v1/sandbox/platform/sobject-reads
```

**SObject Mutations — production**

```
https://api.salesforce.com/platform/mcp/v1/platform/sobject-mutations
```

**SObject Mutations — sandbox**

```
https://api.salesforce.com/platform/mcp/v1/sandbox/platform/sobject-mutations
```

**SObject Deletes — production**

```
https://api.salesforce.com/platform/mcp/v1/platform/sobject-deletes
```

**SObject Deletes — sandbox**

```
https://api.salesforce.com/platform/mcp/v1/sandbox/platform/sobject-deletes
```

**SObject All — production**

```
https://api.salesforce.com/platform/mcp/v1/platform/sobject-all
```

**SObject All — sandbox**

```
https://api.salesforce.com/platform/mcp/v1/sandbox/platform/sobject-all
```

**Data 360 — production**

```
https://api.salesforce.com/platform/mcp/v1/data/data360
```

**Data 360 — sandbox**

```
https://api.salesforce.com/platform/mcp/v1/data/sandbox/data360
```

**Headless 360 (Beta) — production**

```
https://api.salesforce.com/platform/mcp/v1/platform/headless-360
```

**Headless 360 (Beta) — sandbox**

```
https://api.salesforce.com/platform/mcp/v1/sandbox/platform/headless-360
```

**Tableau Next — production**

```
https://api.salesforce.com/platform/mcp/v1/analytics/tableau-next
```

**Tableau Next — sandbox**

```
https://api.salesforce.com/platform/mcp/v1/sandbox/analytics/tableau-next
```

If the connection fails with valid credentials, confirm that the selected server is enabled, the URL matches the server and org type, and the org has API access.

<!-- screenshot: MCP Servers under API Catalog, showing the available server list and the control used to enable the chosen MCP server; record the rendered row and control labels -->
