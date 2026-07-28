---
setup_version: 1
---

# Snowflake setup

Use a Snowflake role/security administrator account to create and assign a non-privileged runtime role. You also need `ACCOUNTADMIN`, or an organization-approved role with global `CREATE INTEGRATION`, for the OAuth integration only. The server-creator role needs `CREATE MCP SERVER` on the target schema and access to its parent namespace. Obtain the approved connecting users, warehouse, query objects, MCP server objects, and SQL tool details from the security, data, and application owners. Sign in at `https://app.snowflake.com`.

Snowflake-managed MCP servers are unavailable in the People's Republic of China and unsupported in government regions.

### Open a Snowflake SQL workspace {#open-snowflake-workspace}

1. Select **Projects** > **Workspaces**.
2. Select **+** beside a folder, or select **+ Add New** on first use.
3. Select **SQL File**.
4. Select the organization-approved role for the statement group you are running.
5. Select an available warehouse.

<!-- screenshot: Projects > Workspaces, the + menu with SQL File, and the role/warehouse context controls -->

### Create and assign the MCP access role {#grant-first-connection-access}

1. Obtain the approved non-privileged role name, connecting usernames, warehouse, query database and schema, and tables or views from the security and data owners.
2. With `USERADMIN` or a delegated role holding account-level `CREATE ROLE`, run:

   ```sql
   CREATE ROLE IF NOT EXISTS <mcp_access_role>;
   ```

3. With the role that owns `<mcp_access_role>` or holds `MANAGE GRANTS`, run this statement for each connecting user:

   ```sql
   GRANT ROLE <mcp_access_role> TO USER <username>;
   ```

4. With the security or data owner role, run:

   ```sql
   GRANT USAGE ON WAREHOUSE <warehouse_name>
     TO ROLE <mcp_access_role>;

   GRANT USAGE ON DATABASE <query_database>
     TO ROLE <mcp_access_role>;

   GRANT USAGE ON SCHEMA <query_database>.<query_schema>
     TO ROLE <mcp_access_role>;
   ```

5. Grant `SELECT` only on each table or view approved by the data owner, using the applicable statement:

   ```sql
   GRANT SELECT ON TABLE <query_database>.<query_schema>.<table_name>
     TO ROLE <mcp_access_role>;

   GRANT SELECT ON VIEW <query_database>.<query_schema>.<view_name>
     TO ROLE <mcp_access_role>;
   ```

Do not grant the entire schema unless the data owner approved that broader access.

6. After the role assignment and warehouse grant succeed, use the role that owns each user, or is otherwise authorized to alter that user, to run:

   ```sql
   ALTER USER <username>
     SET DEFAULT_ROLE = '<mcp_access_role>'
         DEFAULT_WAREHOUSE = '<warehouse_name>';
   ```

<!-- screenshot: successful role, grant, and user-change results, with identities redacted where policy requires -->

### Create the SQL query MCP server {#create-sql-query-mcp-server}

1. Obtain the approved MCP server database, schema, and name; SQL tool name, title, and description; and warehouse from the application or security owner.
2. If the approved server-creator role does not have the required access, have the security owner run:

   ```sql
   GRANT USAGE ON DATABASE <mcp_database>
     TO ROLE <mcp_server_creator_role>;

   GRANT USAGE ON SCHEMA <mcp_database>.<mcp_schema>
     TO ROLE <mcp_server_creator_role>;

   GRANT CREATE MCP SERVER ON SCHEMA <mcp_database>.<mcp_schema>
     TO ROLE <mcp_server_creator_role>;
   ```

3. Switch to `<mcp_server_creator_role>`. Do not use `ACCOUNTADMIN` for this step.
4. Run:

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

5. Retain the exact MCP database, schema, and server name for the URL.

