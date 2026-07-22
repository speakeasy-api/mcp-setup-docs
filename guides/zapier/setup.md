---
setup_version: 1
---

# Zapier

## Prerequisites

A Zapier account that can sign in at mcp.zapier.com and connect the apps you
want to expose as tools. Zapier MCP runs on the account's existing Zapier
plan — there is no separate MCP tier — and each successful tool call consumes
two tasks from the plan's task allowance. Everything below happens at
[mcp.zapier.com](https://mcp.zapier.com); no prior Zapier experience is
assumed.

## Provider setup

### Create an MCP server {#create-mcp-server}

1. Sign in at [mcp.zapier.com](https://mcp.zapier.com) and select
   **+ New MCP Server**.
2. Choose **Other** as the client (the Speakeasy AI Control Plane is not on
   Zapier's client list), name the server, and select **Create MCP Server**.

<!-- screenshot: the New MCP Server dialog with the client dropdown open on Other and a server name filled in -->

### Add tools to the server {#add-tools}

1. Select your server in the left sidebar, then open its **Configure** tab
   and select **+ Add tool**.
2. Search for an app, then choose a specific action or **Add all tools**.
3. Select an existing app connection, or create a new one from the Settings
   icon in the dialog.
4. Optionally pin each action field: have the AI generate a value, restrict
   it to preset choices, or fix a specific value.

<!-- screenshot: the Configure tab with the Add tool dialog showing an app search and its action list -->

### Generate the connection token {#generate-connection-token}

1. Select your server in the left sidebar and open its **Connect** tab.
2. Select **Generate token**. The token is displayed once — copy it into the
   Speakeasy AI Control Plane field immediately.

<!-- screenshot: the Connect tab showing the Generate token button and the one-time token dialog -->

## Gotchas

### Every successful tool call bills two tasks {#task-billing}

Each successful tool call through the MCP server consumes two tasks from the
connected Zapier plan. Failed calls and tool listings consume none. When the
plan's task allowance is exhausted, tool calls stop working until the monthly
reset or a plan upgrade.

### Tokens display once and rotate destructively {#token-rotation}

The connection token is shown only at generation time. **Rotate token** on
the Connect tab immediately invalidates the previous token, and every client
still using it must be reconfigured. Prefer the Authorization header form
over the alternative server URL that embeds the token as a query parameter.

### Dynamic discovery is the documented mode {#server-modes}

In the default dynamic-discovery mode the server advertises fifteen static
meta-tools, and the agent discovers, enables, and executes app actions
through them. Switching the server to manual configuration instead exposes
each pre-selected action as its own dedicated tool, so a manual server
advertises a different, per-tenant toolset.
