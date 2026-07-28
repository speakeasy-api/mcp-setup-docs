---
setup_version: 1
---

# Snowflake setup

Use a Snowflake administrator account with **ACCOUNTADMIN** or a delegated role with global `CREATE INTEGRATION`. From the application or data owner, obtain the approved Cortex Agent's database, schema, and name; the MCP server's target database, schema, and name; the connecting role; the warehouse; and the grant set. The role that creates the MCP server needs `CREATE MCP SERVER`, `USAGE` on the target schema, a privilege on the parent database, and `USAGE` on the Cortex Agent. Sign in at `https://app.snowflake.com`.

Snowflake-managed MCP servers are unavailable in the People's Republic of China and unsupported in government regions.

### Open a Snowflake SQL workspace {#open-snowflake-workspace}

1. Select **Projects** > **Workspaces**.
2. Select **+** beside a folder, or select **+ Add New** on first use.
3. Select **SQL File**.
4. Select the administrator role as the execution context.
5. Select an available warehouse as the execution context.

<!-- screenshot: Projects > Workspaces, the + menu with SQL File, and the context controls -->

### Create the Cortex Agent MCP server {#create-cortex-agent-mcp-server}

1. Obtain the approved MCP server database, schema, and name; Cortex Agent database, schema, and name; tool name; title; and description from the application or data owner.
2. Run this statement after replacing each placeholder with its approved value:

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

3. Retain the exact database, schema, and server name for the MCP server URL.

<!-- screenshot: the approved statement and successful result, excluding sensitive data from metadata -->

### Grant first-connection access {#grant-first-connection-access}

1. Have the security owner run this statement with the target database, target schema, and server name retained in the previous step:

   ```sql
   GRANT USAGE ON MCP SERVER <database>.<schema>.<server_name>
     TO ROLE <mcp_access_role>;
   ```

2. Have the security owner grant access to the Cortex Agent's parent database:

   ```sql
   GRANT USAGE ON DATABASE <agent_database>
     TO ROLE <mcp_access_role>;
   ```

3. Have the security owner grant access to the Cortex Agent's parent schema:

   ```sql
   GRANT USAGE ON SCHEMA <agent_database>.<agent_schema>
     TO ROLE <mcp_access_role>;
   ```

4. Have the security owner grant access to the Cortex Agent:

   ```sql
   GRANT USAGE ON AGENT <agent_database>.<agent_schema>.<agent_name>
     TO ROLE <mcp_access_role>;
   ```

5. Have the security owner grant the connecting role every downstream privilege the Agent needs.
6. Have the security owner run this statement to grant the connecting role access to the selected warehouse:

   ```sql
   GRANT USAGE ON WAREHOUSE <warehouse_name> TO ROLE <mcp_access_role>;
   ```

7. For each connecting user, have the security owner run this statement to assign the connecting role:

   ```sql
   GRANT ROLE <mcp_access_role> TO USER <username>;
   ```

8. After the role assignment and warehouse grant succeed, run this statement for that user:

   ```sql
   ALTER USER <username>
     SET DEFAULT_ROLE = '<mcp_access_role>'
         DEFAULT_WAREHOUSE = '<warehouse_name>';
   ```

If authorization succeeds but initialization fails, confirm that `DEFAULT_WAREHOUSE` is set and its warehouse grants `USAGE` to the connecting role. If tools are unavailable, confirm that the user has `DEFAULT_ROLE` assigned and that role has all MCP server, Agent parent database and schema, Agent, and downstream privileges.

<!-- screenshot: successful grant and user-change results, with identities redacted where policy requires -->

### Create the OAuth integration {#create-oauth-integration}

1. Obtain the organization's approved integration name.
2. For a PrivateLink account, add `USE_PRIVATELINK_FOR_AUTHORIZATION_ENDPOINT = TRUE` on a new line before the statement's final semicolon.
3. Run the statement:

   ```sql
   CREATE SECURITY INTEGRATION <integration_name>
     TYPE = OAUTH
     OAUTH_CLIENT = CUSTOM
     ENABLED = TRUE
     OAUTH_CLIENT_TYPE = 'CONFIDENTIAL'
     OAUTH_REDIRECT_URI = '{{ gram.oauth.callback_url }}';
   ```

An unquoted integration name is stored in uppercase. Retain that case-sensitive uppercase name for the next step.

<!-- screenshot: the statement and successful result; no credential appears -->

### Copy the OAuth credentials {#copy-oauth-credentials}

1. Run this statement with the uppercase integration name in single quotes:

   ```sql
   SELECT SYSTEM$SHOW_OAUTH_CLIENT_SECRETS('<INTEGRATION_NAME>');
   ```

2. Copy `oauth_client_id` as **Client ID**.
3. Copy `oauth_client_secret` as **Client Secret**.
4. Store both values in the approved password manager.

Do not use `oauth_client_secret_2` for initial setup.

<!-- screenshot-exception: the result exposes secrets and must not be captured -->

### Record the MCP server URL {#record-mcp-server-url}

1. Open the account selector.
2. Select **View account details**.
3. In **Account Details**, copy **Account/Server URL**.
4. Remove `https://` and any trailing slash so only the hostname remains.
5. Combine the hostname with the database, schema, and server name you retained:

   `https://<account_url>/api/v2/databases/<database>/schemas/<schema>/mcp-servers/<name>`

Use the public URL even for a PrivateLink account. Prefer Snowflake's organization-account hostname. Some clients require hyphens instead of underscores in the hostname.

Example shape only: `https://myorg-myaccount.snowflakecomputing.com/api/v2/databases/MY_DB/schemas/MY_SCHEMA/mcp-servers/MY_SERVER`.

<!-- screenshot: Account Details showing the account identifier and Account/Server URL; redact both values -->
