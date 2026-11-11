---
research_version: 1
slug: azure-devops
researched_at: "2026-11-11T03:36:58Z"
---

# Azure DevOps — Research Dossier

This Guide was written by the catalogue worker for Linear GRW-448, not drafted by the factory pipeline. Facts come from Microsoft Learn, unauthenticated probes of the live endpoint and Entra metadata, and the Speakeasy dashboard and server source at `speakeasy-api/gram` main `979772340b024c32a4ba2637d6ae8de591d1ec2a` (2026-11-10). The ticket's own app-registration steps from an earlier rollout were treated as a lead, then checked against Microsoft's pages. No Entra tenant or Azure DevOps organization was available, so no end-to-end sign-in was performed.

## Server facts

- **Product:** the remote Azure DevOps MCP Server, hosted by Microsoft, for Azure DevOps Services. Free to use; normal Azure DevOps pricing applies (overview page).
- **Remote:** `https://mcp.dev.azure.com/{organization}`, streamable HTTP. The organization segment is the bare name (`contoso`), not the full `dev.azure.com` URL. The base URL `https://mcp.dev.azure.com/` also works, but every tool call must then name the organization, and guest (B2B) users must use the organization URL. The Guide uses the organization URL, so the remote is `tenanted: true`.
- **Authentication:** Microsoft Entra ID OAuth only; personal access tokens are not supported on the remote server. The organization must be backed by an Entra tenant; standalone Microsoft account organizations are not supported. Entra does not support dynamic client registration, so clients other than Microsoft's own need a custom app registration.
- **Probe, 2026-11-11T03:36:58Z:** an unauthenticated `initialize` POST to `https://mcp.dev.azure.com/fabrikam` returned `401` with `WWW-Authenticate: Bearer resource_metadata="https://mcp.dev.azure.com/.well-known/oauth-protected-resource/fabrikam"`. No `scope` parameter in the challenge.
- **Protected-resource metadata:** `resource` `https://mcp.dev.azure.com/fabrikam`, `authorization_servers` `["https://login.microsoftonline.com/organizations/v2.0"]`, `scopes_supported` `["https://mcp.dev.azure.com/.default"]`, `bearer_methods_supported` `["header"]`. The base URL answers the same way with `resource` `https://mcp.dev.azure.com`.
- **Entra metadata, 2026-11-11:** `https://login.microsoftonline.com/organizations/v2.0/.well-known/openid-configuration` publishes the placeholder `issuer` `https://login.microsoftonline.com/{tenantid}/v2.0`, no `registration_endpoint`, no CIMD support, token endpoint auth methods `client_secret_post`, `private_key_jwt`, `client_secret_basic`, `self_signed_tls_client_auth`, and `scopes_supported` `openid profile email offline_access`. The RFC 8414 path returns 404. The tenant-specific document is self-consistent: issuer `https://login.microsoftonline.com/<TENANT_ID>/v2.0`, authorization `…/<TENANT_ID>/oauth2/v2.0/authorize`, token `…/<TENANT_ID>/oauth2/v2.0/token`.
- **Authorization model:** a call succeeds only when both the delegated scope and the signed-in user's Azure DevOps permissions allow it. Enabling toolsets (`X-MCP-Toolsets`, `X-MCP-Tools`, `X-MCP-Readonly`) does not grant permissions; headers are out of guide scope.
- **`speakeasy_add_server: custom-remote`:** the remote is organization-specific, so the Custom remote path applies regardless of catalog presence. No Pulse lookup was performed.

## Credential flow

- `confirm-enterprise-application` checks that Microsoft's **Azure DevOps MCP** enterprise application (`2a72489c-aab2-4b65-b93a-a91edccf33b8`) exists in the tenant, and creates its service principal with `az ad sp create` when it does not.
- `register-entra-application` creates a single-tenant app with a **Web** redirect URI of `{{ gram.oauth.callback_url }}`, entered directly in the registration form. It produces the **Application (client) ID** and the **Directory (tenant) ID**.
- `add-azure-devops-permissions` adds delegated permissions on the Azure DevOps MCP API and grants admin consent.
- `create-client-secret` produces the client secret **Value**, shown once.
- In Speakeasy, the tenant ID builds the corrected issuer URL, and the client ID and secret go into the **Manual** client.

## Console walkthrough

The Entra admin center (`https://entra.microsoft.com`) is the starting point for app registration; Microsoft's troubleshooting page uses the Azure portal (`https://portal.azure.com`) **Microsoft Entra ID > Enterprise applications** for the enterprise-app check, so the Guide follows that page for the first step.

### Confirm the Azure DevOps MCP application {#confirm-enterprise-application}

- Azure portal > **Microsoft Entra ID > Enterprise applications**, **Application type** set to **All applications**, search **Azure DevOps MCP** or the app ID.
- If missing, a user with Application Administrator, Cloud Application Administrator, or Global Administrator runs `az login --tenant <yourTenantId> --allow-no-subscriptions` and `az ad sp create --id 2a72489c-aab2-4b65-b93a-a91edccf33b8`. Microsoft's page also gives `az rest` checks before and after (404 `Request_ResourceNotFound`, then 200 with `"displayName": "Azure DevOps MCP"`); the Guide links to them rather than repeating them.
- Screenshot note: the Enterprise applications search with the Azure DevOps MCP row visible.

