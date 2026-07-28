---
setup_version: 1
---

# Snowflake setup

Use a Snowflake role/security administrator account to create and assign a non-privileged runtime role. You also need `ACCOUNTADMIN`, or an organization-approved delegated role with global `CREATE INTEGRATION`, for the OAuth integration only. Obtain the connecting usernames, default warehouse, approved MCP server object names, and an existing Cortex Agent's database, schema, name, and complete agent-tool grants from the security, application, and agent owners. Sign in at `https://app.snowflake.com`.

Snowflake-managed MCP servers and Cortex Agents are unavailable in the People's Republic of China. Snowflake-managed MCP servers are also unsupported in government regions.

### Open a Snowflake SQL workspace {#open-snowflake-workspace}

1. Select **Projects** > **Workspaces**.
2. Select **+** beside a folder, or select **+ Add New** on first use.
3. Select **SQL File**.
4. Select the organization-approved role for the statement group you are running.
5. Select an available warehouse.

<!-- screenshot: Projects > Workspaces, the + menu with SQL File, and the role/warehouse context controls -->

### Create and assign the MCP access role {#grant-first-connection-access}

1. Obtain the approved non-privileged role name, connecting usernames, default warehouse, existing Cortex Agent database, schema, and name, and complete agent-tool grants from the security and agent owners.
2. With `USERADMIN` or a delegated role holding account-level `CREATE ROLE`, run:

   ```sql
   CREATE ROLE IF NOT EXISTS <mcp_access_role>;
   ```

3. With `ACCOUNTADMIN` or the role authorized to grant Snowflake database roles, run:

   ```sql
   GRANT DATABASE ROLE SNOWFLAKE.CORTEX_AGENT_USER
     TO ROLE <mcp_access_role>;
   ```

4. With the role that owns `<mcp_access_role>` or holds `MANAGE GRANTS`, run this statement for each connecting user:

   ```sql
   GRANT ROLE <mcp_access_role> TO USER <username>;
   ```

5. With the security or agent owner role, run:

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

6. Have the agent owner grant `<mcp_access_role>` every additional privilege required by the objects configured in the existing Cortex Agent.
7. With the role authorized to alter each user, run:

   ```sql
   ALTER USER <username>
     SET DEFAULT_ROLE = '<mcp_access_role>'
         DEFAULT_WAREHOUSE = '<warehouse_name>';
   ```

<!-- screenshot: successful role, database-role, object-grant, and user-change results, with identities redacted where policy requires -->

### Create the Cortex Agent MCP server {#create-cortex-agent-mcp-server}

1. Obtain the approved MCP server database, schema, and name, and the MCP tool name, title, and description from the application owner.
2. Have the security owner grant the server-creator role access to the MCP namespace and existing Cortex Agent:

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

3. Form and record the fully qualified Cortex Agent identifier as `<cortex_agent_fqn> = <agent_database>.<agent_schema>.<agent_name>`.
4. Switch to `<mcp_server_creator_role>`.
5. Run:

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

6. Retain the exact MCP database, schema, and server name.

<!-- screenshot: the approved CORTEX_AGENT_RUN specification and successful result, with the Cortex Agent's three-part identifier visible and organization-sensitive names redacted where policy requires -->

### Grant access to the MCP server {#grant-mcp-server-access}

With the security owner role, run:

```sql
GRANT USAGE ON DATABASE <mcp_database>
  TO ROLE <mcp_access_role>;

GRANT USAGE ON SCHEMA <mcp_database>.<mcp_schema>
  TO ROLE <mcp_access_role>;

GRANT USAGE ON MCP SERVER <mcp_database>.<mcp_schema>.<mcp_server_name>
  TO ROLE <mcp_access_role>;
```

If authorization succeeds but initialization fails, confirm the user's `DEFAULT_ROLE`, `DEFAULT_WAREHOUSE`, role assignment, and warehouse `USAGE`. If the MCP server is visible but the Agent tool cannot run, confirm `SNOWFLAKE.CORTEX_AGENT_USER`, Cortex Agent `USAGE`, parent namespace `USAGE`, and every privilege required by the agent's configured tools.

<!-- screenshot: successful MCP namespace and server grants -->

### Create the OAuth integration {#create-oauth-integration}

> **Before you continue:** Confirm that each connecting user's `DEFAULT_ROLE` is the non-privileged `<mcp_access_role>`. Snowflake blocks `ACCOUNTADMIN`, `SECURITYADMIN`, `GLOBALORGADMIN`, and `ORGADMIN` from custom Snowflake OAuth by default, even when listed in `ALLOWED_ROLES_LIST`.

1. Obtain the approved integration name.
2. Ask the account or network security owner whether the Snowflake account uses PrivateLink.
3. Switch to `ACCOUNTADMIN`, or an organization-approved delegated role with global `CREATE INTEGRATION`.
4. For a PrivateLink account, add `USE_PRIVATELINK_FOR_AUTHORIZATION_ENDPOINT = TRUE` on a new line immediately before `ALLOWED_ROLES_LIST`.
5. Run:

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

6. Keep this exact integration-owner role selected for [Copy the OAuth credentials](#copy-oauth-credentials).

An unquoted integration name is stored in uppercase. Retain that case-sensitive uppercase name for the next step.

<!-- screenshot: the statement and successful result; no credential appears -->

### Copy the OAuth credentials {#copy-oauth-credentials}

Do not capture the result because it exposes secrets.

1. Still using the role that created and owns the integration, run:

   ```sql
   SELECT SYSTEM$SHOW_OAUTH_CLIENT_SECRETS('<INTEGRATION_NAME>');
   ```

2. Use the uppercase, case-sensitive integration name in single quotes.
3. Copy `oauth_client_id` as **Client ID**.
4. Copy `oauth_client_secret` as **Client Secret**.
5. Store both values in the approved password manager.
6. Switch away from the integration-owner role.

Do not use `oauth_client_secret_2` for initial setup.

<!-- screenshot-exception: the result exposes secrets and must not be captured -->
