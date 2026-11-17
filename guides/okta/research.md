# Okta Managed MCP Server research

Observed November 17, 2026.

| Anchor or topic | Evidence |
| --- | --- |
| `{#enable-okta-mcp}` | [Okta Early Access release notes](https://help.okta.com/mcp/en-us/content/topics/releasenotes/mcpserver/versions/release-mcp-2026-08-19.htm) confirm org enablement and IAM and OIG support. [Enable self-service features](https://help.okta.com/oie/en-us/content/Topics/security/manage-ea-and-beta-features.htm) gives the Settings > Features path and subscription eligibility. The application’s `OktaTask.tsx` names the two feature selections. |
| `{#configure-oidc-app}`, `{#grant-app-access}`, `{#copy-client-credentials}` | [OIDC with PKCE](https://help.okta.com/mcp/en-us/content/topics/mcpserver/oidc-pkce-browser-based.htm) documents app types, Authorization Code, redirect URIs, users and groups, API scope grants, and PKCE. `OktaTask.tsx` and `okta.ts` constrain the guided flow to Web and Native apps and map their OAuth credential types. |
| Scope-dependent tools | [Scope-based tool loading](https://help.okta.com/mcp/en-us/content/topics/mcpserver/scope-based-tool-loading.htm) documents token scope filtering and permission errors. `useProviderConnection.ts` leaves Okta scopes to sign-in discovery. |
| `guided-setup`, registry identity and endpoint | Application source at `0aae37a1b459a7b5697286fe29c4eafa5b3c23ff`, under `client/dashboard/src/pages/catalog/`. `account-provider.ts` and `provider-setup/okta.ts` use `com.okta/managed-mcp` and `https://{yourOktaDomain}/mcp`. `provider-setup/state.ts` defines the setup sequence. `okta.ts` defines public org hosts, org issuer and OAuth endpoints. |
| `add-server-in-speakeasy`, `connect-speakeasy-credentials` | `doctrine/speakeasy-setup.md` defines entry points. Current app `lib/remote-identity/drafts/useIdentityDraft.ts` sets token authentication to `none` when a manual client secret is empty. `model/clientConfiguration.ts` prefers `client_secret_basic` when supported for a confidential client. |

## Provider setup anchors

### Enable Okta Managed MCP Server {#enable-okta-mcp}

### Configure an OIDC app {#configure-oidc-app}

### Assign users and grant scopes {#grant-app-access}

### Copy the client credentials {#copy-client-credentials}

The guide resolves by catalog alias and by guide slug. The generator excludes placeholder endpoints from its exact URL index. Looking up an Okta org URL without the catalog alias therefore does not resolve this guide. No live Okta OAuth or tool discovery was exercised.
