---
research_version: 1
slug: snowflake
researched_at: 2026-07-28T22:29:19Z
---

# Snowflake — Research Dossier

## Server facts

- **Primary scope:** a minimal Snowflake-managed MCP server with one
  `SYSTEM_EXECUTE_SQL` tool. It lets an MCP client submit SQL without first
  creating a Cortex Agent. The walkthrough keeps the tool read-only and
  assigns an explicit warehouse.
- **Advanced scope:** Snowflake also supports Cortex Search, Cortex Analyst,
  Cortex Agent, and generic UDF/stored-procedure tools. Those require
  tool-specific objects and grants and are not part of this first-connection
  flow. Use Snowflake's managed MCP server documentation for those designs.
- **Remote URL:**
  `https://<account_url>/api/v2/databases/<database>/schemas/<schema>/mcp-servers/<name>`.
  It is specific to the Snowflake account and MCP server object.
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
  must be assigned that role, the role needs `USAGE` on the MCP server and
  warehouse plus least-privilege access to queried data, and the user needs a
  non-null `DEFAULT_WAREHOUSE`.
- **Role separation:** use `ACCOUNTADMIN` only for the OAuth security
  integration statement in this Guide. Create and grant the non-privileged
  `<mcp_access_role>` with role/security administration, and create the MCP
  server with a role delegated the required object privileges. Never use
  `ACCOUNTADMIN`, `SECURITYADMIN`, `GLOBALORGADMIN`, or `ORGADMIN` as the
  connecting OAuth role. Snowflake blocks those privileged roles by default;
  putting one in `ALLOWED_ROLES_LIST` does not override the block. This Guide
  does not weaken that account security policy.
- **SQL tool behavior:** `SYSTEM_EXECUTE_SQL` defaults to `read_only: true`;
  this Guide sets it explicitly. The runtime role's Snowflake privileges still
  determine which data can be queried. SQL tool responses are truncated at
  250 KB.
- **Creation/access privileges:** the server-creator role needs `CREATE MCP
  SERVER` on the target schema and access to its parent namespace. The runtime
  role needs `USAGE` on the MCP server, warehouse, and relevant databases and
  schemas, plus `SELECT` only on approved tables or views. Agent-backed
  advanced setups additionally need `USAGE` on the Cortex Agent and its
  namespace.
- **Availability:** unavailable in the People's Republic of China and
  unsupported in government regions.
- **PrivateLink:** SaaS clients use the public MCP URL. Accounts using
  PrivateLink set `USE_PRIVATELINK_FOR_AUTHORIZATION_ENDPOINT = TRUE` so
  browser authorization uses PrivateLink while the token endpoint remains
  publicly reachable.

## Credential flow

Who acts: a Snowflake role/security administrator creates and assigns the
runtime role and grants its least-privilege access. A role delegated `CREATE
MCP SERVER` creates the server. `ACCOUNTADMIN` (or an organization-approved
role with global `CREATE INTEGRATION`) is used only for the OAuth security
integration. The data owner supplies the approved query database/schema and
tables or views, MCP object database/schema/name, warehouse, connecting users,
and tool description.

What gets created:

1. A non-privileged `<mcp_access_role>` assigned to each connecting user.
2. A read-only Snowflake MCP server with one SQL execution tool.
3. A confidential custom OAuth security integration restricted to
   `<mcp_access_role>`.

Keep the role that creates the OAuth security integration selected through
credential retrieval. That role owns the integration; in this walkthrough it
is `ACCOUNTADMIN` or the organization-approved delegated integration-owner
role. Switch away only after `SYSTEM$SHOW_OAUTH_CLIENT_SECRETS` succeeds.

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
- Select an available warehouse and the organization-approved role for each
  statement group below. Do not leave `ACCOUNTADMIN` selected after creating
  the OAuth integration.
- Screenshot note: **Projects** > **Workspaces**, the **+** menu with
  **SQL File**, and the role/warehouse context controls.

### Create and assign the MCP access role {#grant-first-connection-access}

- Obtain the approved non-privileged role name, connecting usernames,
  warehouse, query database/schema, and approved tables or views from the
  security and data owners.
- With `USERADMIN` or a delegated role holding account-level `CREATE ROLE`,
  create the role:

  ```sql
  CREATE ROLE IF NOT EXISTS <mcp_access_role>;
  ```

- With the role that owns `<mcp_access_role>` or holds `MANAGE GRANTS`, assign
  it to every connecting user:

  ```sql
  GRANT ROLE <mcp_access_role> TO USER <username>;
  ```