### Register the Entra application {#register-entra-application}

- **App registrations > New registration**, name, **Supported account types** = **Accounts in this organizational directory only**, **Redirect URI** platform **Web** = `{{ gram.oauth.callback_url }}`, **Register**; record **Application (client) ID** and **Directory (tenant) ID** from **Overview**. Registration labels follow Microsoft's quickstart and `guides/microsoft-365`.
- Microsoft's Cursor desktop and Claude Code instructions use a **Mobile and desktop applications** localhost redirect and turn on **Allow public client flows**; its Cursor Cloud Agents instructions add a **Web** redirect and a client secret. Speakeasy matches the Cloud Agents pattern, so public client flows stay off. The ticket's earlier rollout made the same choices.
- Single tenant is deliberate: the Speakeasy authorization server is pinned to the tenant issuer, so a multitenant app adds no reach.
- Screenshot note: the registration form with single tenant and the Web redirect URI.

### Add the Azure DevOps MCP permissions {#add-azure-devops-permissions}

- **API permissions > Add a permission > APIs my organization uses**, search **Azure DevOps MCP** or the app ID, select the delegated permissions, **Add permissions**, then **Grant admin consent**. A tenant administrator may need to grant consent.
- Microsoft's least-privilege guidance: read scopes for read-only use, write or manage scopes only when needed, avoid inherited duplicates; scope definitions are on the Azure DevOps OAuth scopes page (for example `vso.code`, `vso.work`, `vso.build`).
- Screenshot note: the API permissions list with Azure DevOps MCP permissions and the consent status.

### Create a client secret {#create-client-secret}

- **Certificates & secrets > Client secrets > New client secret**, description, expiry, **Add**, copy the **Value**.
- Recovery: the value appears only once. If it was not copied, create another secret before continuing.
- Screenshot note: the new secret row with the value redacted.

## Speakeasy setup

Canonical source: `doctrine/speakeasy-setup.md` (gram main `68b3f78`, 2026-09-30), re-checked against `speakeasy-api/gram` main `979772340b024c32a4ba2637d6ae8de591d1ec2a` on 2026-11-11.

Per-guide values:

- Remote URL: `https://mcp.dev.azure.com/<organization>`, streamable HTTP, tenanted. Path: Custom remote (**Hosted remotely**).
- Identity mode: **User Identity**. The 401 with `resource_metadata` makes **Verify connectivity** preselect it.
- Creation outcome: `configureCreatedIdentity.ts` finds no saved provider for `https://login.microsoftonline.com/organizations/v2.0`, and metadata fetch fails because the server-side discovery refuses a document whose issuer differs from the requested one (`issuerhandlers.go`, "metadata document advertises issuer … but the requested issuer is …"). Nothing is created; `CreateRemoteMcp.tsx` toasts "MCP server added but kept disabled." and navigates to the server's Settings identity section. The doctrine text says Save opens **Overview**; the source shows this setup-required case opens Settings instead, so the Guide says that.
- Issuer correction: since gram 6b4e99a801 (2026-10-20), when discovery for a provider badged **Will be created** fails, `ProviderRow.tsx` opens an inline editor with the error, an **Issuer URL** field, **Discover** (then **Check again**), and **Reset to advertised URL**, and shows "OAuth metadata discovered. Save to finish setup." on success. Save creates the provider from the corrected issuer and its discovered endpoints (`useIdentityDraft.ts`). The Guide uses this instead of the doctrine's custom-provider route, whose labels changed (see limitations).
- Registration: **Manual** (no DCR, no CIMD). Fields **Client ID**, **Client secret** (placeholder "Optional"), and under **Advanced**, a **Scope** multi-select that accepts typed values.
- Scope: `openid`, `profile`, `offline_access`, `https://mcp.dev.azure.com/.default`. A blank client scope falls through `Client.RequestedScopes` to the resource's `scopes_supported`, which is only `.default`; Entra v2 issues refresh tokens only when `offline_access` is requested. `.default` requests the delegated permissions consented on the app for that resource, and OpenID scopes may be combined with it (Entra scopes page).
- Existing Microsoft provider: `useIdentityDraft.ts` preselects any visible authorization server on the same host (`login.microsoftonline.com`) instead of offering a new one, and then no correction editor appears. The Guide covers that case with the picker's **Create a custom authorization server** link, which opens the organization page with **New Authorization Server** (requires organization admin), **Issuer URL**, **Discover**, and **Create**.
- Enable: **Settings > Danger Zone > Server Availability**, **Enable MCP server**.
- Further reading: `https://learn.microsoft.com/en-us/azure/devops/mcp-server/remote-mcp-server?view=azure-devops`.
- Error codes in the Guide come from Microsoft's Cursor Cloud Agents section (`AADSTS50011`, `AADSTS7000218`) and troubleshooting page (`AADSTS65001`, `AADSTS700016`).

## Research limitations

