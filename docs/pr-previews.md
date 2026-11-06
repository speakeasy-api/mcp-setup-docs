# Setup guide PR previews

Comment **`/preview-docs`** on an open PR that changes `guides/` to render its
guides with the marketing site's real Astro/Starlight renderer. Draft PRs are
supported. The requester must have write, maintain or admin access. The workflow
updates one bot comment with the commit, preview URL and changed-guide links, or a
workflow link if the build fails.

The first version is explicitly requested, not automatic on pushes. After a new
commit, comment `/preview-docs` again. Ordinary comments and bot replies do not
start builds. Only PR branches in this repository are supported initially; fork
PRs never receive deployment credentials or trigger a deployment.

## One-time configuration

1. Merge [marketing-site #2659](https://github.com/speakeasy-api/marketing-site/pull/2659),
   which supports `MCP_SETUP_DOCS_PREVIEW_SHA`.
   The preview workflow refuses to deploy marketing code without that guard.
2. Merge the preview workflows and scripts in this repository. The command runs
   from trusted `main`, so it cannot preview itself before landing there.
3. Add these **repository secrets** in this repository:
   - `MARKETING_SITE_READ_TOKEN`: a GitHub credential with **Contents: read** on
     `speakeasy-api/marketing-site`. Do not grant write access for this checkout.
   - `VERCEL_TOKEN`: a deployment credential for the team that owns the existing
     marketing-site Vercel project, scoped as narrowly as the account supports.
4. Add these **repository variables**:
   - `VERCEL_ORG_ID`: the Vercel team ID.
   - `VERCEL_PROJECT_ID`: the existing marketing-site project ID.
5. Check the project's Preview environment, build settings, Deployment Protection
   and retention before enabling builds. Reviewers may need to sign into Vercel
   to open protected previews. Do not put production-only credentials in Preview.
   If an external code-review Automation listens to all human PR comments, have
   it ignore `/preview-docs` as a CI command rather than treating it as feedback.
6. Comment `/preview-docs` on one internal draft PR and inspect its changed guide,
   headings and links. Confirm the reported commit matches the PR head. Push an
   edit, request another preview and confirm the same comment updates.

Use the existing, already-deployed Vercel project, not a new uninitialised project.
The CLI explicitly targets **preview**. It never uses `--prod`, a production alias,
or `VERCEL_DEPLOY_HOOK_URL`. The merge-to-main publishing hook is unchanged.
No Vercel or checkout secret is passed into the remote build by this workflow.
The remote build uses the Vercel project's existing Preview environment. If its
GitHub API quota is too low, configure a separate read-only GitHub credential in
that environment rather than passing the source PR's write-capable token.

## Source and security boundaries

- The `issue_comment` workflow checks out orchestration at the event's trusted
  default-branch SHA, never the PR head. It does not use `pull_request_target`.
- A read-only job checks requester permissions and the PR before joining the
  per-PR deployment queue. Unauthorised comments cannot cancel a preview. Builds
  run serially; the newest pending request replaces older pending requests without
  cancelling the active publisher. Result comments also carry a request ID so an
  older request cannot overwrite a newer result for the same commit.
- The marketing site is checked out from trusted `main`, without persisted Git
  credentials. Only that code is uploaded to Vercel; no code from the docs PR runs.
- The guide SHA is validated and supplied as `MCP_SETUP_DOCS_PREVIEW_SHA`. The
  marketing loader reads that immutable public snapshot directly from GitHub,
  bypassing local checkouts/cache, and fails if it resolves to a different commit.
  The loader rejects preview mode in Vercel's Production environment.
- The PR is rechecked before publishing a result. Closed PRs and superseded heads
  do not receive a stale ready comment. Pushing or closing a PR does not cancel an
  already-queued remote Vercel build. Existing deployments follow normal Vercel
  retention; the workflow does not delete them.
- PR titles and arbitrary URLs are not interpolated into shell commands or
  comments. Preview origins must be HTTPS `*.vercel.app` URLs.
- Only the workflow bot's own marked comment is updated; reviewer comments remain
  untouched. The workflow does not change branches, guide files or PR descriptions.

A preview checks the rendered documentation. It does not exercise a live MCP
server, server installation, upstream permissions or OAuth.

## Local checks

```bash
node --test tools/preview/site-preview.test.mjs
```

These tests do not contact GitHub or Vercel and need no credentials. Loader source
selection and production-isolation tests live in the marketing repo and run with
`pnpm test:mcp-previews`.
