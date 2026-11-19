---
setup_version: 1
---

# Set up Datadog

Sign in to Datadog as an administrator of the organization you are connecting; only administrators can open **Organization Settings**. Datadog documents no plan requirement for its MCP Server. Each person who will use the server needs a Datadog account in that organization with the **MCP Read** permission, plus **MCP Write** for tools that change data. The Datadog Standard Role includes both. If your organization uses Datadog's IP allowlist, confirm with its owner that it allows connections from the Speakeasy AI Control Plane, because the allowlist also applies to MCP connections.

### Identify the Datadog site {#identify-datadog-site}

1. Look at the address bar of your signed-in Datadog tab.
2. Find its host below and record the MCP Server endpoint under it. You paste this endpoint into Speakeasy later.

   - US1, `app.datadoghq.com`:

     ```
     https://mcp.datadoghq.com/v1/mcp
     ```

   - US3, `us3.datadoghq.com`:

     ```
     https://mcp.us3.datadoghq.com/v1/mcp
     ```

   - US5, `us5.datadoghq.com`:

     ```
     https://mcp.us5.datadoghq.com/v1/mcp
     ```

   - EU1, `app.datadoghq.eu`:

     ```
     https://mcp.datadoghq.eu/v1/mcp
     ```

   - AP1, `ap1.datadoghq.com`:

     ```
     https://mcp.ap1.datadoghq.com/v1/mcp
     ```

   - AP2, `ap2.datadoghq.com`:

     ```
     https://mcp.ap2.datadoghq.com/v1/mcp
     ```

   - UK1, `uk1.datadoghq.com`:

     ```
     https://mcp.uk1.datadoghq.com/v1/mcp
     ```

If the host is a custom domain, such as `demo.datadoghq.com`, find your site instead:

1. Click your profile avatar in the lower-left corner.
2. Select **My Preferences**. The site URL is listed at the top of the page.
3. Match that site URL to the list above.

If your site is US1-FED (`app.ddog-gov.com`) or US2-FED (`us2.ddog-gov.com`), stop. Datadog does not support its MCP Server on those sites.

<!-- screenshot: the top of My Preferences showing the organization name and site URL, with the organization name obscured -->

### Open the MCP Server settings {#open-mcp-server-settings}

1. Open the account menu at the bottom of the left navigation.
2. Select **Organization Settings**.
3. Select **MCP Server**. This page holds the organization's MCP access settings and redirect URLs.

<!-- screenshot: Organization Settings with MCP Server selected, showing the MCP Access, MCP Write Access, and MCP OAuth Redirect URLs settings -->

### Turn on MCP access {#enable-mcp-access}

1. If **MCP Access** is off, turn it on. While it is off, nobody in the organization can use the MCP Server.
2. To let users run tools that create or change data, such as creating monitors, also turn on **MCP Write Access**. While it is off, Datadog hides those tools from everyone.

<!-- screenshot: the MCP Access and MCP Write Access settings, with MCP Access on -->

### Add the Speakeasy redirect URL {#add-oauth-redirect-url}

1. On the same page, under **MCP OAuth Redirect URLs**, enter this value:

   ```
   {{ gram.oauth.callback_url }}
   ```

2. Select **Add URL**.

<!-- screenshot: MCP OAuth Redirect URLs with the Speakeasy callback URL entered and Add URL visible -->

### Grant MCP permissions to custom roles {#grant-mcp-permissions}

Skip this step if your users hold the Datadog Standard Role, which includes both MCP permissions. For each custom role your users hold:

1. In **Organization Settings**, open **Roles**.
2. Click the role you want to update.
3. Click **Edit Role** (pencil icon).
4. Under the permissions list, select the **MCP Read** checkbox.
5. Select the **MCP Write** checkbox if the role's users should run tools that create or change data.
6. Select any other permissions the role needs for the data users will query, such as **Monitors Read**.
7. Click **Save**.

<!-- screenshot: the role editor with MCP Read and MCP Write selected -->
