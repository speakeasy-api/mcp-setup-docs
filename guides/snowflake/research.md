---
research_version: 1
slug: snowflake
researched_at: 2026-07-28T23:57:42Z
---

# Snowflake — Research Dossier

## Server facts

- **Scope:** a Snowflake-managed MCP server that exposes one existing Cortex
  Agent through a `CORTEX_AGENT_RUN` tool. SQL execution, Cortex Search,
  Cortex Analyst, generic UDF/stored-procedure tools, and creation or design of
  the Cortex Agent itself are outside this Guide.
- **Remote URL:**
  `https://<account_url>/api/v2/databases/<mcp_database>/schemas/<mcp_schema>/mcp-servers/<mcp_server_name>`.
  Snowflake constructs this account-specific endpoint from the account host
  and MCP server object names. It is a tenanted MCP Server URL: copy the
  account-specific URL produced by External setup into the Speakeasy AI
  Control Plane's Custom remote server form.
- **Transport:** remote HTTP (`streamable-http`). Snowflake documents MCP
  JSON-RPC over HTTP `POST` and supports only non-streaming responses.
- **Authentication:** OAuth 2.0 using a manually registered, confidential
  custom Snowflake OAuth security integration. Snowflake recommends OAuth over
  hardcoded Programmatic Access Tokens and does not support Dynamic Client
  Registration for its managed MCP server.
- **Credentials:** `SYSTEM$SHOW_OAUTH_CLIENT_SECRETS` returns
  `oauth_client_id`, `oauth_client_secret`, and a secondary secret used for
  rotation. This Guide uses the first two values.
- **Existing-agent requirement:** the application owner must supply an
  existing Cortex Agent's database, schema, and agent name. Before creating the
  MCP server, combine them as
  `<cortex_agent_fqn> = <agent_database>.<agent_schema>.<agent_name>`.
  `CORTEX_AGENT_RUN` requires this fully qualified identifier.
- **Session access:** each user authenticates separately. The OAuth session
  uses the user's `DEFAULT_ROLE`; secondary roles are unsupported. Each user
  needs a non-null `DEFAULT_WAREHOUSE`. The default role needs `USAGE` on the
  MCP server, the Cortex Agent and their parent namespaces, `USAGE` on the
  default warehouse, and the privileges required by every object the existing
  agent invokes.
- **Cortex access gate:** the runtime role needs the
  `SNOWFLAKE.CORTEX_AGENT_USER` database role (or the broader
  `SNOWFLAKE.CORTEX_USER` database role). This Guide grants the narrower role.
- **Role separation:** use `ACCOUNTADMIN` only for the OAuth integration, or
  use an organization-approved delegated role with global
  `CREATE INTEGRATION`. Use non-privileged roles for MCP creation and runtime.
  Snowflake blocks `ACCOUNTADMIN`, `SECURITYADMIN`, `GLOBALORGADMIN`, and
  `ORGADMIN` from custom Snowflake OAuth by default; adding one to
  `ALLOWED_ROLES_LIST` does not override that block.
- **Creation/access privileges:** the MCP-server creator needs `CREATE MCP
  SERVER` on the target schema, namespace access, and `USAGE` on the Cortex
  Agent referenced by the server specification. The connecting runtime role
  needs `USAGE` on both the MCP server and Cortex Agent. Access to the MCP
  server alone does not grant access to its tool.
- **Target namespace requirement:** before requesting namespace grants or
  running `CREATE MCP SERVER`, the application owner must provide an existing,
  approved MCP database and schema. If either object does not exist, have the
  Snowflake object/security owner create it through the organization's approved
  process before continuing. Snowflake's managed-MCP documentation says to
  navigate to the desired database and schema but does not prescribe a
  dedicated creation UI for this flow.
- **Agent-tool privileges:** because the agent runs with the connecting user's
  default role, the application/agent owner must also grant that role every
  privilege required by the agent's configured tools. Snowflake specifically
  calls out namespace and object access for Cortex Search services, semantic
  views and their data, functions or procedures, and referenced agents. The
  exact set is agent-specific and must come from the agent owner.
- **Availability:** Snowflake-managed MCP servers and Cortex Agents are not
  available in the People's Republic of China; managed MCP servers are also
  unsupported in government regions.
- **PrivateLink:** SaaS clients use the public MCP URL. PrivateLink accounts
  add `USE_PRIVATELINK_FOR_AUTHORIZATION_ENDPOINT = TRUE` to the OAuth
  integration so browser authorization uses PrivateLink while the token
  endpoint remains publicly reachable.

