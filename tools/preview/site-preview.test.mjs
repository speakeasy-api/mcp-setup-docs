import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { main, canRequestPreview, eligible, previewOrigin, changedSlugs, commentBody, updateComment, githubClient, paginate, marker, repository } from "./site-preview.mjs";

const sha = "a".repeat(40);
function pull(overrides = {}) {
  return { state: "open", draft: true, base: { ref: "main", repo: { full_name: repository } },
    head: { sha, repo: { full_name: repository } }, ...overrides };
}

test("only writers and maintainers can request a deployment", () => {
  for (const permission of ["read", "triage", "none", "", undefined]) assert.equal(canRequestPreview(permission), false);
  for (const permission of ["write", "maintain", "admin"]) assert.equal(canRequestPreview(permission), true);
});

test("same-repository drafts are eligible", () => {
  assert.equal(eligible(pull(), sha), true);
});

test("forks, closed, wrong-base and superseded PRs are skipped", () => {
  for (const pr of [
    pull({ state: "closed" }),
    pull({ head: { sha, repo: { full_name: "example/fork" } } }),
    pull({ base: { ref: "other", repo: { full_name: repository } } }),
    pull({ base: { ref: "main", repo: { full_name: "example/other" } } }),
    pull({ head: { sha: "b".repeat(40), repo: { full_name: repository } } }),
  ]) assert.equal(eligible(pr, sha), false);
});

test("untrusted refs must be full SHAs", () => {
  for (const ref of ["main", "abc123", "$(command)", "../main", "", undefined]) {
    assert.throws(() => eligible(pull(), ref), /full PR commit SHA/);
  }
});

test("deployment URL accepts only a plain HTTPS Vercel preview origin", () => {
  assert.equal(previewOrigin("CLI progress\nhttps://example-preview.vercel.app\n"), "https://example-preview.vercel.app");
  for (const value of [
    "https://www.speakeasy.com", "http://example.vercel.app", "https://vercel.app",
    "https://example.vercel.app.evil.example", "https://example.vercel.app/path",
    "https://user:secret@example.vercel.app", "https://example.vercel.app?token=secret",
    "https://example.vercel.app/#fragment", "https://example.vercel.app:444",
  ]) assert.throws(() => previewOrigin(value));
});

test("guide links use only safe changed paths and omit removed guides", () => {
  assert.deepEqual(changedSlugs([
    { filename: "guides/example-service/meta.yaml", status: "modified" },
    { filename: "guides/example-service/speakeasy.md", status: "added" },
    { filename: "guides/removed/meta.yaml", status: "removed" },
    { filename: "guides/unsafe](url)/meta.yaml", status: "added" },
    { filename: ".github/workflows/other.yml", status: "added" },
  ]), ["example-service"]);
});

test("ready and failed comments identify the commit and workflow", () => {
  const args = { sha, requestId: "1", runUrl: "https://github.com/example/repo/actions/runs/1" };
  const ready = commentBody({ ...args, state: "ready", origin: "https://example.vercel.app", slugs: ["example-service"] });
  assert.ok(ready.startsWith(marker));
  assert.ok(ready.includes(`/guides/example-service)`));
  assert.ok(ready.includes(sha));
  assert.ok(ready.includes("does not test server installation or OAuth"));
  const failed = commentBody({ ...args, state: "failed" });
  assert.ok(failed.includes("could not be built"));
  assert.ok(!failed.includes("undefined"));
});

test("only the workflow bot's own marked comment is updated", async () => {
  const calls = [];
  const api = async (path, method = "GET", body) => {
    calls.push({ path, method, body });
    if (path === "pulls/7") return pull();
    if (path === "issues/comments/3" && method === "GET") return { body: `${marker}\n<!-- mcp-setup-docs-preview-request:1 -->` };
    if (path.startsWith("issues/7/comments?")) return [
      { id: 1, user: { login: "example-reviewer" }, body: marker },
      { id: 2, user: { login: "github-actions[bot]" }, body: "Other automation" },
      { id: 3, user: { login: "github-actions[bot]" }, body: marker },
    ];
    return {};
  };
  assert.equal(await updateComment(api, "7", sha, "Preview body", "1"), true);
  assert.deepEqual(calls.filter(c => c.method !== "GET"), [
    { path: "issues/comments/3", method: "PATCH", body: { body: "Preview body" } },
  ]);
});

test("a human's copied marker is not overwritten", async () => {
  const writes = [];
  const api = async (path, method = "GET", body) => {
    if (method !== "GET") { writes.push({ path, method, body }); return {}; }
    if (path === "pulls/7") return pull();
    return [{ id: 1, user: { login: "example-reviewer" }, body: marker }];
  };
  await updateComment(api, "7", sha, "Preview body", "1", true);
  assert.equal(writes[0].path, "issues/7/comments");
  assert.equal(writes[0].method, "POST");
});

