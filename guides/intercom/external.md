---
setup_version: 1
---

# Connect Intercom to the Speakeasy AI Control Plane

Use an Intercom workspace hosted in the US or EU and an account authorized to access the intended workspace data. The server requests **Read and list users and companies**, **Read conversations**, and **Read and write articles**.

Sign in through [Intercom's sign-in page](https://app.intercom.com/admins/sign_in).

### Identify the workspace region {#identify-workspace-region}

1. Before signing in, check the Intercom workspace URL you normally use:
   - `app.intercom.com` is **United States**.
   - `app.eu.intercom.com` is **Europe**.
   - `app.au.intercom.com` is **Australia**.
2. Open [Intercom's sign-in page](https://app.intercom.com/admins/sign_in).
3. Under **Your account region**, select the region that matches the workspace URL.
4. Sign in to the workspace.
5. If Intercom does not find the workspace:
   1. Reopen the sign-in page.
   2. Under **Your account region**, select the region that matches the workspace URL.
   3. Sign in again.
6. Open the intended Intercom workspace.
7. Inspect the hostname in the browser address bar.
8. If the hostname is `app.au.intercom.com`, stop. Intercom does not support the MCP server for Australian-hosted workspaces.
9. Record the values that match the hostname:
   - For `app.intercom.com`, record remote URL `https://mcp.intercom.com/mcp` and issuer URL `https://mcp.intercom.com`.
   - For `app.eu.intercom.com`, record remote URL `https://mcp.eu.intercom.com/mcp` and issuer URL `https://mcp.eu.intercom.com`.

<!-- screenshot: the Intercom sign-in page with Your account region expanded, showing United States, Europe, and Australia -->
