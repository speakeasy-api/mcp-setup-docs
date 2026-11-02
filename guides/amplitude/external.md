---
setup_version: 1
---

# Set up Amplitude

You need an Amplitude account in the intended organization, with access to the projects the connection should query. Amplitude says any existing Amplitude customer can use its MCP server; it names no extra plan. You don't create an app, client, or API key in Amplitude for this connection.

Amplitude turns MCP access on by default for every user in an organization, and every role grants MCP read access. You need Amplitude-side changes only if an organization admin has blocked or restricted MCP access, or has changed the MCP actions on a role. The two checks below need an Amplitude organization admin. First, find which Amplitude region your organization uses, because the server URL depends on it.

### Find your Amplitude region {#find-amplitude-region}

1. Sign in to Amplitude and open the intended organization.
2. Look at the hostname in the browser address bar.
3. Record the matching MCP server URL:
   - For `app.amplitude.com`, record `https://mcp.amplitude.com/mcp` (United States, the default).
   - For `app.eu.amplitude.com`, record `https://mcp.eu.amplitude.com/mcp` (EU Residency).

Use the US URL unless your Amplitude data resides in the EU region. An organization that signed up with EU data storage signs in at `app.eu.amplitude.com`.

<!-- screenshot: the Amplitude address bar showing app.amplitude.com or app.eu.amplitude.com, with organization and project identifiers obscured -->

### Check organization MCP access {#check-mcp-access}

1. As an Amplitude organization admin, open **Settings**.
2. Select **Content Access**, then **MCP**.
3. Confirm the content access controls allow the Amplitude MCP server for the users who will connect. If they block it, allow it for those users.

This setting applies to every MCP client and every user in the organization. Individual users can't override it.

<!-- screenshot: Settings > Content Access > MCP showing the allow or block controls, with user and group names obscured -->

### Check MCP role actions {#check-mcp-role-actions}

Do this step only if your organization uses custom roles or an admin has changed MCP actions on a role. By default every role grants **Use MCP (read)**, and the Member, Manager, and Admin roles also grant **Use MCP (write)**.

1. As an Amplitude organization admin, open **Org Settings**, then **Role Management**.
2. Open the role assigned to the users who will connect, or create one.
3. In the **AI Features** category, enable **Use MCP (read)**.
4. If those users need tools that create, update, delete, or restore data, also enable **Use MCP (write)**.
5. Assign the role to the intended users or groups, scoped to the relevant projects.

Amplitude enforces these actions on each tool call, project by project. A tool the role doesn't permit still appears in the tool list, but calls to it fail.

<!-- screenshot: Role Management with the AI Features category expanded and Use MCP (read) and Use MCP (write) visible -->
