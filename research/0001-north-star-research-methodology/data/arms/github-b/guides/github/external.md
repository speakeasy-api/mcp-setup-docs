---
setup_version: 1
---

# GitHub setup

Sign in to `github.com` with a GitHub account that has a verified email address. The account must have access to the repositories or organization resources the connection will use. If the organization requires approval for fine-grained personal access tokens, an organization administrator must approve the token.

### Open fine-grained token settings {#open-fine-grained-token-settings}

1. Click your profile picture in the upper-right corner.
2. Select **Settings**.
3. In the left sidebar, select **Developer settings**.
4. Under **Personal access tokens**, select **Fine-grained tokens**.
5. Click **Generate new token**.

You can also open `https://github.com/settings/personal-access-tokens/new` directly.

<!-- screenshot: the Fine-grained personal access tokens page with Generate new token visible, with account-identifying details redacted -->

### Configure token access {#configure-token-access}

1. In **Token name**, enter a recognizable name such as `Speakeasy AI Control Plane`.
2. In **Expiration**, choose an expiration allowed by your organization’s policy.
3. Optionally enter a **Description**.
4. Under **Resource owner**, select the user or organization whose resources the connection needs.

An organization will not appear under **Resource owner** if it blocks fine-grained personal access tokens.

5. If GitHub displays an organization-approval justification box, enter the justification supplied by the application or cloud security owner.
6. Under **Repository access**, select the smallest repository set that meets the approved use.
7. If you select **Only select repositories**, use **Selected repositories** to choose the repositories.
8. Under **Permissions**, grant the exact GitHub permission names and access levels supplied by the application owner.

<!-- screenshot: the token form showing Resource owner, Repository access, and Permissions, with owner and repository names redacted -->

### Generate and copy the token {#generate-personal-access-token}

The generated token is a secret. Be ready to copy it into a password manager as soon as GitHub displays it.

1. Click **Generate token**.
2. Copy the generated token into your password manager.
3. If the token is marked `pending`, send the approval request to an organization owner.

The organization owner must complete these steps before you connect:

1. Click the profile picture in the upper-right corner.
2. Select **Your organizations**.
3. Beside the organization, click **Settings**.
4. In the sidebar, under **Third-party Access**, select **Personal access tokens**.
5. Select **Pending requests**.
6. Open the token request and review its access and permissions.
7. Click **Approve**.
8. In the confirmation dialog, click **Approve**.

An organization owner’s own request is approved automatically. If you did not retain the token, create a replacement before continuing.

<!-- screenshot-exception: the useful state contains the credential itself and must not be captured -->