## Credential flow

Who acts: a Snowflake role/security administrator creates and assigns the
runtime role. The Cortex Agent owner supplies the existing agent's three-part
name and the complete privileges its configured tools require. A role
delegated `CREATE MCP SERVER` creates the server. `ACCOUNTADMIN`, or a
delegated integration-owner role with global `CREATE INTEGRATION`, creates the
OAuth security integration.

What gets created:

1. A non-privileged `<mcp_access_role>` assigned to each connecting user.
2. A Snowflake-managed MCP server with one Cortex Agent tool.
3. A confidential custom OAuth security integration restricted to
   `<mcp_access_role>`.

Keep the role that creates the OAuth security integration selected through
credential retrieval because that role owns the integration. Switch away only
after `SYSTEM$SHOW_OAUTH_CLIENT_SECRETS` succeeds.

| Speakeasy value | Snowflake origin |
| --- | --- |
| Client ID | `oauth_client_id` returned at {#copy-oauth-credentials} |
| Client Secret | `oauth_client_secret` returned at {#copy-oauth-credentials} |

Enter `{{ gram.oauth.callback_url }}` directly as `OAUTH_REDIRECT_URI` at
{#create-oauth-integration}. Snowflake does not support Dynamic Client
Registration, so the manually registered client ID and secret are required.

## Console walkthrough

### Open a Snowflake SQL workspace {#open-snowflake-workspace}

- Sign in at `https://app.snowflake.com`.
- Select **Projects** > **Workspaces**.
- Select **+** beside a folder (or **+ Add New** on first use), then select
  **SQL File**. This opens a blank SQL file as an editor tab.
- Select an available warehouse and the organization-approved role for each
  statement group below. Do not leave `ACCOUNTADMIN` selected after creating
  the OAuth integration.
- For every SQL statement below, replace each complete angle-bracket
  placeholder, including the `<` and `>` characters, with the corresponding
  owner-supplied value. Paste the completed statement into the SQL file,
  select the complete statement, and invoke **Run selected** with
  `Ctrl+Enter` on Windows/Linux or `Command+Return` on macOS. For a block that
  contains multiple statements, select and run each completed statement
  separately.
- Screenshot note: **Projects** > **Workspaces**, the **+** menu with
  **SQL File**, and the role/warehouse context controls.

### Create and assign the MCP access role {#grant-first-connection-access}

- Obtain the approved non-privileged role name, connecting usernames, default
  warehouse, existing Cortex Agent database/schema/name, and the complete
  agent-tool grants from the security and agent owners.
- With `USERADMIN` or a delegated role holding account-level `CREATE ROLE`,
  create the runtime role:

  ```sql
  CREATE ROLE IF NOT EXISTS <mcp_access_role>;
  ```

- With `ACCOUNTADMIN` or the role authorized to grant Snowflake database
  roles, grant the Cortex Agents-only database role:

  ```sql
  GRANT DATABASE ROLE SNOWFLAKE.CORTEX_AGENT_USER
    TO ROLE <mcp_access_role>;
  ```

- With the role that owns `<mcp_access_role>` or holds `MANAGE GRANTS`, assign
  it to every connecting user:

  ```sql
  GRANT ROLE <mcp_access_role> TO USER <username>;
  ```

- With the security/agent owner role, grant warehouse and existing-agent
  access:

  ```sql
  GRANT USAGE ON WAREHOUSE <warehouse_name>
    TO ROLE <mcp_access_role>;

  GRANT USAGE ON DATABASE <agent_database>
    TO ROLE <mcp_access_role>;

  GRANT USAGE ON SCHEMA <agent_database>.<agent_schema>
    TO ROLE <mcp_access_role>;

  GRANT USAGE ON AGENT <agent_database>.<agent_schema>.<agent_name>
    TO ROLE <mcp_access_role>;
  ```

- Have the agent owner grant `<mcp_access_role>` every additional privilege
  required by the objects configured in that agent. Do not infer these grants
  from MCP server access; Snowflake evaluates the agent using the connecting
  user's default role.
- With the role authorized to alter each user, set the defaults:

  ```sql
  ALTER USER <username>
    SET DEFAULT_ROLE = '<mcp_access_role>'
        DEFAULT_WAREHOUSE = '<warehouse_name>';
  ```

- Screenshot note: successful role, database-role, object-grant, and
  user-change results, with identities redacted where policy requires.

### Create the Cortex Agent MCP server {#create-cortex-agent-mcp-server}

- Obtain the approved MCP server database, schema, name, MCP tool name, title,
  and description from the application owner. Confirm the target MCP database
  and schema already exist before requesting grants or running the creation
  SQL. If either is absent, have the Snowflake object/security owner create it
  through the organization's approved process, then retain the resulting
  database and schema names. Snowflake's public managed-MCP page does not name
  a dedicated UI path for creating these namespace objects.
- Obtain the approved
  `<mcp_server_creator_role>` name from the security owner and confirm that
  role is assigned to the Snowflake user who will create the MCP server.
- Have the security owner grant the server-creator role access to the MCP
  namespace and the existing Cortex Agent:

  ```sql
  GRANT USAGE ON DATABASE <mcp_database>
    TO ROLE <mcp_server_creator_role>;

  GRANT USAGE ON SCHEMA <mcp_database>.<mcp_schema>
    TO ROLE <mcp_server_creator_role>;

  GRANT CREATE MCP SERVER ON SCHEMA <mcp_database>.<mcp_schema>
    TO ROLE <mcp_server_creator_role>;

  GRANT USAGE ON DATABASE <agent_database>
    TO ROLE <mcp_server_creator_role>;

  GRANT USAGE ON SCHEMA <agent_database>.<agent_schema>
    TO ROLE <mcp_server_creator_role>;

  GRANT USAGE ON AGENT <agent_database>.<agent_schema>.<agent_name>
    TO ROLE <mcp_server_creator_role>;
  ```

- Before running `CREATE MCP SERVER`, form and record the fully qualified
  Cortex Agent identifier exactly as:
  `<cortex_agent_fqn> = <agent_database>.<agent_schema>.<agent_name>`.
- Switch to `<mcp_server_creator_role>` and create the server:

  ```sql
  CREATE MCP SERVER <mcp_database>.<mcp_schema>.<mcp_server_name>
    FROM SPECIFICATION $$
      tools:
        - title: "<approved_title>"
          name: "<mcp_tool_name>"
          type: "CORTEX_AGENT_RUN"
          identifier: "<cortex_agent_fqn>"
          description: "<approved_description>"
    $$;
  ```

- Retain the exact MCP database, schema, and server name. Snowflake's endpoint
  shape is
  `https://<account_url>/api/v2/databases/<mcp_database>/schemas/<mcp_schema>/mcp-servers/<mcp_server_name>`.
- To obtain the account URL in Snowsight, select your user name, select
  **Connect a tool to Snowflake**, and locate the **Account Details** dialog.
  Copy **Account/Server URL**. For `<account_url>`, use the hostname from that
  copied value without the leading `https://` or a trailing `/`; the MCP
  endpoint template already supplies the scheme.
- Form the account-specific MCP Server URL from that hostname and the retained
  MCP database, schema, and server name, then retain it for
  {#add-server-in-speakeasy}.
- Screenshot note: the approved `CORTEX_AGENT_RUN` specification and
  successful result. The Cortex Agent's three-part identifier should be
  visible; redact organization-sensitive names if policy requires.

### Grant access to the MCP server {#grant-mcp-server-access}

- With the security owner role, grant the runtime role namespace access and
  `USAGE` on the MCP server created at
  {#create-cortex-agent-mcp-server}:

  ```sql
  GRANT USAGE ON DATABASE <mcp_database>
    TO ROLE <mcp_access_role>;

  GRANT USAGE ON SCHEMA <mcp_database>.<mcp_schema>
    TO ROLE <mcp_access_role>;

  GRANT USAGE ON MCP SERVER <mcp_database>.<mcp_schema>.<mcp_server_name>
    TO ROLE <mcp_access_role>;
  ```

- Recovery: if authorization succeeds but initialization fails, confirm the
  user's `DEFAULT_ROLE`, `DEFAULT_WAREHOUSE`, role assignment, and warehouse
  `USAGE`. If the MCP server is visible but the Agent tool cannot run, confirm
  `SNOWFLAKE.CORTEX_AGENT_USER`, Cortex Agent `USAGE`, parent namespace
  `USAGE`, and every privilege required by the agent's configured tools.
- Screenshot note: successful MCP namespace and server grants.

### Create the OAuth integration {#create-oauth-integration}

- Before the command, confirm that the connecting users' `DEFAULT_ROLE` is the
  non-privileged `<mcp_access_role>`. `ACCOUNTADMIN`, `SECURITYADMIN`,
  `GLOBALORGADMIN`, and `ORGADMIN` are setup/admin roles and are blocked from
  custom Snowflake OAuth by default, even when listed in
  `ALLOWED_ROLES_LIST`.
- Obtain the approved integration name and ask the account/network security
  owner whether this Snowflake account uses PrivateLink.
- Switch to `ACCOUNTADMIN`, or an organization-approved delegated role with
  global `CREATE INTEGRATION`, and run:

  ```sql
  CREATE SECURITY INTEGRATION <integration_name>
    TYPE = OAUTH
    OAUTH_CLIENT = CUSTOM
    ENABLED = TRUE
    OAUTH_CLIENT_TYPE = 'CONFIDENTIAL'
    OAUTH_REDIRECT_URI = '{{ gram.oauth.callback_url }}'
    OAUTH_USE_SECONDARY_ROLES = NONE
    ALLOWED_ROLES_LIST = ('<mcp_access_role>');
  ```

- For a PrivateLink account, add
  `USE_PRIVATELINK_FOR_AUTHORIZATION_ENDPOINT = TRUE`.
- An unquoted integration name is stored uppercase. Keep the exact
  integration-owner role selected for {#copy-oauth-credentials}.
- Screenshot note: the statement and successful result; no credential appears.

### Copy the OAuth credentials {#copy-oauth-credentials}

- Still using the role that created and owns the integration, run:

  ```sql
  WITH oauth_secrets AS (
    SELECT PARSE_JSON(
      SYSTEM$SHOW_OAUTH_CLIENT_SECRETS('<INTEGRATION_NAME>')
    ) AS secret_values
  )
  SELECT
    secret_values:oauth_client_id::STRING AS "oauth_client_id",
    secret_values:oauth_client_secret::STRING AS "oauth_client_secret"
  FROM oauth_secrets;
  ```

- Use the uppercase, case-sensitive integration name in single quotes.
- The query parses the returned JSON object and projects the two required
  values into separate named result columns without surrounding JSON quotes.
- Copy the result cell under `oauth_client_id` as **Client ID**.
- Copy the result cell under `oauth_client_secret` as **Client Secret**.
- The query omits `oauth_client_secret_2`; do not use that secondary secret
  for initial setup.
- Store both selected values in the approved password manager, then switch
  away from the integration-owner role.
- Screenshot exception: the result exposes secrets and must not be captured.

## Speakeasy setup

Per-guide values for `doctrine/speakeasy-setup.md`:

- Provider: Snowflake.
- Remote URL fact: the account-specific Snowflake URL template in Server
  facts and `meta.yaml`; External setup forms it at
  {#create-cortex-agent-mcp-server}.
- Transport: `streamable-http`.
- Add-server path: Custom remote server only because the Snowflake MCP Server
  URL is account-specific (`remotes[].tenanted: true`). The path is resolved;
  do not render an alternate add-server path or presence question.
- Authentication Option: manually registered confidential OAuth client.
- OAuth metadata: Snowflake requires the security integration's client ID and
  secret and does not support Dynamic Client Registration. Use
  **Configure Manually**.
- **Client ID** and **Client Secret**: values copied at
  {#copy-oauth-credentials}.
- Redirect URI: `{{ gram.oauth.callback_url }}` registered at
  {#create-oauth-integration}.
- Further reading:
  `https://docs.snowflake.com/en/user-guide/snowflake-cortex/cortex-agents-mcp`.

### Add the server in Speakeasy {#add-server-in-speakeasy}

In the Speakeasy AI Control Plane sidebar, under **Connect**, select
**Sources**, then click **Add Source**.

Choose **Custom remote server**. On the **Add a custom remote MCP server**
page, paste the account-specific URL retained at
{#create-cortex-agent-mcp-server} into **Remote MCP server URL**, then click
**Add server**. This creates the hosted MCP server and opens its **Overview**
page.

Screenshot note: the Add Source menu open on the Sources page, or the
provider's catalog entry.

### Connect your credentials {#connect-speakeasy-credentials}

From the server's **Overview**, open **Settings**. Under **Authentication**,
click **Configure Manually**. In the **Attach Remote Identity Provider**
sheet, set **Client Type** to **Manual**. Confirm the displayed
**Redirect URI** matches the callback registered in Snowflake. Paste the
values from {#copy-oauth-credentials} into **Client ID** and
**Client Secret (optional)**, then click **Attach Identity Provider**.

Screenshot note: the attachment sheet with labels visible and values redacted.

When a client first requests Snowflake access, Snowflake's OAuth flow opens in
a browser. The user signs in with their own Snowflake credentials and consents
to the non-privileged default role. The resulting session uses that user's
`DEFAULT_ROLE`.

This guide covers setup only. For anything beyond it — billing, tool behavior,
limits — see Snowflake's MCP documentation at
`https://docs.snowflake.com/en/user-guide/snowflake-cortex/cortex-agents-mcp`.

## Open questions

None.

## Provenance

### Source inventory

- **Product/admin, SQL, and developer docs — `docs.snowflake.com`:** primary
  managed MCP, Cortex Agent access, OAuth, SQL, grants, account URL, and
  current Workspaces facts.
- **Developer quickstarts — `quickstarts.snowflake.com`:** reviewed the
  managed MCP quickstart. It uses a PAT and a broader demonstration, so the
  current product docs and OAuth assignment take precedence.
- **Support/community — `community.snowflake.com`:** searched; no public
  article added first-connection facts.
- **Indexes:** `https://docs.snowflake.com/llms.txt` and
  `https://docs.snowflake.com/en/user-guide/snowflake-cortex/llms.txt`.

All sources were observed at `2026-07-28T23:57:42Z`.

- `https://docs.snowflake.com/llms.txt` — documentation-property inventory and
  account URL guidance.
- `https://docs.snowflake.com/en/user-guide/snowflake-cortex/llms.txt` —
  Cortex documentation inventory.
- `https://docs.snowflake.com/en/user-guide/snowflake-cortex/cortex-agents-mcp`
  — managed MCP overview; URL, transport, OAuth, role/default-warehouse
  behavior, `CORTEX_AGENT_RUN`, access control, PrivateLink, availability, and
  limitations.
- `https://docs.snowflake.com/en/sql-reference/sql/create-mcp-server` —
  `CORTEX_AGENT_RUN` specification and creator/tool privilege requirements.
- `https://docs.snowflake.com/en/user-guide/snowflake-cortex/cortex-agents-setup`
  — `SNOWFLAKE.CORTEX_AGENT_USER`, default-role behavior, Agent and namespace
  grants, and privileges required by agent tools.
- `https://docs.snowflake.com/en/user-guide/snowflake-cortex/cortex-agents-manage`
  — existing Agent UI location and agent-object context.
- `https://docs.snowflake.com/en/user-guide/oauth-custom`,
  `https://docs.snowflake.com/en/user-guide/oauth-snowflake-overview`, and
  `https://docs.snowflake.com/en/sql-reference/sql/create-security-integration-oauth-snowflake`
  — confidential custom OAuth, `ALLOWED_ROLES_LIST`, secondary-role behavior,
  integration privileges, and privileged-role blocks.
- `https://docs.snowflake.com/en/sql-reference/functions/system_show_oauth_client_secrets`
  — credential keys and uppercase integration-name requirement.
- `https://docs.snowflake.com/en/user-guide/querying-semistructured` —
  parsing JSON text into a `VARIANT`, extracting first-level JSON values into
  separate columns, and casting string values to remove surrounding quotes.
- `https://docs.snowflake.com/en/sql-reference/sql/create-role`,
  `https://docs.snowflake.com/en/sql-reference/sql/grant-role`,
  `https://docs.snowflake.com/en/sql-reference/sql/grant-database-role`, and
  `https://docs.snowflake.com/en/sql-reference/sql/grant-privilege` — runtime
  role creation, assignment, database-role grant, and object grants.
- `https://docs.snowflake.com/en/user-guide/ui-snowsight/workspaces` and
  `https://docs.snowflake.com/en/user-guide/ui-snowsight/workspaces-working`
  — current SQL editor navigation, blank SQL-file behavior, and the
  **Run selected** execution control and keyboard shortcuts.
- `https://docs.snowflake.com/en/user-guide/admin-account-identifier` and
  `https://docs.snowflake.com/en/user-guide/gen-conn-config` — browser path to
  **Account Details**, the **Account/Server URL** field, and preferred
  hostname formatting.
- `https://quickstarts.snowflake.com/guide/getting-started-with-snowflake-mcp-server/index.html`
  — official managed MCP creation and endpoint example; PAT path not used.
- `doctrine/speakeasy-setup.md` — canonical Speakeasy labels and fixed
  anchors.
