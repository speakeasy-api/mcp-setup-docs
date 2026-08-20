---
setup_version: 1
---

# Set up Atlassian Rovo

You need an Atlassian Cloud site with Jira, Confluence, and/or Compass, and the connecting Atlassian account must have access to the intended site and apps. Use a modern browser. Atlassian documents no paid-plan requirement for the MCP Server.

You need no Atlassian-side configuration unless your organization restricts OAuth client domains, IP addresses, third-party apps, or network egress. For OAuth-domain or IP-allowlist restrictions, sign in to Atlassian Administration with an organization-admin account and complete the applicable checks below. If app-management policy blocks authorization, ask the site admin who owns Marketplace and third-party app policy for help. For strict egress filtering, ask your network/security owner to allow the required Atlassian domain.

### Allow the Speakeasy OAuth domain {#allow-speakeasy-domain}

1. Open [admin.atlassian.com](https://admin.atlassian.com/).
2. If more than one organization is shown, select the organization you want to connect.
3. Select **Rovo**.
4. Select **Rovo MCP server**.
5. Check whether the allowed domains cover this hosted OAuth callback:

   ```
   https://app.getgram.ai/mcp/remote_login_callback
   ```

6. If it is not covered, select **Add domain**.
7. Enter this exact custom domain pattern:

   ```
   https://app.getgram.ai/mcp/remote_login_callback
   ```

8. Use the submission control shown in the console.

Keep **Allow Atlassian supported domains** selected. Deselecting it blocks Atlassian's supported-domain set.

If your organization uses IP allowlists, ask your network/security owner to confirm that hosted Speakeasy requests are allowed. Exact hosted outbound IP ranges are not established for this guide; do not guess them.

If your organization uses strict egress filtering, ask your network/security owner to allow the following domain in your organization's network controls so interactive Jira and Confluence widgets can render:

```
*.atlassian.net
```

<!-- screenshot: Rovo > Rovo MCP server showing the domain list and Add domain, with organization-specific domains redacted -->

If Atlassian denies the OAuth redirect during connection, return to **Rovo** > **Rovo MCP server** and verify that the client origin matches an allowed domain or pattern. If the authorization screen appears but a tool call returns an IP permission error, update the relevant organization IP allowlist.

