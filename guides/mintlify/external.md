---
setup_version: 1
---

# Set up Mintlify

Sign in to the [Mintlify dashboard](https://app.mintlify.com) with an account that can open the organization's **MCP** settings. Each person who connects needs a Mintlify account with access to the projects they will work on. The connection inherits that person's dashboard role: viewers can only use read tools, and protected settings need an admin role. To publish changes, the project's GitHub, GitLab, or Bitbucket connection must have write access to the deploy branch's repository.

Mintlify registers the Speakeasy OAuth client automatically, so you do not create an app or copy a client ID or secret. Mintlify does block sign-in from clients it does not recognize, so you add the Speakeasy redirect domain to its allowlist.

### Allow the Speakeasy redirect domain {#allow-speakeasy-redirect-domain}

1. In the Mintlify dashboard, open your [MCP settings](https://app.mintlify.com/products/mcp) and go to **Configure**.
2. Find the **Redirect URIs** section.
3. Copy the hostname from the Speakeasy callback URL below. Enter only the hostname, without `https://` or a path.

   ```
   {{ gram.oauth.callback_url }}
   ```

4. Paste the hostname into **Allowed domains** and click **Add domain**.

The allowed domains also apply to your docs site's search MCP server.

<!-- screenshot: Mintlify MCP settings, Configure, with the Speakeasy hostname listed under Redirect URIs -->