This creates a minimal MCP server with one read-only SQL query tool; it does not require a Cortex Agent. For a server using Cortex Agent, Search, Analyst, UDF, stored procedure, multiple tools, or write-capable SQL, follow [Snowflake's managed MCP server documentation](https://docs.snowflake.com/en/user-guide/snowflake-cortex/cortex-agents-mcp). Those designs require their own tool-specific objects, risk review, and grants.

<!-- screenshot: the approved statement and successful result, excluding sensitive object metadata where policy requires -->

### Grant access to the MCP server {#grant-mcp-server-access}

With the security owner role, run:

```sql
GRANT USAGE ON DATABASE <mcp_database>
  TO ROLE <mcp_access_role>;

GRANT USAGE ON SCHEMA <mcp_database>.<mcp_schema>
  TO ROLE <mcp_access_role>;

GRANT USAGE ON MCP SERVER <mcp_database>.<mcp_schema>.<server_name>
  TO ROLE <mcp_access_role>;
```

If authorization succeeds but initialization fails, confirm the connecting user's `DEFAULT_ROLE` and `DEFAULT_WAREHOUSE`, role assignment, and warehouse `USAGE`. If the SQL tool is unavailable or a query is denied, confirm MCP server `USAGE` and the approved database, schema, table, or view grants.

<!-- screenshot: successful MCP namespace and server grants -->

### Create the OAuth integration {#create-oauth-integration}

> **Before you continue:** `ACCOUNTADMIN` and `SECURITYADMIN` are setup/admin roles, not connecting roles. Snowflake blocks `ACCOUNTADMIN`, `SECURITYADMIN`, `GLOBALORGADMIN`, and `ORGADMIN` from custom Snowflake OAuth by default, even when one is in `ALLOWED_ROLES_LIST`. Use `ACCOUNTADMIN` only for this integration setup. The connecting user's `DEFAULT_ROLE` must be the non-privileged `<mcp_access_role>` from [Create and assign the MCP access role](#grant-first-connection-access), with MCP server, query-data, and warehouse grants.
>
> If Snowflake reports `The role ALL requested has been explicitly blocked for use with this application by an administrator. Please try logging in with a different role, or contact your administrator.`, return to [Create and assign the MCP access role](#grant-first-connection-access) and [Grant access to the MCP server](#grant-mcp-server-access). Do not broaden or disable the privileged-role block.

1. Obtain the organization's approved integration name.
2. Confirm whether the account uses PrivateLink with the Snowflake account administrator or network security owner.
3. Switch to `ACCOUNTADMIN`, or an organization-approved delegated role with global `CREATE INTEGRATION`.
4. If the account uses PrivateLink, add `USE_PRIVATELINK_FOR_AUTHORIZATION_ENDPOINT = TRUE` on a new line before the statement's final semicolon.
5. Run:

   ```sql
   CREATE SECURITY INTEGRATION <integration_name>
     TYPE = OAUTH
     OAUTH_CLIENT = CUSTOM
     ENABLED = TRUE
     OAUTH_CLIENT_TYPE = 'CONFIDENTIAL'
     OAUTH_REDIRECT_URI = '{{ gram.oauth.callback_url }}'
     ALLOWED_ROLES_LIST = ('<mcp_access_role>');
   ```

6. Keep this exact integration-owner role selected for the next step.

An unquoted integration name is stored in uppercase. Retain that case-sensitive uppercase name for the next step.

<!-- screenshot: the statement and successful result; no credential appears -->

### Copy the OAuth credentials {#copy-oauth-credentials}

Do not capture the result because it exposes secrets.

1. Still using the exact role that created and owns the integration (`ACCOUNTADMIN` or the delegated integration-owner role), run this statement with the uppercase integration name in single quotes:

   ```sql
   SELECT SYSTEM$SHOW_OAUTH_CLIENT_SECRETS('<INTEGRATION_NAME>');
   ```

2. Copy `oauth_client_id` as **Client ID**.
3. Copy `oauth_client_secret` as **Client Secret**.
4. Store both values in the approved password manager.
5. Switch away from this integration-owner role after the function succeeds.

Do not use `oauth_client_secret_2` for initial setup.

<!-- screenshot-exception: the result exposes secrets and must not be captured -->

### Record the MCP server URL {#record-mcp-server-url}

1. Open the account selector.
2. Select **View account details**.
3. In **Account Details**, copy **Account/Server URL**.
4. Remove `https://` and any trailing slash so only the hostname remains.
5. Combine the hostname with the MCP object names retained in [Create the SQL query MCP server](#create-sql-query-mcp-server):

   `https://<account_url>/api/v2/databases/<database>/schemas/<schema>/mcp-servers/<name>`

Use the public URL even for a PrivateLink account. Prefer Snowflake's organization-account hostname. Some clients require hyphens instead of underscores in the hostname.

Example shape only: `https://myorg-myaccount.snowflakecomputing.com/api/v2/databases/MY_DB/schemas/MY_SCHEMA/mcp-servers/MY_SERVER`.

<!-- screenshot: Account Details showing the account identifier and Account/Server URL; redact both values -->
