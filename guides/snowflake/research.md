---
research_version: 1
slug: snowflake
researched_at: 2026-07-28T22:17:09Z
---

# Snowflake — Research Dossier

## Server facts

- **Scope:** Snowflake-managed MCP servers, specifically a server exposing an
  existing Cortex Agent through a `CORTEX_AGENT_RUN` tool. This Guide does not
  cover Snowflake's MCP Connectors feature or other Snowflake MCP tool types.
- **Remote URL:**
  `https://<account_url>/api/v2/databases/<database>/schemas/<schema>/mcp-servers/<name>`.
  It is specific to the Snowflake account and MCP object.
- **Transport:** remote HTTP (`streamable-http`). Snowflake documents MCP
  JSON-RPC over HTTP `POST` and supports only non-streaming responses.
- **Authentication:** OAuth 2.0 using a manually registered confidential
  Snowflake OAuth security integration. Snowflake recommends OAuth instead of
  hardcoded Programmatic Access Tokens. Dynamic Client Registration is not
  supported.
- **Credentials:** `SYSTEM$SHOW_OAUTH_CLIENT_SECRETS` returns
  `oauth_client_id`, `oauth_client_secret`, and a secondary secret for
  rotation. This Guide uses the first two values.
- **Session access:** each user authenticates separately. The OAuth session
  uses the user's `DEFAULT_ROLE`; secondary roles are unsupported. The user
  must be assigned that role, the role needs `USAGE` on the selected warehouse,
  and the user needs a non-null `DEFAULT_WAREHOUSE`.
- **Role separation:** use an administrator role such as `ACCOUNTADMIN` only
  to create the security integration and perform other setup that requires it.
  Use a separate, non-privileged `<mcp_access_role>` as every connecting user's
  runtime `DEFAULT_ROLE`. Snowflake blocks `ACCOUNTADMIN`, `SECURITYADMIN`,
  `GLOBALORGADMIN`, and `ORGADMIN` from Snowflake OAuth authentication by
  default; adding one to `ALLOWED_ROLES_LIST` does not override that default
  block.
- **Privileges:** the connecting role needs `USAGE` on the MCP server and
  privileges on each underlying tool. A Cortex Agent tool requires `USAGE` on
  the Agent's parent database and schema and on the referenced Cortex Agent.
  Creating the OAuth integration requires `ACCOUNTADMIN` or global
  `CREATE INTEGRATION`.
- **Availability:** unavailable in the People's Republic of China and
  unsupported in government regions.
- **PrivateLink:** SaaS clients use the public MCP URL. Accounts using
  PrivateLink set `USE_PRIVATELINK_FOR_AUTHORIZATION_ENDPOINT = TRUE` so
  browser authorization uses PrivateLink while the token endpoint remains
  publicly reachable.

## Credential flow

Who acts: a Snowflake administrator uses `ACCOUNTADMIN` or delegated
privileges for setup commands. The application or data owner supplies the
approved Cortex Agent's database, schema, and name; the MCP server's target
database, schema, and name; a non-privileged runtime role; the warehouse; and
the grants. The setup role and runtime role are deliberately different:
`ACCOUNTADMIN` can create the OAuth security integration, but it must not be
the connecting user's `DEFAULT_ROLE`.

What gets created:

1. A Snowflake MCP server object referencing the approved Cortex Agent.
2. A confidential custom OAuth security integration.