- With the security/data owner role, grant warehouse and query namespace
  access:

  ```sql
  GRANT USAGE ON WAREHOUSE <warehouse_name>
    TO ROLE <mcp_access_role>;

  GRANT USAGE ON DATABASE <query_database>
    TO ROLE <mcp_access_role>;

  GRANT USAGE ON SCHEMA <query_database>.<query_schema>
    TO ROLE <mcp_access_role>;
  ```

- Grant `SELECT` only on the tables or views approved by the data owner. Use
  one of the applicable object-specific forms; do not substitute an entire
  schema unless that broader grant was approved:

  ```sql
  GRANT SELECT ON TABLE <query_database>.<query_schema>.<table_name>
    TO ROLE <mcp_access_role>;

  GRANT SELECT ON VIEW <query_database>.<query_schema>.<view_name>
    TO ROLE <mcp_access_role>;
  ```

- After the role assignment and warehouse grant succeed, use the role that
  owns each user (or is otherwise authorized to alter that user) to set the
  defaults:

  ```sql
  ALTER USER <username>
    SET DEFAULT_ROLE = '<mcp_access_role>'
        DEFAULT_WAREHOUSE = '<warehouse_name>';
  ```

- Screenshot note: successful role, grant, and user-change results, with
  identities redacted where policy requires.

### Create the SQL query MCP server {#create-sql-query-mcp-server}

- Obtain the approved MCP server database, schema, name, SQL tool name, title,
  description, and warehouse from the application/security owner.
- If the approved server-creator role does not already have the required
  access, have the security owner grant it:

  ```sql
  GRANT USAGE ON DATABASE <mcp_database>
    TO ROLE <mcp_server_creator_role>;

  GRANT USAGE ON SCHEMA <mcp_database>.<mcp_schema>
    TO ROLE <mcp_server_creator_role>;

  GRANT CREATE MCP SERVER ON SCHEMA <mcp_database>.<mcp_schema>
    TO ROLE <mcp_server_creator_role>;
  ```

- Switch to `<mcp_server_creator_role>`. Do not use `ACCOUNTADMIN` for this
  step.
- Set the namespace and create a single read-only SQL execution tool:

  ```sql
  USE DATABASE <mcp_database>;
  USE SCHEMA <mcp_schema>;

  CREATE MCP SERVER <server_name>
    FROM SPECIFICATION $$
      tools:
        - name: "<sql_tool_name>"
          type: "SYSTEM_EXECUTE_SQL"
          title: "<approved_title>"
          description: "<approved_description>"
          config:
            read_only: true
            warehouse: "<warehouse_name>"
    $$;
  ```

- Retain the exact MCP database, schema, and server name for the URL.
- For a more complex server using Cortex Agent, Search, Analyst, UDF, stored
  procedure, multiple tools, or write-capable SQL, stop here and follow
  Snowflake's advanced managed MCP server documentation:
  `https://docs.snowflake.com/en/user-guide/snowflake-cortex/cortex-agents-mcp`.
  Those variants require their own tool-specific objects, risk review, and
  grants; for example, an Agent tool requires `USAGE` on its Cortex Agent.
- Screenshot note: the approved statement and successful result, excluding
  sensitive object metadata where policy requires.

### Grant access to the MCP server {#grant-mcp-server-access}

