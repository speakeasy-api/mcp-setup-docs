# AI Control Plane OAuth client capabilities

Maintained client-side evidence for guide research; AI Control Plane was formerly
Gram. Applies to **upstream remote-session OAuth**, not the Control Plane's own
login or downstream MCP client authentication. Pipeline agents must not edit it.

Verified by source inspection on 2026-09-15 at Gram revision
`4e1fef388aa0f5b498f5d35400780ff2b99815e4`. This is implementation evidence,
not a live provider acceptance test or a guarantee about every deployment.
User-facing steps and labels remain governed by `doctrine/speakeasy-setup.md`.

## Verified capabilities

| Capability | Behavior and conditions | Evidence |
| --- | --- | --- |
| Authorization code + PKCE | Generates an S256 challenge and sends the verifier in the authorization-code exchange. This is automatic, including for confidential clients; do not invent a user PKCE setup step. | [challenge.go], `mintAuthorization`, `exchangeCode` |
| Public clients | `none` sends client ID without a secret. With no recognized stored method and no secret, the resolver chooses public authentication. Provider acceptance must still be established. | [types.go], `ResolveTokenEndpointAuthMethod`; [tokenservice.go], `newTokenEndpointRequest` |
| Confidential clients | Supports `client_secret_basic` and `client_secret_post`. Explicit Basic/Post requires a nonempty secret. With no recognized stored method and a secret, defaults to Basic. Basic uses the Authorization header, Post the form body. | [types.go]; [tokenservice.go] |
| Refresh tokens | Implements the refresh-token grant using the same token-endpoint authentication helper as code exchange. Requires a provider-issued usable refresh token; support does not guarantee issuance or indefinite/background renewal. | [tokenservice.go], `refreshSessionTokens`; [auth-method tests] |
| Scope configuration | Supports configured client scopes. A nonempty issuer scope override is used verbatim; otherwise client scopes (or advertised issuer scopes when absent) are supplemented with advertised `openid`, `email`, `profile`, `offline_access`. Do not assume the entered client list is always the exact transmitted list. | [challenge.go], `RequestedScopes`; [client form] |
| Manual registration | Accepts an externally registered client ID and optional secret, token-endpoint auth method, and scope configuration. This does not establish permission to register an app at the provider. | [client form] |
| Discovery and DCR | Fetches issuer metadata. DCR is offered when an issuer advertises a registration endpoint; registration requests authorization-code and refresh-token grants. Discovery/DCR support does not establish that a particular provider permits it. | [issuerhandlers.go], `FetchRemoteSessionIssuerMetadata`; [client form]; [proxyregister.go], `RegisterDynamicClient` |
| Redirect URI | Remote-session authorization uses the configured server origin plus `/mcp/remote_login_callback`. DCR registers `/oauth/callback`, `/mcp/remote_login_callback`, and `/x/mcp/remote_login_callback`; the legacy OAuth callback forwards to the canonical callback. Use the documented/displayed URI for the relevant setup surface, not an invented hostname or localhost callback. | [challenge.go], `callbackURL`, `HandleLegacyProxyCallback`; [proxyregister.go] |

## Unsupported versus not verified

- **Unsupported on this pinned upstream path:** `private_key_jwt` token-endpoint
  authentication explicitly returns an unimplemented error in `newTokenEndpointRequest`.
- **Not verified by this reference:** other grants (including client credentials
  and device authorization), mTLS, provider-specific extensions, and deployment
  rollout state. Absence here is not evidence that they are unsupported.
- UI availability, provider app types, permissions, scopes, refresh-token issuance,
  and provider acceptance are separate questions. Do not infer them from client support.

## Research and maintenance rule

Use this reference for covered client facts; do not browse Gram or dependencies
again merely to reconfirm them. The coordinator supplies relevant claims,
conditions, and pinned source links in `client_capabilities` and
`client_source_references`; retain these in the dossier for the writer.
Research the provider's requirements and compare them against this contract.
Only a required capability missing here or concrete contradictory evidence opens
a targeted client-source fallback. Resolve that centrally, not once per topic.
An observation date alone is not a reason to repeat source research.

A maintainer updating a claim must inspect the applicable upstream path, update
its pinned source and observation date, and record the doctrine change. Never
promote a generated guide or an agent's report into client authority without
checking its underlying source.

[challenge.go]: https://github.com/speakeasy-api/gram/blob/4e1fef388aa0f5b498f5d35400780ff2b99815e4/server/internal/remotesessions/challenge.go
[types.go]: https://github.com/speakeasy-api/gram/blob/4e1fef388aa0f5b498f5d35400780ff2b99815e4/server/internal/remotesessions/types.go
[tokenservice.go]: https://github.com/speakeasy-api/gram/blob/4e1fef388aa0f5b498f5d35400780ff2b99815e4/server/internal/remotesessions/tokenservice.go
[auth-method tests]: https://github.com/speakeasy-api/gram/blob/4e1fef388aa0f5b498f5d35400780ff2b99815e4/server/internal/remotesessions/tokenservice_authmethod_test.go
[client form]: https://github.com/speakeasy-api/gram/blob/4e1fef388aa0f5b498f5d35400780ff2b99815e4/client/dashboard/src/pages/remote-identity-providers/CreateRemoteSessionClientSheet.tsx
[issuerhandlers.go]: https://github.com/speakeasy-api/gram/blob/4e1fef388aa0f5b498f5d35400780ff2b99815e4/server/internal/remotesessions/issuerhandlers.go
[proxyregister.go]: https://github.com/speakeasy-api/gram/blob/4e1fef388aa0f5b498f5d35400780ff2b99815e4/server/internal/remotesessions/proxyregister.go
