---
setup_version: 1
---

# Connect Intercom to the Speakeasy AI Control Plane

- An Intercom workspace hosted in the US or EU. Australian-hosted workspaces are not supported.
- An Intercom account authorized to access the intended workspace data. The server requests **Read and list users and companies**, **Read conversations**, and **Read and write articles**.

Intercom does not document an MCP-specific plan tier or administrator role.

### Identify the workspace region {#identify-workspace-region}

1. Sign in to the intended Intercom workspace in your browser.
2. Inspect the hostname in the browser address bar.
3. If the hostname is `app.au.intercom.com`, stop. Intercom does not support the MCP server for Australian-hosted workspaces.
4. Record the matching values:
   - For `app.intercom.com`, use remote URL `https://mcp.intercom.com/mcp` and issuer URL `https://mcp.intercom.com`.
   - For `app.eu.intercom.com`, use remote URL `https://mcp.eu.intercom.com/mcp` and issuer URL `https://mcp.eu.intercom.com`.

<!-- screenshot-exception: the only relevant state is the workspace hostname in the browser address bar; no Intercom MCP settings screen exists for this authentication path -->