- **No end-to-end sign-in.** No tenant or organization was available. The Speakeasy flow is verified from source only.
- **Delegated permission names.** The list Entra shows under the Azure DevOps MCP API was not observed. Microsoft's remote-server page points to the Azure DevOps OAuth scopes page for scope definitions, so the Guide links there rather than naming a required set.
- **Resource indicator.** Speakeasy sends the RFC 8707 `resource` parameter (`https://mcp.dev.azure.com/<organization>`) alongside the `.default` scope, and retries without it only on `invalid_target`. Microsoft's Claude Code instructions use the organization URL with a custom client, which suggests Entra accepts it, but this was not confirmed. The Guide keeps a troubleshooting line, as `guides/microsoft-365` does.
- **Token endpoint auth method.** Chosen automatically from the issuer metadata. `guides/work-iq` found `client_secret_post` resolved `invalid_client` with Entra; the Manual surface for a new client has no control for it, so the Guide does not name one.
- **Doctrine label drift.** At gram `979772340b`, these doctrine labels are absent: **Choose an identity provider** and **Search identity providers…** (now an "Authorization server" picker and **Search authorization servers…**), **Create a custom identity provider** (now **Create a custom authorization server**, gram ead238ec20, 2026-10-19), **New Remote Identity Provider** (now **New Authorization Server**), and **Existing client** (now **New from existing**, gram 8b1ec11194, 2026-11-10). The Guide avoids the absent labels. `doctrine/speakeasy-setup.md` needs a human-approved refresh.
- **Provisioning output.** The `az ad sp create` steps are Microsoft's; their output was not observed.

## Operator decisions

None.

## Provenance

Source inventory: Microsoft Learn overview (`mcp-server-overview`), remote server setup (`remote-mcp-server`), remote troubleshooting (`remote-mcp-server-troubleshooting`), Azure DevOps OAuth scopes (`integrate/get-started/authentication/oauth`), Entra scopes and `.default` (`entra/identity-platform/scopes-oidc`), Entra app registration quickstart. The remote-server FAQ URL linked from older material returned 404; its content now lives on the setup and troubleshooting pages.

- `https://learn.microsoft.com/en-us/azure/devops/mcp-server/mcp-server-overview?view=azure-devops` — observed 2026-11-11. Product overview, remote vs local, pricing, toolsets.
- `https://learn.microsoft.com/en-us/azure/devops/mcp-server/remote-mcp-server?view=azure-devops` — ms.date 2026-09-21, observed 2026-11-11T03:30Z. URL format, prerequisites, Entra-only auth, no DCR, least-privilege scopes, enterprise app ID, app-registration steps, Cloud Agents Web redirect and secret pattern, `AADSTS50011` and `AADSTS7000218`, organization URL for Claude Code.
- `https://learn.microsoft.com/en-us/azure/devops/mcp-server/remote-mcp-server-troubleshooting?view=azure-devops` — ms.date 2026-07-31, observed 2026-11-11T03:31Z. Enterprise application provisioning (`az ad sp create`, required roles, portal check), base URL vs organization URL, guest users, PATs unsupported, AADSTS codes.
- `https://learn.microsoft.com/en-us/azure/devops/integrate/get-started/authentication/oauth?view=azure-devops#oauth-scopes` — ms.date 2025-07-14, observed 2026-11-11T03:32Z. Scope names, inheritance, least privilege.
- `https://learn.microsoft.com/en-us/entra/identity-platform/scopes-oidc` — ms.date 2025-07-24, observed 2026-11-11T03:33Z. `offline_access` required for refresh tokens on v2.0; `.default` semantics.
- `https://learn.microsoft.com/en-us/entra/identity-platform/quickstart-register-app` — Microsoft's registration guide, linked from the Guide; registration labels as carried in `guides/microsoft-365` (merged 2026-11-10).
- `https://mcp.dev.azure.com/fabrikam` and its protected-resource metadata — probed 2026-11-11T03:36:58Z (`fabrikam` is a placeholder organization name).
- `https://login.microsoftonline.com/organizations/v2.0/.well-known/openid-configuration` and a tenant-specific equivalent — fetched 2026-11-11.
- `speakeasy-api/gram` at `979772340b024c32a4ba2637d6ae8de591d1ec2a` (2026-11-10) — `client/dashboard/src/pages/sources/remote-mcp/{CreateRemoteMcp.tsx,configureCreatedIdentity.ts}`, `client/dashboard/src/lib/remote-identity/{components/ProviderRow.tsx,components/ScopeMultiSelect.tsx,drafts/useIdentityDraft.ts}`, `client/dashboard/src/pages/remote-identity-providers/{RemoteIdentityProviders.tsx,CreateRemoteIdentityProviderSheet.tsx}`, `server/internal/remotesessions/{issuerhandlers.go,challenge.go}`. Backs every Speakeasy label, the creation outcome, the issuer correction, scope resolution, and the resource-indicator retry.
- `doctrine/speakeasy-setup.md` (gram main `68b3f78`, 2026-09-30) — observed 2026-11-11. Canonical skeleton and fixed anchors.
- `guides/microsoft-365` and `guides/work-iq` — Entra console labels, secret handling, and the `client_secret_post` finding.