- With the security owner role, grant the runtime role namespace access and
  `USAGE` on the server retained at {#create-sql-query-mcp-server}:

  ```sql
  GRANT USAGE ON DATABASE <mcp_database>
    TO ROLE <mcp_access_role>;

  GRANT USAGE ON SCHEMA <mcp_database>.<mcp_schema>
    TO ROLE <mcp_access_role>;

  GRANT USAGE ON MCP SERVER <mcp_database>.<mcp_schema>.<server_name>
    TO ROLE <mcp_access_role>;
  ```

- Recovery: if authorization succeeds but initialization fails, confirm the
  connecting user's `DEFAULT_ROLE` and `DEFAULT_WAREHOUSE`, role assignment,
  and warehouse `USAGE`. If the SQL tool is unavailable or a query is denied,
  confirm MCP server `USAGE` and the approved database/schema/object grants.
- Screenshot note: successful MCP namespace and server grants.

### Create the OAuth integration {#create-oauth-integration}

- **Callout to render before the OAuth command:** `ACCOUNTADMIN` and
  `SECURITYADMIN` are setup/admin roles, not connecting roles. Snowflake
  blocks `ACCOUNTADMIN`, `SECURITYADMIN`, `GLOBALORGADMIN`, and `ORGADMIN`
  from custom Snowflake OAuth by default, even if a privileged role is added
  to `ALLOWED_ROLES_LIST`. Use `ACCOUNTADMIN` only for this integration setup;
  the connecting user's `DEFAULT_ROLE` must be the non-privileged
  `<mcp_access_role>` from {#grant-first-connection-access}, with MCP server,
  query-data, and warehouse grants. A publicly reported failure shows the
  exact Snowflake message pattern:
  `The role ALL requested has been explicitly blocked for use with this application by an administrator. Please try logging in with a different role, or contact your administrator.`
  If Snowflake names a blocked role, return to
  {#grant-first-connection-access} and {#grant-mcp-server-access}; do not
  broaden or disable the privileged-role block.
- Obtain the approved integration name and confirm whether the account uses
  PrivateLink with the Snowflake account administrator or network security
  owner before constructing the statement.
- Switch to `ACCOUNTADMIN`, or an organization-approved delegated role with
  global `CREATE INTEGRATION`, and run:

  ```sql
  CREATE SECURITY INTEGRATION <integration_name>
    TYPE = OAUTH
    OAUTH_CLIENT = CUSTOM
    ENABLED = TRUE
    OAUTH_CLIENT_TYPE = 'CONFIDENTIAL'
    OAUTH_REDIRECT_URI = '{{ gram.oauth.callback_url }}'
    ALLOWED_ROLES_LIST = ('<mcp_access_role>');
  ```

- Use the organization's approved integration name. An unquoted name is stored
  uppercase; the secrets function requires that case-sensitive uppercase name.
- For PrivateLink, add
  `USE_PRIVATELINK_FOR_AUTHORIZATION_ENDPOINT = TRUE`.
- Keep this exact integration-owner role selected for
  {#copy-oauth-credentials}.
- Screenshot note: the statement and successful result; no credential appears.

### Copy the OAuth credentials {#copy-oauth-credentials}

- Still using the exact role that created and owns the integration
  (`ACCOUNTADMIN` or the delegated integration-owner role), run:

  ```sql
  SELECT SYSTEM$SHOW_OAUTH_CLIENT_SECRETS('<INTEGRATION_NAME>');
  ```

- Use the uppercase integration name in single quotes.
- Copy `oauth_client_id` as **Client ID** and `oauth_client_secret` as
  **Client Secret**. Do not use `oauth_client_secret_2` for initial setup.
- Store both selected values in the approved password manager.
- Switch away from this integration-owner role after the function succeeds.
- Screenshot exception: the result exposes secrets and must not be captured.

### Record the MCP server URL {#record-mcp-server-url}

- Open the account selector and select **View account details**.
- In **Account Details**, copy **Account/Server URL**. Remove `https://` and any
  trailing slash so only its hostname remains.
- Combine that hostname with the MCP object names retained at
  {#create-sql-query-mcp-server}:
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
- Add-server path: catalog only. The forced catalog match is
  `com.pulsemcp.mirror/gram-snowflake`, title `Snowflake`, for query
  `snowflake`. Do not render the Custom remote path or a catalog-presence
  question.
- Authentication Option: manually registered confidential OAuth client.
- OAuth metadata: Snowflake's MCP documentation requires the client ID and
  secret from the security integration and does not support Dynamic Client
  Registration. Use **Configure Manually**.
- **Client ID** and **Client Secret**: values copied at
  {#copy-oauth-credentials}.
- Redirect URI: `{{ gram.oauth.callback_url }}` registered at
  {#create-oauth-integration}.
- Further reading:
  `https://docs.snowflake.com/en/user-guide/snowflake-cortex/cortex-agents-mcp`.

### Add the server in Speakeasy {#add-server-in-speakeasy}

In the Speakeasy AI Control Plane sidebar, under **Connect**, select
**Sources**, then click **Add Source**.

Choose **3rd-party server**. On the **MCP Catalog** page, enter `Snowflake` in
**Search MCP servers...**, open the result with **View**, and click **Add**.
In the **Add to Project** dialog, click **Add to Project**. This creates the
hosted MCP server and opens its **Overview** page.

Screenshot note: the Snowflake catalog result and **Add to Project** dialog.

### Connect your credentials {#connect-speakeasy-credentials}

From the server's **Overview**, open **Settings**. Under **Authentication**,
click **Configure Manually**. In the **Attach Remote Identity Provider**
sheet, set **Client Type** to **Manual**. The sheet shows **Redirect URI** with
a copy button. Confirm **Redirect URI** matches the callback registered in
Snowflake. Paste the values from {#copy-oauth-credentials} into **Client ID**
and **Client Secret (optional)**, then click **Attach Identity Provider**.

Screenshot note: the attachment sheet with labels visible and values redacted.

When a client first requests Snowflake access, Snowflake's OAuth flow opens in
a browser. The user signs in with their own Snowflake credentials and approves
the consent screen. The resulting session uses that user's `DEFAULT_ROLE`.

This guide covers setup only. For anything beyond it — billing, tool behavior,
limits, and advanced or agent-backed MCP server designs — see Snowflake's MCP
documentation at
`https://docs.snowflake.com/en/user-guide/snowflake-cortex/cortex-agents-mcp`.

## Open questions

None.

## Provenance

### Source inventory

- **Product/admin, SQL, and developer docs — `docs.snowflake.com`:** primary
  MCP, OAuth, SQL, grants, account URL, and current Snowsight Workspaces facts.
- **Developer quickstarts — `quickstarts.snowflake.com`:** reviewed the
  managed MCP quickstart. It uses a PAT and broader demo setup, so the current
  product docs and OAuth assignment take precedence.
- **Support/community — `community.snowflake.com`:** searched; no public
  article added setup facts.
- **Public client runtime reports — `github.com/anthropics`:** used only to
  corroborate the exact blocked-role error text; Snowflake documentation is
  authoritative for the privileged-role policy.
- **Indexes:** `https://docs.snowflake.com/llms.txt` and the Snowflake Cortex
  `llms.txt` were reachable.

All sources were observed at `2026-07-28T22:29:19Z`.

- `https://docs.snowflake.com/llms.txt` — documentation-property inventory and
  account URL guidance.
- `https://docs.snowflake.com/en/user-guide/snowflake-cortex/llms.txt` —
  Cortex documentation inventory.
- `https://docs.snowflake.com/en/user-guide/snowflake-cortex/cortex-agents-mcp`
  — managed MCP overview; URL and transport behavior; minimal SQL execution
  tool and read-only/warehouse settings; OAuth; access control; PrivateLink;
  default-role/default-warehouse behavior; advanced tool types; availability;
  SQL response truncation; and limitations.
- `https://docs.snowflake.com/en/sql-reference/sql/create-mcp-server` —
  `SYSTEM_EXECUTE_SQL` specification, creation privileges, and advanced
  Cortex Agent example.
- `https://docs.snowflake.com/en/user-guide/oauth-custom`,
  `https://docs.snowflake.com/en/user-guide/oauth-snowflake-overview`, and
  `https://docs.snowflake.com/en/sql-reference/sql/create-security-integration-oauth-snowflake`
  — custom confidential OAuth integration, `ALLOWED_ROLES_LIST`, integration
  privilege, role behavior, and the default privileged-role block.
- `https://docs.snowflake.com/en/user-guide/security-access-control-privileges`
  — integration `OWNERSHIP` and owner-equivalent administration privileges.
- `https://docs.snowflake.com/en/user-guide/admin-security-privatelink` —
  Snowflake account-administrator responsibility for enabling and verifying
  account PrivateLink configuration.
- `https://github.com/anthropics/claude-code/issues/42419` — public runtime
  report containing the exact “role ... explicitly blocked” Snowflake error;
  used only for the quoted error text.
- `https://docs.snowflake.com/en/sql-reference/sql/create-role` — role creation
  syntax and required account-level privilege.
- `https://docs.snowflake.com/en/sql-reference/sql/grant-role` — assigning a
  role to a user.
- `https://docs.snowflake.com/en/sql-reference/sql/grant-privilege` — `USAGE`
  and `SELECT` grant syntax for the server, warehouse, namespaces, tables, and
  views.
- `https://docs.snowflake.com/en/sql-reference/functions/system_show_oauth_client_secrets`
  — credential keys and uppercase integration-name requirement.
- `https://docs.snowflake.com/en/user-guide/ui-snowsight/workspaces` and
  `https://docs.snowflake.com/en/user-guide/ui-snowsight/workspaces-working`
  — current SQL editor navigation.
- `https://docs.snowflake.com/en/user-guide/admin-account-identifier` and
  `https://docs.snowflake.com/en/user-guide/gen-conn-config` — account details
  navigation, URL, and preferred hostname.
- `https://quickstarts.snowflake.com/guide/getting-started-with-snowflake-mcp-server/index.html`
  — official MCP creation and URL example.
- `doctrine/speakeasy-setup.md` — canonical Speakeasy labels and fixed anchors.
- Pulse catalog observation — forced catalog query `snowflake`; matched
  `com.pulsemcp.mirror/gram-snowflake`, title `Snowflake`. This selects the
  catalog add-server path only; no catalog-specific configuration controls are
  asserted.
