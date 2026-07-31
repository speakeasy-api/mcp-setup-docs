---
research_version: 1
slug: github
researched_at: 2026-07-31T20:39:35Z
---

# GitHub — Research Dossier

## Server facts

- The hosted GitHub MCP Server is at `https://api.githubcopilot.com/mcp/`. GitHub describes the remote server as hosted by GitHub and recommends it for most users.
- The transport is Streamable HTTP. GitHub's examples identify the server as HTTP and use an HTTP URL; the Speakeasy AI Control Plane proxies remote MCP servers over Streamable HTTP.
- GitHub documents two authentication approaches for the hosted server: one-click OAuth and a personal access token (PAT). This Guide uses the PAT path because GitHub documents the exact bearer-header presentation and it does not depend on a client-specific, pre-registered OAuth application.
- Send the PAT in the `Authorization` request header as `Bearer <personal-access-token>`.
- The PAT can do only what its owner can do and is further limited by the permissions granted to it. GitHub recommends fine-grained PATs over classic PATs whenever possible. Before token creation, the application or cloud security owner must provide the intended GitHub operations and the exact fine-grained repository, organization, and account permission levels for those operations; the token creator should not derive this application-specific access policy.
- An organization can block fine-grained PATs, require approval, or enforce a maximum token lifetime. If approval is required, a newly generated token is `pending` and can read only public resources until an organization owner approves it. Enterprise Managed User accounts have PATs disabled by default unless an enterprise administrator enables them.
- Fine-grained PATs are authorized for SAML single sign-on during creation. For access to a SAML-protected organization, select that organization as **Resource owner**; there is no separate post-creation **Configure SSO** action for a fine-grained PAT.

## Credential flow

A GitHub account holder creates a fine-grained personal access token in personal **Settings**. The token is the only provider-created credential needed by the documented Authentication Option. In the Speakeasy AI Control Plane, use header name `Authorization` and static secret value `Bearer <personal-access-token>`, replacing the placeholder with the copied token. No redirect/callback value is used for the PAT path.

The account must have access to the repositories or organization resources the MCP Server should reach. Organization or enterprise PAT policies must permit the selected resource owner and lifetime. The token cannot grant access the account does not already have.

## Console walkthrough

Start at any signed-in page on `github.com`. The profile menu leads to personal **Settings**, then **Developer settings**, **Personal access tokens**, **Fine-grained tokens**, and the creation form. The creation form produces the token copied into the Speakeasy AI Control Plane.

### Open fine-grained token settings {#open-fine-grained-token-settings}

- From any GitHub page, click the profile picture in the upper-right corner, then click **Settings**.
- In the left sidebar, click **Developer settings**.
- Under **Personal access tokens**, click **Fine-grained tokens**.
- Click **Generate new token**. GitHub may ask you to confirm access before showing the form.
- Screenshot note: capture the **Fine-grained personal access tokens** page with **Generate new token** visible; do not show existing token names if they are sensitive.

### Configure and generate the token {#configure-and-generate-token}

- Under **Token name**, enter a recognizable name such as `Speakeasy GitHub MCP`.
- Under **Expiration**, select a lifetime allowed by your organization or enterprise policy.
- **Description** is optional; if used, identify that the token connects the GitHub MCP Server to the Speakeasy AI Control Plane.
- Under **Resource owner**, select the user or organization that owns the resources the MCP Server must access. An organization does not appear when it has blocked fine-grained PATs. If the intended organization is absent, ask an organization owner to permit fine-grained PAT access. The owner opens profile picture > **Your organizations** > the organization's **Settings** > under **Third-party Access**, **Personal access tokens** > **Settings**. Under **Fine-grained personal access tokens**, select **Allow access via fine-grained personal access tokens**, then click **Save**. Return to the token form and select the organization as **Resource owner**.
- If the selected organization requires approval, enter the requested justification below **Resource owner**. Obtain organization-specific wording from the application or cloud security owner.
- Under **Repository access**, choose the smallest repository set needed. If you choose **Only select repositories**, use **Selected repositories** to select them.
- Under **Permissions**, use the appropriate **Repository permissions**, **Organization permissions**, or **Account permissions** category to locate each permission supplied by the application or cloud security owner, then use its dropdown menu to select the supplied access level. Obtain the exact permission names and levels before creating the token; do not determine the application's permissions from REST API pages during this setup.
- Before clicking **Generate token**, be ready to copy the result and store it in a password manager. Click **Generate token**, then copy the displayed token. This copied value feeds the `Authorization` header in Speakeasy as `Bearer <personal-access-token>`.
- If the token is marked `pending`, an organization owner approves it from profile picture > **Your organizations** > the organization's **Settings** > under **Third-party Access**, **Personal access tokens** > **Pending requests**. Open the request and click **Approve**. The requester returns to personal **Settings** > **Developer settings** > **Personal access tokens** > **Fine-grained tokens** and waits until the token is no longer marked `pending` before testing private organization resources.
- For a SAML-protected organization, verify that organization was selected as **Resource owner** before generating the token. GitHub authorizes a fine-grained PAT for SAML during creation, so no separate post-creation authorization screen is required.
- Screenshot note: capture the token creation form showing **Token name**, **Expiration**, **Resource owner**, **Repository access**, and **Permissions**, with organization and repository names redacted. A second capture may show the generated-token copy control with the token fully redacted.
- Recovery: if organization approval is required, complete the approval path and confirm the token is no longer marked `pending` before testing the first connection. If the generated value was not retained, do not guess it; create a replacement token and use the new value for the initial connection.