| Speakeasy value | Snowflake origin |
| --- | --- |
| Client ID | `oauth_client_id` returned at {#copy-oauth-credentials} |
| Client Secret | `oauth_client_secret` returned at {#copy-oauth-credentials} |

Enter `{{ gram.oauth.callback_url }}` directly as `OAUTH_REDIRECT_URI` at
{#create-oauth-integration}. Assemble the account-specific MCP URL at
{#record-mcp-server-url}. Snowflake does not support Dynamic Client
Registration, so the manually registered client ID and secret are required.

## Console walkthrough

### Open a Snowflake SQL workspace {#open-snowflake-workspace}

- Sign in at `https://app.snowflake.com`.
- Select **Projects** > **Workspaces**.
- Select **+** beside a folder (or **+ Add New** on first use), then select
  **SQL File**.
- Select the administrator role and an available warehouse as the execution
  context.
- Screenshot note: **Projects** > **Workspaces**, the **+** menu with
  **SQL File**, and the context controls.

### Create the Cortex Agent MCP server {#create-cortex-agent-mcp-server}

- Obtain the approved MCP server database, schema, and name; Cortex Agent
  database, schema, and name; tool name; title; and description from the
  application or data owner. Form the Cortex Agent fully qualified name as
  `<agent_database>.<agent_schema>.<agent_name>`.
- In the SQL file, set the exact namespace, then create the server:

  ```sql
  USE DATABASE <database>;
  USE SCHEMA <schema>;

  CREATE MCP SERVER <server_name>
    FROM SPECIFICATION $$
      tools:
        - name: "<tool_name>"
          type: "CORTEX_AGENT_RUN"
          identifier: "<cortex_agent_fqn>"
          description: "<approved_description>"
          title: "<approved_title>"
    $$;
  ```

- The role needs `CREATE MCP SERVER` and `USAGE` on the target schema, a
  privilege on the parent database, and `USAGE` on the Cortex Agent.
- Retain the exact database, schema, and server name for the URL.
- Screenshot note: the approved statement and successful result, excluding
  sensitive data from metadata.

### Grant first-connection access {#grant-first-connection-access}

- If the approved non-privileged role does not exist, have a role administrator
  create it. `CREATE ROLE` requires the account-level `CREATE ROLE` privilege,
  held by `USERADMIN` by default:

  ```sql
  CREATE ROLE IF NOT EXISTS <mcp_access_role>;
  ```

- Have the security owner grant the connecting role `USAGE` on the MCP server.
  Form the server identifier from the target database, target schema, and
  server name retained at {#create-cortex-agent-mcp-server}:

  ```sql
  GRANT USAGE ON MCP SERVER <database>.<schema>.<server_name>
    TO ROLE <mcp_access_role>;
  ```

- Have the security owner grant the connecting role `USAGE` on the Cortex
  Agent's parent database and schema, using the Agent database and schema
  obtained at {#create-cortex-agent-mcp-server}:

  ```sql
  GRANT USAGE ON DATABASE <agent_database>
    TO ROLE <mcp_access_role>;

  GRANT USAGE ON SCHEMA <agent_database>.<agent_schema>
    TO ROLE <mcp_access_role>;
  ```

- Have the security owner grant the connecting role `USAGE` on the Cortex
  Agent:

  ```sql
  GRANT USAGE ON AGENT <agent_database>.<agent_schema>.<agent_name>
    TO ROLE <mcp_access_role>;
  ```

- Have the security owner grant the connecting role every downstream
  privilege the Agent needs.
- Have the security owner grant the connecting role `USAGE` on the selected
  warehouse:

  ```sql
  GRANT USAGE ON WAREHOUSE <warehouse_name> TO ROLE <mcp_access_role>;
  ```

- For each connecting user, have the security owner assign the connecting role:

  ```sql
  GRANT ROLE <mcp_access_role> TO USER <username>;
  ```

- After the role assignment and warehouse grant succeed, set that user's
  defaults:

  ```sql
  ALTER USER <username>
    SET DEFAULT_ROLE = '<mcp_access_role>'
        DEFAULT_WAREHOUSE = '<warehouse_name>';
  ```

- Recovery: if authorization succeeds but initialization fails, confirm
  `DEFAULT_WAREHOUSE` is set and its warehouse grants `USAGE` to the connecting
  role. If tools are unavailable, confirm the user has `DEFAULT_ROLE` assigned
  and that role has all MCP server, Agent parent database and schema, Agent,
  and downstream privileges.
- Screenshot note: successful grant and user-change results, with identities
  redacted where policy requires.

### Create the OAuth integration {#create-oauth-integration}

- **Role separation callout (render before any OAuth command):** use
  `ACCOUNTADMIN` or a delegated role with `CREATE INTEGRATION` to run the setup
  statement below, but do not use `ACCOUNTADMIN` or `SECURITYADMIN` as a
  connecting user's runtime `DEFAULT_ROLE`. Snowflake OAuth blocks those roles
  by default (along with `GLOBALORGADMIN` and `ORGADMIN`). If a blocked role is
  selected, authorization can fail with:
  `The role <role_name> requested has been explicitly blocked for use with this application by an administrator. Please try logging in with a different role, or contact your administrator.`
  Return to {#grant-first-connection-access}, assign a non-privileged
  `<mcp_access_role>`, grant it the required MCP server, Cortex Agent, and
  warehouse access, and set it as the user's `DEFAULT_ROLE`.
- Run:

  ```sql
  CREATE SECURITY INTEGRATION <integration_name>
    TYPE = OAUTH
    OAUTH_CLIENT = CUSTOM
    ENABLED = TRUE
    OAUTH_CLIENT_TYPE = 'CONFIDENTIAL'
    OAUTH_REDIRECT_URI = '{{ gram.oauth.callback_url }}';
  ```

- Use the organization's approved integration name. An unquoted name is stored
  uppercase; the secrets function requires that case-sensitive uppercase name.
- For PrivateLink, add
  `USE_PRIVATELINK_FOR_AUTHORIZATION_ENDPOINT = TRUE`.
- Screenshot note: the statement and successful result; no credential appears.

### Copy the OAuth credentials {#copy-oauth-credentials}

- Run:

  ```sql
  SELECT SYSTEM$SHOW_OAUTH_CLIENT_SECRETS('<INTEGRATION_NAME>');
  ```

- Use the uppercase integration name in single quotes.
- Copy `oauth_client_id` as **Client ID** and `oauth_client_secret` as
  **Client Secret**. Do not use `oauth_client_secret_2` for initial setup.
- Store both selected values in the approved password manager.
- Screenshot exception: the result exposes secrets and must not be captured.

### Record the MCP server URL {#record-mcp-server-url}

- Open the account selector and select **View account details**.
- In **Account Details**, copy **Account/Server URL**. Remove `https://` and any
  trailing slash so only its hostname remains.
- Combine that hostname with the retained object names:
  `https://<account_url>/api/v2/databases/<database>/schemas/<schema>/mcp-servers/<name>`.
- Example shape only:
  `https://myorg-myaccount.snowflakecomputing.com/api/v2/databases/MY_DB/schemas/MY_SCHEMA/mcp-servers/MY_SERVER`.
- Prefer Snowflake's organization-account hostname. Some clients require
  hyphens instead of underscores in the hostname.
- Use the public URL even for a PrivateLink account.
- Screenshot note: **Account Details** showing the account identifier and
  **Account/Server URL**; redact both values.

## Speakeasy setup

Per-guide values for `doctrine/speakeasy-setup.md`:

- Provider: Snowflake.
- Remote URL: the account-specific URL from {#record-mcp-server-url}.
- Transport: `streamable-http`.
- Add-server path: catalog only. The resolved match is
  `com.pulsemcp.mirror/gram-snowflake`, title `Snowflake`, for query
  `snowflake`. Do not render the Custom remote path or a catalog-presence
  question.
- Authentication Option: manually registered confidential OAuth client.
- OAuth metadata: Snowflake's MCP documentation requires the client ID and
  secret from the security integration and does not document a discoverable
  client setup for this path. Use **Configure Manually**.
- **Client ID** and **Client Secret**: values copied at
  {#copy-oauth-credentials}.
- Redirect URI: `{{ gram.oauth.callback_url }}` registered at
  {#create-oauth-integration}.
- Further reading:
  `https://docs.snowflake.com/en/user-guide/snowflake-cortex/cortex-agents-mcp`.

### Add the server in Speakeasy {#add-server-in-speakeasy}

In the Speakeasy AI Control Plane sidebar, under **Connect**, select
**Sources**, then click **Add Source**.

Choose **3rd-party server**. On **MCP Catalog**, enter `Snowflake` in
**Search MCP servers...**, open the result with **View**, and click **Add**.
In **Add to Project**, click **Add to Project**. This creates the hosted MCP
server and opens its **Overview** page.

Screenshot note: the Snowflake catalog result and **Add to Project** dialog.

### Connect your credentials {#connect-speakeasy-credentials}

From **Overview**, open **Settings**. Under **Authentication**, click
**Configure Manually**. In **Attach Remote Identity Provider**, set
**Client Type** to **Manual**. The sheet shows **Redirect URI** with a copy
button. Confirm **Redirect URI** matches the callback registered in Snowflake.
Paste the values from {#copy-oauth-credentials} into **Client ID** and
**Client Secret (optional)**, then click **Attach Identity Provider**.

Screenshot note: the attachment sheet with labels visible and values redacted.

When a client first requests Snowflake access, Snowflake's OAuth flow opens in
a browser. The user signs in with their own Snowflake credentials and approves
the consent screen. The resulting session uses that user's `DEFAULT_ROLE`.

This guide covers setup only. For anything beyond it — billing, tool behavior,
limits — see Snowflake's MCP documentation at
`https://docs.snowflake.com/en/user-guide/snowflake-cortex/cortex-agents-mcp`.

## Open questions

None.

## Provenance

### Source inventory

- **Product/admin, SQL, and developer docs — `docs.snowflake.com`:** primary
  MCP, OAuth, SQL, account URL, and current Snowsight Workspaces facts.
- **Developer quickstarts — `quickstarts.snowflake.com`:** reviewed the
  managed MCP quickstart. It uses a PAT and legacy Worksheet wording, so the
  current product docs and OAuth assignment take precedence.
- **Support/community — `community.snowflake.com`:** searched; no public
  article added setup facts.
- **Indexes:** `https://docs.snowflake.com/llms.txt` and the Snowflake Cortex
  `llms.txt` were reachable.

All sources were observed at `2026-07-28T22:17:09Z`.

- `https://docs.snowflake.com/llms.txt` — documentation inventory and account
  URL guidance.
- `https://docs.snowflake.com/en/user-guide/snowflake-cortex/llms.txt` —
  Cortex inventory and distinction from MCP Connectors.
- `https://docs.snowflake.com/en/user-guide/snowflake-cortex/cortex-agents-mcp`
  — URL, transport behavior, OAuth, access, PrivateLink, role/warehouse
  behavior, availability, and limitations.
- `https://docs.snowflake.com/en/sql-reference/sql/create-mcp-server` —
  Cortex Agent tool specification and creation privileges.
- `https://docs.snowflake.com/en/user-guide/oauth-custom` and
  `https://docs.snowflake.com/en/sql-reference/sql/create-security-integration-oauth-snowflake`
  — OAuth integration privilege, confidential client, redirect behavior,
  role allow/block lists, and the default block on privileged OAuth roles.
- `https://docs.snowflake.com/en/user-guide/oauth-snowflake-overview` — OAuth
  role selection, the default privileged-role block, and the
  `OAUTH_AUTHORIZE_INVALID_SCOPE` failure category.
- `https://docs.snowflake.com/en/sql-reference/sql/create-role` — optional
  runtime-role creation syntax and required account-level privilege.
- `https://docs.snowflake.com/en/sql-reference/sql/grant-role` — exact syntax
  for assigning the connecting role to a user.
- `https://docs.snowflake.com/en/sql-reference/sql/grant-privilege` — exact
  syntax and supported `USAGE` privileges for MCP server and warehouse grants
  to a role.
- `https://docs.snowflake.com/en/user-guide/snowflake-cortex/cortex-agents-setup`
  — exact `USAGE` grant syntax for a Cortex Agent's parent database, parent
  schema, and fully qualified Agent identifier.
- `https://docs.snowflake.com/en/sql-reference/functions/system_show_oauth_client_secrets`
  — exact credential keys and uppercase integration-name requirement.
- `https://docs.snowflake.com/en/user-guide/ui-snowsight/workspaces` and
  `https://docs.snowflake.com/en/user-guide/ui-snowsight/workspaces-working`
  — current SQL editor navigation.
- `https://docs.snowflake.com/en/user-guide/admin-account-identifier` and
  `https://docs.snowflake.com/en/user-guide/gen-conn-config` — account details
  navigation, URL, and preferred hostname.
- `https://quickstarts.snowflake.com/guide/getting-started-with-snowflake-mcp-server/index.html`
  — official MCP creation and URL example.
- `doctrine/speakeasy-setup.md` — canonical Speakeasy labels and anchors.
- Pulse catalog observation — query `snowflake`; matched
  `com.pulsemcp.mirror/gram-snowflake`, title `Snowflake`, status `present`.
  This observation selects the catalog add-server path only; no
  catalog-specific configuration controls are asserted.
