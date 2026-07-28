---
research_version: 1
slug: snowflake
researched_at: 2026-07-28T20:27:25Z
---

# Snowflake — Research Dossier

## Server facts

- **Scope:** Snowflake-managed MCP servers, specifically a server exposing an
  existing Cortex Agent through a `CORTEX_AGENT_RUN` tool. This is distinct
  from Snowflake's MCP Connectors feature for calling external MCP servers.
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
  also needs a non-null `DEFAULT_WAREHOUSE`.
- **Privileges:** the connecting role needs `USAGE` on the MCP server and
  privileges on each underlying tool. A Cortex Agent tool requires `USAGE` on
  the referenced Cortex Agent. Creating the OAuth integration requires
  `ACCOUNTADMIN` or global `CREATE INTEGRATION`.
- **Availability:** unavailable in the People's Republic of China and
  unsupported in government regions.
- **PrivateLink:** SaaS clients use the public MCP URL. Accounts using
  PrivateLink set `USE_PRIVATELINK_FOR_AUTHORIZATION_ENDPOINT = TRUE` so
  browser authorization uses PrivateLink while the token endpoint remains
  publicly reachable.
- **Network policies:** restrictive policies must allow the MCP client's
  outbound IP addresses.
- **Catalog mismatch:** the forced Speakeasy MCP Catalog record
  `com.pulsemcp.mirror/gram-snowflake` version `0.0.1` does not point to the
  account- and object-specific Snowflake URL above. It points to the fixed
  `https://app.getgram.ai/mcp/speakeasy-team-snowflake` remote and requires one
  string header, `Mcp-Account-Identifier`. The record has no database, schema,
  MCP server name, or complete MCP server URL input. Therefore the catalog
  record cannot be verified as a binding for the Snowflake-managed Cortex
  Agent MCP server this Guide creates.

## Credential flow

Who acts: a Snowflake administrator with `ACCOUNTADMIN` or delegated
privileges. The application or data owner supplies the approved Cortex Agent,
database, schema, MCP server name, connecting role, warehouse, and grants.

What gets created:

1. A Snowflake MCP server object referencing the approved Cortex Agent.
2. A confidential custom OAuth security integration.

