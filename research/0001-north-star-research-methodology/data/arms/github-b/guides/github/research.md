---
research_version: 1
slug: github
researched_at: 2026-07-31T20:49:47Z
---

# GitHub — Research Dossier

## Server facts

- **Remote URL:** `https://api.githubcopilot.com/mcp/`. GitHub's remote-server documentation identifies this as the hosted GitHub MCP Server URL, and GitHub Docs uses the same URL in its remote configuration examples.
- **Transport:** streamable HTTP. GitHub's current examples declare the remote as `type: http`; direct observation of the MCP URL returned an MCP bearer challenge. The Metadata normalizes this to `streamable-http`.
- **Authentication Option documented here:** a GitHub personal access token (PAT), sent as `Authorization: Bearer <token>`. GitHub Docs publishes this exact remote-server configuration. This guide uses a fine-grained PAT because GitHub recommends fine-grained tokens over classic PATs when they can cover the intended work.
- **Access boundary:** a fine-grained token is limited by its selected resource owner, repository access, and permissions. If an organization requires approval, a new token remains `pending` and can read only public resources until an organization administrator approves it; organization owners' own requests are automatically approved.
- **Standing requirements:** a GitHub account with a verified email address; access to the repositories or organization the connection must use; and organization approval when its fine-grained-token policy requires approval. No separate Copilot subscription requirement is asserted for PAT access to the hosted endpoint: the provider's remote example authenticates directly with a PAT.
- The endpoint also advertises OAuth protected-resource metadata, but that does not provide a registration endpoint for the Speakeasy AI Control Plane. This Guide therefore documents only the provider-supported PAT path, not a speculative OAuth client-registration flow.

## Credential flow

The reader creates one fine-grained personal access token in personal GitHub settings. The Speakeasy AI Control Plane needs one value:

| Value | Origin | Destination |
| --- | --- | --- |
| Personal access token | GitHub displays it after **Generate token** in {#generate-personal-access-token} | Static secret value for the `Authorization` upstream header; prefix the copied token with `Bearer ` |

The token should use the smallest resource owner, repository selection, and permissions that cover the GitHub work the application owner approved. GitHub's MCP server can use many GitHub APIs, and GitHub's documentation deliberately tells the user to enable only permissions they are comfortable granting; it does not publish one universal fine-grained permission set for every possible MCP use.

No redirect or callback value is used for the PAT Authentication Option, so `{{ gram.oauth.callback_url }}` is not pasted into GitHub.

## Console walkthrough

### Open fine-grained token settings {#open-fine-grained-token-settings}

- From any page on `github.com`, click the profile picture in the upper-right corner, then **Settings**. In the left sidebar click **Developer settings**. Under **Personal access tokens**, click **Fine-grained tokens**. Click **Generate new token**.
- Direct entry URL: `https://github.com/settings/personal-access-tokens/new` (sign-in may be required).
- GitHub requires the account's email address to be verified before token creation.
- Values entered or copied: none yet.
- Screenshot note: the **Fine-grained personal access tokens** page with **Generate new token** visible, with account-identifying details redacted.

### Configure token access {#configure-token-access}

- In **Token name**, enter a recognizable name such as `Speakeasy AI Control Plane`.
- In **Expiration**, choose an expiration allowed by organizational policy. GitHub notes that an organization or enterprise owner may enforce a maximum token lifetime.
- **Description** is optional.
- Under **Resource owner**, select the user or organization whose resources the connection needs. An organization will not appear if it blocks fine-grained PATs.
- If GitHub shows the organization-approval justification box, enter the justification supplied by the application or cloud security owner.
- Under **Repository access**, select the smallest repository set that meets the approved use. If **Only select repositories** is selected, use **Selected repositories** to choose them.
- Under **Permissions**, grant the minimum repository, organization, and account permissions needed for the approved GitHub operations. The provider does not define a universal MCP permission preset; obtain the exact GitHub permission names and access levels from the application owner rather than granting broad speculative access.
- Transition: after the fields are complete, the next control is **Generate token**.
- Values copied: none.
- Screenshot note: the token form showing **Resource owner**, **Repository access**, and **Permissions**, with owner and repository names redacted.

### Generate and copy the token {#generate-personal-access-token}

- Click **Generate token**.
- Copy the generated token immediately into a password manager for transfer to the Speakeasy AI Control Plane. Treat it as a secret.
- If the selected organization requires approval, the token is marked `pending` and can read only public resources until an organization administrator approves it. Wait for approval before attempting the first connection; an organization owner's own request is automatically approved.
- Approver handoff: an organization owner clicks their profile picture, selects **Your organizations**, and clicks **Settings** beside the organization. In the sidebar, under **Third-party Access**, the owner selects **Personal access tokens**, then **Pending requests**. The owner opens the token request, reviews its access and permissions, clicks **Approve**, and confirms **Approve** in the confirmation dialog.
- If the token is not retained, create a replacement token before continuing; do not place token text in the Guide, screenshots, command lines, or tickets.
- Screenshot exception: the useful state contains the credential itself and must not be captured.

## Speakeasy setup

The operator override `speakeasy_add_server: catalog` forces the catalog-only path. The Pulse tenant lookup corroborates catalog presence: **present**, matched registry `name="io.github.github/github-mcp-server"`, title **GitHub**. The Guide therefore renders only the catalog path and no Custom remote alternative.

Per-guide values:

- Remote URL: `https://api.githubcopilot.com/mcp/`
- Transport: `streamable-http` (the add form's **Transport** field is read-only)
- Authentication Option: `personal-access-token`
- Credential field: **Personal access token**, produced by {#generate-personal-access-token}
- Upstream header: name `Authorization`; **Value source** `Static value`; secret value `Bearer ` followed by the copied PAT; **Secret** checked
- Further reading: `https://github.com/github/github-mcp-server/blob/main/docs/remote-server.md`

### Add the server in Speakeasy {#add-server-in-speakeasy}

In the Speakeasy AI Control Plane sidebar, under **Connect**, select **Sources**, then click **Add Source**. Choose **3rd-party server**. On the **MCP Catalog** page, use **Search MCP servers...** to find `GitHub`, open the GitHub entry with **View**, and click **Add**. In the **Add to Project** dialog, click **Add to Project**. If that dialog presents **Upstream headers**, the credential can be entered there using the values below; otherwise add it from **Settings** after installation.

This creates the hosted MCP server and opens its **Overview** page.

Screenshot note: the GitHub entry on the **MCP Catalog** page with **View** or **Add** visible.

### Connect your credentials {#connect-speakeasy-credentials}

From the server's **Overview**, open **Settings**. Under **Upstream Headers**, click **Add header**. Enter `Authorization` as **Header name**, leave **Value source** as **Static value**, and paste `Bearer ` followed immediately by the personal access token from {#generate-personal-access-token}. Check **Secret**, then click **Save**. Catalog installs may present the same fields earlier under **Upstream headers** in the **Add to Project** dialog.

Screenshot note: the **Upstream Headers** editor with `Authorization`, **Static value**, and **Secret** visible and the value redacted.

Closing pointer: This guide covers setup only. For anything beyond it — billing, tool behavior, limits — see GitHub's MCP documentation at `https://github.com/github/github-mcp-server/blob/main/docs/remote-server.md`.

## Open questions

None.

## Provenance

### Source inventory and ruling

The north star is GitHub's purpose-built **Remote GitHub MCP Server** document in the official `github/github-mcp-server` repository. GitHub Docs' MCP page corroborates the hosted URL and PAT bearer-header example. GitHub Docs' personal-access-token procedure supplies the exact browser navigation, form labels, policy behavior, and approval caveat. Live endpoint observations corroborate the bearer authentication model and OAuth metadata. No material source conflict was found; GitHub Docs sometimes labels compatible IDE transport choices “HTTP/SSE,” while the current server repository uses `type: http`, which this Guide normalizes to schema transport `streamable-http`.

- `https://github.com/github/github-mcp-server/blob/main/docs/remote-server.md` — observed 2026-07-31T20:49:47Z. Backs the hosted URL, HTTP configuration, and remote-server status.
- `https://docs.github.com/en/copilot/how-tos/context/model-context-protocol/extending-copilot-chat-with-mcp` — observed 2026-07-31T20:49:47Z. Backs the same hosted URL, OAuth availability in supported first-party clients, and the PAT configuration using `Authorization: Bearer YOUR_PAT_HERE`.
- `https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens#creating-a-fine-grained-personal-access-token` — observed 2026-07-31T20:49:47Z. Backs the fine-grained-token navigation, exact form labels, verified-email requirement, minimum-access guidance, policy limits, generation action, and pending-approval behavior.
- `https://docs.github.com/en/organizations/managing-programmatic-access-to-your-organization/reviewing-and-revoking-personal-access-tokens-in-your-organization#reviewing-fine-grained-personal-access-token-requests` — observed 2026-07-31T20:49:47Z. Backs the organization-owner navigation through the profile menu, **Your organizations**, organization **Settings**, **Third-party Access**, **Personal access tokens**, and **Pending requests**, plus the request review, **Approve**, and confirmation controls.
- `https://github.com/github/github-mcp-server/blob/main/README.md` — observed 2026-07-31T20:49:47Z. Backs GitHub's statement that the server can use many GitHub APIs and that PAT permissions should be limited to what the user is comfortable granting.
- `https://api.githubcopilot.com/mcp/` — observed 2026-07-31T20:49:47Z. An unauthenticated request returned HTTP 401 with a Bearer challenge and protected-resource metadata locator.
- `https://api.githubcopilot.com/.well-known/oauth-protected-resource/mcp/` — observed 2026-07-31T20:49:47Z. Backs the canonical resource URL, bearer-header support, authorization-server identity, and advertised OAuth scopes.
- `https://github.com/.well-known/oauth-authorization-server/login/oauth` — observed 2026-07-31T20:49:47Z. Backs the absence of a dynamic registration endpoint in GitHub's authorization-server metadata.
- `doctrine/speakeasy-setup.md` — observed 2026-07-31T20:49:47Z. Backs all Speakeasy AI Control Plane labels, catalog path, PAT upstream-header procedure, anchors, and closing-pointer text.
- Pulse tenant catalog lookup, registry name `io.github.github/github-mcp-server`, title `GitHub` — observed 2026-07-31T20:49:47Z, `source: pulsemcp`. Backs catalog presence and catalog-only path selection.