test("a head update during comment lookup prevents a stale ready reply", async () => {
  let reads = 0;
  const api = async (path, method = "GET") => {
    assert.equal(method, "GET", "Must not write after a head change");
    if (path === "pulls/7") return ++reads === 1 ? pull() : pull({ state: "closed" });
    return [];
  };
  assert.equal(await updateComment(api, "7", sha, "Preview body", "1"), false);
});

test("API failures do not echo provider bodies or token values", async () => {
  const api = githubClient("test-secret", async () =>
    new Response("private provider diagnostic test-secret", { status: 403 }));
  await assert.rejects(api("pulls/7"), error => error.message === "GitHub GET failed (403)");
});

test("prepare denies a read-only requester before PR reads or writes", async t => {
  let requests = 0;
  t.mock.method(globalThis, "fetch", async (url, options) => {
    requests++;
    assert.ok(String(url).endsWith("/collaborators/example-reviewer/permission"));
    assert.equal(options.method, "GET");
    return Response.json({ permission: "read" });
  });
  await assert.rejects(main("prepare", {
    GITHUB_REPOSITORY: repository, GITHUB_ACTOR: "example-reviewer",
    GH_TOKEN: "test-token", PR_NUMBER: "7", REQUEST_ID: "1", PR_SHA: sha,
  }), /Only repository writers/);
  assert.equal(requests, 1);
});

test("prepare pins the latest head and posts progress only for a writer", async t => {
  const root = await mkdtemp(path.join(tmpdir(), "docs-preview-test-"));
  const writes = [];
  t.mock.method(globalThis, "fetch", async (input, options) => {
    const url = new URL(input);
    if (options.method !== "GET") {
      writes.push({ url: url.pathname, body: JSON.parse(options.body) });
      return Response.json({});
    }
    if (url.pathname.endsWith("/permission")) return Response.json({ permission: "write" });
    if (url.pathname.endsWith("/pulls/7")) return Response.json(pull());
    if (url.pathname.endsWith("/files")) return Response.json([{ filename: "guides/example/meta.yaml", status: "added" }]);
    if (url.pathname.endsWith("/comments")) return Response.json([]);
    throw new Error("Unexpected API path");
  });
  try {
    for (const mode of ["authorize", "prepare"]) {
      const output = path.join(root, mode);
      await main(mode, {
        GITHUB_REPOSITORY: repository, GITHUB_ACTOR: "example-reviewer",
        GH_TOKEN: "test-token", PR_NUMBER: "7", REQUEST_ID: "1", PR_SHA: sha, GITHUB_OUTPUT: output, GITHUB_RUN_ID: "1",
      });
      assert.equal(await readFile(output, "utf8"), `enabled=true\nsha=${sha}\n`);
      assert.equal(writes.length, mode === "authorize" ? 0 : 1);
    }
    assert.ok(writes[0].body.body.includes(sha));
    assert.ok(writes[0].body.body.includes("Building a preview"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("publish skips a superseded head without reading a deployment file", async t => {
  let requests = 0;
  t.mock.method(globalThis, "fetch", async (_url, options) => {
    requests++;
    assert.equal(options.method, "GET");
    return Response.json(pull());
  });
  await main("publish", {
    GITHUB_REPOSITORY: repository, GH_TOKEN: "test-token", PR_NUMBER: "7", REQUEST_ID: "1",
    PR_SHA: "b".repeat(40), DEPLOY_OUTCOME: "success", DEPLOYMENT_OUTPUT: "/does-not-exist",
  });
  assert.equal(requests, 1);
});

test("older requests cannot overwrite a newer result for the same commit", async () => {
  const writes = [];
  const api = async (path, method = "GET") => {
    if (method !== "GET") { writes.push(path); return {}; }
    if (path === "pulls/7") return pull();
    const comment = { id: 3, user: { login: "github-actions[bot]" },
      body: `${marker}\n<!-- mcp-setup-docs-preview-request:2 -->\nNewer preview ready` };
    return path === "issues/comments/3" ? comment : [comment];
  };
  assert.equal(await updateComment(api, "7", sha, "Older failed preview", "1"), false);
  assert.equal(await updateComment(api, "7", sha, "Older building preview", "1", true), false);
  assert.deepEqual(writes, []);
  assert.equal(await updateComment(api, "7", sha, "Current preview", "2"), true);
  assert.deepEqual(writes, ["issues/comments/3"]);
});

test("pagination reads beyond the first hundred changed files or comments", async () => {
  let reads = 0;
  const items = await paginate(async path => {
    reads++;
    assert.ok(path.includes(`page=${reads}`));
    return reads === 1 ? Array(100).fill({}) : [{}];
  }, "pulls/7/files");
  assert.equal(items.length, 101);
  assert.equal(reads, 2);
});
