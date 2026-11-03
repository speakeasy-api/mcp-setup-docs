---
setup_version: 1
---

# Connect Amplitude to the Speakeasy AI Control Plane

Amplitude organizations hosted in the US or the EU can use Amplitude's MCP server. There is nothing to create in Amplitude: each person who uses the server signs in with their own Amplitude account and keeps the project access and permissions that account already has. The access check below needs an Amplitude organization admin.

### Identify your data region {#identify-data-region}

1. Sign in to Amplitude and open the intended organization.
2. Check the hostname in the browser address bar.
3. Record the server URL that matches it.

   For `app.amplitude.com` (US):

   ```
   https://mcp.amplitude.com/mcp
   ```

   For `app.eu.amplitude.com` (EU):

   ```
   https://mcp.eu.amplitude.com/mcp
   ```

The data region is chosen when the organization is created, and the two URLs are not interchangeable: an EU organization must use the EU URL.

<!-- screenshot: the Amplitude address bar showing the app.amplitude.com or app.eu.amplitude.com hostname, with organization and project details obscured -->

### Confirm MCP access {#confirm-mcp-access}

Amplitude allows its MCP server for every user by default. These steps confirm that nobody has turned it off.

1. As an Amplitude organization admin, click the gear icon to open **Settings**, then go to **Content Access > MCP** in your organization settings. Only organization admins can change this setting.
2. Confirm that the content access controls allow the Amplitude MCP server.
3. If they block it, allow it. This setting applies to every MCP client and every user in the organization.
4. If your organization uses custom roles, go to **Role Management** in the same organization settings and open a role that Speakeasy users hold.
5. In the **AI Features** category, confirm that **Use MCP (read)** is enabled. Without it, MCP calls fail for that role, even for organization admins.
6. Enable **Use MCP (write)** only if users with that role should be able to change Amplitude data through the server.
7. Repeat steps 5 and 6 for each other custom role that Speakeasy users hold.

Amplitude's built-in roles already grant **Use MCP (read)**, and its Member, Manager, and Admin roles also grant **Use MCP (write)**.

<!-- screenshot: Content Access > MCP in the organization settings with the Amplitude MCP server allowed, then Role Management > AI Features showing Use MCP (read) and Use MCP (write); organization details obscured -->
