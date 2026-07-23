---
setup_version: 1
---

# Connect GitHub to the Speakeasy AI Control Plane

## Prerequisites

Before you begin, obtain:

- Administrative access to the GitHub Enterprise Cloud organization that will own the OAuth app.
- Standard GitHub.com hosting for the target organization. If the organization uses GitHub Enterprise Cloud with data residency, follow [GitHub's tenant-specific remote URL setup](https://docs.github.com/en/copilot/how-tos/provide-context/use-mcp-in-your-ide/enterprise-configuration) instead of this Setup Guide.
- The organization-approved public URL for this connection from the application or cloud security owner.
- If the target organization restricts OAuth apps, access to an organization owner who can grant access — see [Connect your credentials](#connect-speakeasy-credentials).
- A valid organization SSO session if the target organization protects resources with SSO enforcement.

Sign in at `https://github.com`.

## Provider setup

### Open organization developer settings {#open-organization-developer-settings}

1. Click your profile picture in the upper-right corner.
2. Click **Your organizations**.
3. To the right of the organization that should own the app, click **Settings**.
4. In the left sidebar, click **Developer settings**.
5. Click **OAuth apps**.

<!-- screenshot: the organization's Developer settings with OAuth apps selected and the create control visible; exclude unrelated organization settings -->

### Register the OAuth app {#register-oauth-app}

GitHub makes OAuth app registration details public. Do not put internal URLs or sensitive details in the registration fields.

If the page shows **New OAuth App**, click it. If the page instead shows **Register a new application**, click it.

1. In **Application name**, enter a recognizable public name, such as `Speakeasy AI Control Plane – GitHub MCP`.
2. In **Homepage URL**, enter the full organization-approved public URL.
3. Optionally, enter an **Application description**.
4. In **Authorization callback URL**, enter `{{ gram.oauth.callback_url }}`.
5. Leave **Enable Device Flow** off.
6. Click **Register application**. This opens the app's settings page.

If the target organization restricts OAuth apps, complete the organization approval flow after attaching credentials in [Connect your credentials](#connect-speakeasy-credentials).

<!-- screenshot: the OAuth app registration form immediately before Register application, showing the field labels and the callback template but no organization-sensitive homepage value -->

### Generate the OAuth credentials {#generate-oauth-credentials}

1. On the app's settings page, copy the value next to **Client ID** into an approved password manager.
2. Under **Client secrets**, click **Generate a new client secret**.
3. Copy the generated client secret into the approved password manager. Do not put it in source control or this Guide.

If no usable secret is available before the first connection, return to this page and click **Generate a new client secret**.

<!-- screenshot: the app settings page with Client ID, Client secrets, and Generate a new client secret visible; capture before generating, or fully redact every credential value -->

## Speakeasy setup

### Add the server in Speakeasy {#add-server-in-speakeasy}

1. In the Speakeasy AI Control Plane sidebar, under **Connect**, select **Sources**.
2. Click **Add Source**.

If GitHub is in the catalog:

1. Choose **3rd-party server**.
2. On the **MCP Catalog** page, find `GitHub` using **Search MCP servers...**.
3. Open its entry with **View**.
4. Click **Add**.
5. In the **Add to Project** dialog, click **Add to Project**.

If GitHub is not in the catalog:

1. Choose **Custom remote server**.
2. On the **Add a custom remote MCP server** page, paste `https://api.githubcopilot.com/mcp/` into **Remote MCP server URL**.
3. Click **Add server**.

Either path creates the hosted MCP server and opens its **Overview** page.

<!-- screenshot: the Add Source menu on Sources, or GitHub's catalog entry if present -->

### Connect your credentials {#connect-speakeasy-credentials}

From the server's **Overview**, open **Settings**.

If **Use Discovered** is offered under **Authentication**, click it. Otherwise, click **Configure Manually**.

1. In **Attach Remote Identity Provider**, set **Client Type** to **Manual**.
2. Confirm that **Redirect URI** matches the `{{ gram.oauth.callback_url }}` value entered in [Register the OAuth app](#register-oauth-app).
3. Paste the **Client ID** saved in [Generate the OAuth credentials](#generate-oauth-credentials) into **Client ID**.
4. Paste the saved client secret into **Client Secret (optional)** — although the field is labeled optional, this OAuth connection requires it.
5. Click **Attach Identity Provider**.

If the target organization restricts OAuth apps, have a user authorize the connection, then complete the following:

1. Have the user click their profile picture.
2. Have the user click **Settings**.
3. Under **Integrations**, have the user click **Applications**.
4. Have the user click **Authorized OAuth Apps**.
5. Have the user open this OAuth app.
6. Next to the target organization, have the user click **Request access**.
7. Have the user click **Request approval from owners**.

Then have an organization owner approve the pending request:

1. Click the profile picture.
2. Click **Organizations**.
3. Select the target organization.
4. Under the organization name, click **Settings**.
5. Under **Third-party Access**, click **OAuth app policy**.
6. Next to the app, click **Review**.
7. Click **Grant access**.

If the user's first authorization attempt was blocked before approval, have the user retry it after access is granted.

<!-- screenshot: Attach Remote Identity Provider with the Redirect URI and credential fields visible and all credential values redacted -->

This guide covers setup only. For anything beyond it — billing, tool behavior, limits — see GitHub's MCP documentation at https://github.com/github/github-mcp-server/blob/main/docs/remote-server.md.
