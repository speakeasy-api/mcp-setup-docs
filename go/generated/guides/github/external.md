---
setup_version: 1
---

# Connect GitHub to the Speakeasy AI Control Plane

Before you begin, obtain:

- Administrative access to the GitHub Enterprise Cloud organization that will own the OAuth app.
- Standard GitHub.com hosting for the target organization. This Setup Guide does not cover GitHub Enterprise Cloud with data residency or GitHub Enterprise Server.
- The organization-approved public URL for this connection from the application or cloud security owner.
- If the target organization restricts OAuth apps, access to an organization owner who can grant access — see [Connect your credentials](speakeasy.md#connect-speakeasy-credentials).
- A valid organization SSO session if the target organization protects resources with SSO enforcement.

Sign in at `https://github.com`.

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
3. Optionally, enter a public-safe **Application description**.
4. In **Authorization callback URL**, enter this value:

   ```
   {{ gram.oauth.callback_url }}
   ```

5. Leave **Enable Device Flow** off.
6. Click **Register application**. This opens the app's settings page.

If the target organization restricts OAuth apps, complete the organization approval flow after attaching credentials in [Connect your credentials](speakeasy.md#connect-speakeasy-credentials).

<!-- screenshot: the OAuth app registration form immediately before Register application, showing the field labels and the callback template but no organization-sensitive homepage value -->

### Generate the OAuth credentials {#generate-oauth-credentials}

1. On the app's settings page, copy the value next to **Client ID** into an approved password manager.
2. Under **Client secrets**, click **Generate a new client secret**.
3. Copy the generated client secret into the approved password manager. Do not put it in source control or this Guide.

If no usable secret is available before the first connection, return to this page and click **Generate a new client secret**.

<!-- screenshot: the app settings page with Client ID, Client secrets, and Generate a new client secret visible; capture before generating, or fully redact every credential value -->