## Speakeasy setup

Per-guide values:

- Remote URL: `https://api.githubcopilot.com/mcp/`
- Transport: `streamable-http`
- Authentication Option: `personal-access-token`
- Credential field: header name `Authorization`; static secret value `Bearer <personal-access-token>`, where the token comes from [Configure and generate the token](#configure-and-generate-token).
- Further reading: `https://github.com/github/github-mcp-server/blob/main/docs/remote-server.md`
- Add-server path: catalog only. The operator's Speakeasy MCP Catalog lookup found registry name `io.github.github/github-mcp-server`, title `GitHub`.

### Add the server in Speakeasy {#add-server-in-speakeasy}

In the Speakeasy AI Control Plane sidebar, under **Connect**, select **Sources**, then click **Add Source**. Choose **3rd-party server**. On the **MCP Catalog** page, use **Search MCP servers...** to find GitHub, open its entry with **View**, and click **Add**. In the **Add to Project** dialog, click **Add to Project**. This creates the hosted MCP server and opens its **Overview** page.

Screenshot note: capture the GitHub catalog result or entry with **View** and **Add** visible.

### Connect your credentials {#connect-speakeasy-credentials}

From the server's **Overview**, open **Settings**. Under **Upstream Headers**, click **Add header**, enter `Authorization` as the **Header name**, leave **Value source** as **Static value**, and paste `Bearer <personal-access-token>` using the token copied in [Configure and generate the token](#configure-and-generate-token). Check **Secret**, then click **Save**. A catalog install may collect the same header earlier in the **Add to Project** dialog's **Upstream headers** section.

Screenshot note: capture the **Upstream Headers** editor with header name `Authorization`, **Static value**, and **Secret** visible; fully redact the value.

Closing pointer: This guide covers setup only. For anything beyond it — billing, tool behavior, limits — see GitHub's MCP documentation at `https://github.com/github/github-mcp-server/blob/main/docs/remote-server.md`.

## Open questions

None.

## Provenance

### Source inventory

- GitHub product/developer documentation: `https://docs.github.com/`; its machine-readable index at `https://docs.github.com/llms.txt` identified the current GitHub MCP setup pages and the personal-access-token documentation.
- GitHub MCP Server developer repository and remote-server documentation: `https://github.com/github/github-mcp-server` and `https://github.com/github/github-mcp-server/blob/main/docs/remote-server.md`.
- GitHub product/admin documentation for PAT creation and policy behavior: `https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens`.
- GitHub organization-admin documentation for PAT policy and request review: `https://docs.github.com/en/organizations/managing-programmatic-access-to-your-organization/setting-a-personal-access-token-policy-for-your-organization` and `https://docs.github.com/en/organizations/managing-programmatic-access-to-your-organization/managing-requests-for-personal-access-tokens-in-your-organization`.
- No separate public support-KB property with a more specific hosted-MCP setup flow was identified; GitHub's support content is served through `docs.github.com`.
- Speakeasy-side canonical setup: `doctrine/speakeasy-setup.md`.
- Speakeasy MCP Catalog operator lookup: matched `io.github.github/github-mcp-server` with title `GitHub`.

### Fact sources

- `https://github.com/github/github-mcp-server/blob/main/docs/remote-server.md` — observed 2026-07-31T20:39:35Z — hosted remote URL, HTTP configuration, remote-server status, and optional URL/header behavior.
- `https://docs.github.com/en/copilot/how-tos/provide-context/use-mcp-in-your-ide/set-up-the-github-mcp-server` — observed 2026-07-31T20:39:35Z — hosted server recommendation, OAuth/PAT alternatives, PAT policy caveats, URL, and exact `Authorization: Bearer ...` presentation.
- `https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens` — observed 2026-07-31T20:39:35Z — fine-grained-token recommendation, account navigation, creation-form labels and transitions, permissions guidance, pending state, fine-grained-token SAML authorization during creation, and organization/enterprise policy caveats.
- `https://docs.github.com/en/organizations/managing-programmatic-access-to-your-organization/setting-a-personal-access-token-policy-for-your-organization` — observed 2026-07-31T20:39:35Z — organization-owner navigation and the **Settings**, **Fine-grained personal access tokens**, **Allow access via fine-grained personal access tokens**, and **Save** controls for permitting fine-grained PAT access.
- `https://docs.github.com/en/organizations/managing-programmatic-access-to-your-organization/managing-requests-for-personal-access-tokens-in-your-organization` — observed 2026-07-31T20:39:35Z — organization-owner navigation, **Pending requests**, request review, and **Approve** controls.
- `https://docs.github.com/llms.txt` — observed 2026-07-31T20:39:35Z — documentation-property sweep and discovery of current MCP documentation locators.
- `https://api.githubcopilot.com/.well-known/oauth-protected-resource/mcp/` — observed 2026-07-31T20:39:35Z — live public protected-resource metadata confirms the canonical resource URL, bearer-header method, GitHub authorization server, and advertised OAuth scopes; used as corroboration rather than the documented PAT walkthrough.
- `doctrine/speakeasy-setup.md` — observed 2026-07-31T20:39:35Z — fixed Speakeasy labels, catalog and upstream-header flows, transport normalization, anchors, and closing-pointer text.
- Speakeasy MCP Catalog record `io.github.github/github-mcp-server` (title `GitHub`) — source `pulsemcp`, observed 2026-07-31T20:39:35Z — catalog presence and catalog-only add-server path.