| Speakeasy value | Snowflake origin |
| --- | --- |
| Client ID | `oauth_client_id` returned at {#copy-oauth-credentials} |
| Client Secret | `oauth_client_secret` returned at {#copy-oauth-credentials} |
| `Mcp-Account-Identifier` | Preferred `organization-account` identifier recorded at {#record-mcp-server-url} |

Enter `{{ gram.oauth.callback_url }}` directly as `OAUTH_REDIRECT_URI` at
{#create-oauth-integration}. Assemble the account-specific MCP URL at
{#record-mcp-server-url}. The account identifier satisfies the catalog
record's required header, but it does not identify the database, schema, or MCP
server object and therefore does not resolve the catalog mismatch.

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

- Obtain the approved database, schema, server name, Cortex Agent fully
  qualified name, tool name, title, and description from the application or
  data owner.
- In the SQL file, set the exact namespace, then create the server:

  ```sql
  USE DATABASE <database>;
  USE SCHEMA <schema>;

  CREATE MCP SERVER <server_name>
    FROM SPECIFICATION $$
      tools:
        - name: "<tool_name>"
          type: "CORTEX_AGENT_RUN"
          identifier: "<database>.<schema>.<cortex_agent>"
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

- Have the security owner grant the connecting role `USAGE` on the MCP server,
  `USAGE` on the Cortex Agent, and every downstream privilege the Agent needs.
- Set each connecting user's defaults:

  ```sql
  ALTER USER <username>
    SET DEFAULT_ROLE = '<mcp_access_role>'
        DEFAULT_WAREHOUSE = '<warehouse_name>';
  ```

- Recovery: if authorization succeeds but initialization fails, confirm
  `DEFAULT_WAREHOUSE` is set. If tools are unavailable, confirm
  `DEFAULT_ROLE` has all MCP server, Agent, and downstream privileges.
- Screenshot note: successful grant and user-change results, with identities
  redacted where policy requires.

### Create the OAuth integration {#create-oauth-integration}

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
- In **Account Details**, copy the preferred account identifier in
  `organization-account` form for the catalog's required
  `Mcp-Account-Identifier` value. Snowflake also documents this SQL:

  ```sql
  SELECT CURRENT_ORGANIZATION_NAME() || '-' || CURRENT_ACCOUNT_NAME();
  ```

- In the same dialog, copy **Account/Server URL**. Remove `https://` and any
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
- Catalog input: `Mcp-Account-Identifier` is required and receives the
  preferred `organization-account` identifier from
  {#record-mcp-server-url}. It is not a secret.
- Catalog binding limitation: version `0.0.1` installs the fixed
  `https://app.getgram.ai/mcp/speakeasy-team-snowflake` remote. It exposes no
  input for the complete account-specific MCP server URL from
  {#record-mcp-server-url}, nor for its database, schema, or server name.
- Authentication Option: manually registered confidential OAuth client.
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
In **Add to Project**, under **Upstream headers**, enter the preferred
`organization-account` value from {#record-mcp-server-url} for the required
**Mcp-Account-Identifier** field, then click **Add to Project**.

This adds the catalog record and opens its **Overview** page, but the verified
record does not bind the complete Snowflake-managed MCP server URL. Do not
claim that this connects the Cortex Agent MCP server until the catalog record
accepts that URL or its equivalent object coordinates.

Screenshot note: **Add to Project** with **Upstream headers** and the required
**Mcp-Account-Identifier** field visible; redact the account identifier.

### Connect your credentials {#connect-speakeasy-credentials}

From **Overview**, open **Settings**. Under **Authentication**, click
**Configure Manually**. In **Attach Remote Identity Provider**, set
**Client Type** to **Manual**. Confirm **Redirect URI** matches the callback
registered in Snowflake. Paste the values from {#copy-oauth-credentials} into
**Client ID** and **Client Secret (optional)**, then click
**Attach Identity Provider**.

Screenshot note: the attachment sheet with labels visible and values redacted.

Public Speakeasy product history verifies a **Connect** control when an OAuth
token is unavailable in the Playground; it opens a popup for the third-party
account. It does not establish a transition from this server's **Overview**
page or a general post-attachment authorization control, so it is not safe to
render as the next walkthrough action.

This guide covers setup only. For anything beyond it — billing, tool behavior,
limits — see Snowflake's MCP documentation at
`https://docs.snowflake.com/en/user-guide/snowflake-cortex/cortex-agents-mcp`.

## Open questions

- Must the forced catalog record be corrected to accept the complete
  account-specific Snowflake MCP server URL, or should this Guide cover a
  different Snowflake MCP server? The current record's required account
  identifier alone cannot select the database, schema, and MCP server object.
- Snowflake requires restrictive network policies to allow the client's
  outbound IPs, but the reviewed public sources do not identify the Speakeasy
  AI Control Plane addresses.
- Which current Speakeasy control starts end-user Snowflake authorization
  after identity-provider attachment? **Connect** is verified only for the
  Playground's missing-token state, not as a transition from **Overview**.

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

All sources were observed at `2026-07-28T20:27:25Z`.

- `https://docs.snowflake.com/llms.txt` — documentation inventory and account
  identifier guidance.
- `https://docs.snowflake.com/en/user-guide/snowflake-cortex/llms.txt` —
  Cortex inventory and distinction from MCP Connectors.
- `https://docs.snowflake.com/en/user-guide/snowflake-cortex/cortex-agents-mcp`
  — URL, transport behavior, OAuth, access, PrivateLink, network policy,
  role/warehouse behavior, availability, and limitations.
- `https://docs.snowflake.com/en/sql-reference/sql/create-mcp-server` —
  Cortex Agent tool specification and creation privileges.
- `https://docs.snowflake.com/en/user-guide/oauth-custom` and
  `https://docs.snowflake.com/en/sql-reference/sql/create-security-integration-oauth-snowflake`
  — OAuth integration privilege, confidential client, and redirect behavior.
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
- `https://www.speakeasy.com/docs/mcp/catalog/overview` — public catalog
  behavior: adding a registry server creates an external MCP attachment from
  the registry transport record.
- `https://github.com/speakeasy-api/gram/pull/1323` — public product history
  for the Playground **Connect** control and its OAuth popup.
- Pulse catalog observation — query `snowflake`; matched
  `com.pulsemcp.mirror/gram-snowflake`, title `Snowflake`, version `0.0.1`,
  status `present`; derived binding facts are its fixed streamable-HTTP remote
  and required `Mcp-Account-Identifier` string header.
