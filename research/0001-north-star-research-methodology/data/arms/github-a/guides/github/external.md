---
setup_version: 1
---

# GitHub setup

Sign in to `github.com` with a GitHub account that can access the repositories or organization resources the MCP Server should reach. Confirm that your organization or enterprise permits a fine-grained personal access token for the required resource owner, lifetime, and permissions. If you use an Enterprise Managed User account, an enterprise administrator must first enable personal access tokens.

### Open fine-grained token settings {#open-fine-grained-token-settings}

1. From any GitHub page, select your profile picture in the upper-right corner.
2. Select **Settings**.
3. In the left sidebar, select **Developer settings**.
4. Under **Personal access tokens**, select **Fine-grained tokens**.
5. Select **Generate new token**.
6. If GitHub asks you to confirm access, complete the confirmation to open the form.

<!-- screenshot: the Fine-grained personal access tokens page with Generate new token visible and existing sensitive token names hidden -->

### Configure and generate the token {#configure-and-generate-token}

1. Under **Token name**, enter a recognizable name such as `Speakeasy GitHub MCP`.
2. Under **Expiration**, select a lifetime allowed by your organization or enterprise policy.
3. Optional: under **Description**, identify that the token connects the GitHub MCP Server to the Speakeasy AI Control Plane.
4. Under **Resource owner**, select the user or organization that owns the resources the MCP Server must access.

If the intended organization is absent, ask an organization owner to permit fine-grained personal access token access:

1. From their profile picture, select **Your organizations**.
2. For the organization, select **Settings**.
3. Under **Third-party Access**, select **Personal access tokens**.
4. Select **Settings**.
5. Under **Fine-grained personal access tokens**, select **Allow access via fine-grained personal access tokens**.
6. Select **Save**.
7. Return to the token form and select the organization as **Resource owner**.

5. If the selected organization requires approval, enter the requested justification below **Resource owner**. Obtain the wording from your application or cloud security owner.
6. Under **Repository access**, choose the smallest repository set needed.
7. If you choose **Only select repositories**, use **Selected repositories** to select them.
8. Before creating the token, obtain the intended GitHub operations and exact fine-grained repository, organization, and account permission levels from your application or cloud security owner.
9. Under **Permissions**, open the appropriate **Repository permissions**, **Organization permissions**, or **Account permissions** category.
10. Locate each supplied permission.
11. Use its dropdown menu to select the supplied access level.

Before selecting **Generate token**, be ready to copy the result and store it in a password manager.

12. Select **Generate token**.
13. Copy the displayed token and store it in your password manager.

If you did not retain the generated value, create a replacement token and retain the new value for the initial connection.

If the token is marked `pending`, ask an organization owner to approve it:

1. From their profile picture, select **Your organizations**.
2. For the organization, select **Settings**.
3. Under **Third-party Access**, select **Personal access tokens**.
4. Select **Pending requests**.
5. Open your request.
6. Select **Approve**.

Return to personal **Settings** > **Developer settings** > **Personal access tokens** > **Fine-grained tokens**. Continue only when the token is no longer marked `pending`; while pending, it can read only public resources.

For a SAML-protected organization, verify that you selected the organization as **Resource owner** before generating the token. GitHub authorizes a fine-grained token for SAML during creation; there is no separate post-creation authorization screen.

<!-- screenshot: the token creation form showing Token name, Expiration, Resource owner, Repository access, and Permissions with organization and repository names redacted; optionally include the generated-token copy control with the token fully redacted -->
