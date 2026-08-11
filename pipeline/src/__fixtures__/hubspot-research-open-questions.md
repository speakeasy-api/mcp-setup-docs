## Open questions

- **Which permission gates the Development workspace / MCP Auth Apps.**
  No HubSpot source names the permission required to see **Development**
  in the main navigation or to create an MCP auth app. The KB
  user-permissions guide's **Developer tools access** (Account tab >
  Settings access; covers "app management" among "developer features")
  is the closest documented candidate — recorded as a flagged inference.
  The guide's only Super Admin requirement in this area is scoped to
  private apps, a different app type; whether Super Admin is required
  for MCP auth apps is unknown.
- **MCP Auth Apps beta status.** The MCP Auth Apps UI was announced as
  public beta (changelog 2026-01-20) and still labeled "Public Beta" in
  the Spring 2026 Spotlight (2026-04-14), but the current setup page
  shows no beta badge or label anywhere (checked explicitly this run),
  and no MCP-auth-apps GA announcement was found in the changelog
  through July 2026 (targeted search this run; newest MCP entry remains
  the June 2026 rollup, 2026-06-29). Current status is ambiguous; the
  draft should not assert "public beta" as current fact.
- **Admin-connects-first mechanics.** Only the overview page states the
  admin must connect first; no source defines which admin role
  qualifies, or what error/experience a non-admin user gets when
  connecting before any admin has. Needs console verification or
  provider confirmation.
- **"New HubSpot Developer Platform" prerequisite.** The overview page
  says "To use the HubSpot MCP Server, you must be on the new HubSpot
  Developer Platform"; the setup page and GA changelog state no such
  prerequisite ("generally available to all HubSpot accounts"). Whether
  older, non-migrated accounts lack the **Development** navigation entry
  is undocumented. The overview's statement may be stale beta-era text.
- **End-user authorization control labels.** HubSpot documents that the
  user selects an account, grants permissions, and authorizes the
  connection, but the public setup page does not name the current buttons
  or show extractable labels for those controls. The Guide must direct the
  reader to complete HubSpot's on-screen prompts without inventing labels.

