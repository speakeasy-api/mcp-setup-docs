import { readFile, appendFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const repository = "speakeasy-api/mcp-setup-docs";
export function canRequestPreview(permission) {
  return ["admin", "maintain", "write"].includes(permission);
}
export const marker = "<!-- mcp-setup-docs-preview -->";
export const guidePath = "/docs/ai-control-plane/guides";

export function eligible(pr, expectedSha) {
  if (!/^[a-f0-9]{40}$/.test(expectedSha ?? "")) {
    throw new Error("Expected a full PR commit SHA");
  }
  return pr.state === "open" && pr.base?.ref === "main" &&
    pr.base?.repo?.full_name === repository &&
    pr.head?.repo?.full_name === repository && pr.head.sha === expectedSha;
}

export function previewOrigin(output) {
  const line = output.trim().split(/\r?\n/).at(-1);
  const url = new URL(line);
  if (url.protocol !== "https:" || !/^[a-z0-9-]+\.vercel\.app$/.test(url.hostname) ||
      url.username || url.password || url.port || url.search || url.hash || url.pathname !== "/") {
    throw new Error("Expected a Vercel preview deployment URL");
  }
  return url.origin;
}

export function changedSlugs(files) {
  return [...new Set(files.filter(file => file.status !== "removed").flatMap(file => {
    const match = /^guides\/([a-z0-9]+(?:-[a-z0-9]+)*)\//.exec(file.filename);
    return match ? [match[1]] : [];
  }))].sort();
}

export function commentBody({ sha, requestId, state, origin, slugs = [], runUrl }) {
  const lines = [marker, `<!-- mcp-setup-docs-preview-request:${requestId} -->`, "### Setup guide preview", "", `Commit: \`${sha}\``, ""];
  if (state === "ready") {
    lines.push(`[Open preview](${origin}${guidePath})`, "");
    for (const slug of slugs) lines.push(`- [${slug}](${origin}${guidePath}/${slug})`);
    lines.push("", "Uses the marketing site's renderer. This does not test server installation or OAuth.");
  } else if (state === "building") {
    lines.push("Building a preview of this commit.");
  } else {
    lines.push("The preview could not be built. Check the workflow for missing configuration or build errors.");
  }
  lines.push("", `[Workflow run](${runUrl})`);
  return `${lines.join("\n")}\n`;
}

export function githubClient(token, fetcher = fetch) {
  return async (path, method = "GET", body) => {
    const response = await fetcher(`https://api.github.com/repos/${repository}/${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    // Don't echo response bodies or headers, which may contain credential or
    // provider diagnostics. GitHub's status and the workflow log are sufficient.
    if (!response.ok) throw new Error(`GitHub ${method} failed (${response.status})`);
    return response.json();
  };
}

export async function paginate(api, path) {
  const items = [];
  for (let page = 1; ; page++) {
    const batch = await api(`${path}?per_page=100&page=${page}`);
    items.push(...batch);
    if (batch.length < 100) return items;
  }
}

export async function updateComment(api, number, sha, body, requestId, claim = false) {
  // Recheck after the remote build and immediately before publishing. Never
  // mark a superseded head or closed PR as ready.
  if (!eligible(await api(`pulls/${number}`), sha)) return false;
  const comments = await paginate(api, `issues/${number}/comments`);
  const existing = comments.find(comment => comment.user?.login === "github-actions[bot]" &&
    comment.body?.startsWith(marker));
  if (!eligible(await api(`pulls/${number}`), sha)) return false;
  // A newer maintainer request for the same SHA must also win. Refetch the
  // marked comment immediately before writing, rather than relying on the list.
  const current = existing ? await api(`issues/comments/${existing.id}`) : null;
  const currentId = current?.body?.match(/<!-- mcp-setup-docs-preview-request:([0-9]+) -->/)?.[1];
  if (claim) {
    if (currentId && BigInt(currentId) > BigInt(requestId)) return false;
  } else if (currentId !== requestId) {
    return false;
  }
  if (existing) await api(`issues/comments/${existing.id}`, "PATCH", { body });
  else await api(`issues/${number}/comments`, "POST", { body });
  return true;
}

export async function main(mode, env = process.env) {
  if (env.GITHUB_REPOSITORY !== repository) throw new Error("Unexpected source repository");
  const number = env.PR_NUMBER;
  if (!/^[1-9][0-9]*$/.test(number ?? "")) throw new Error("Invalid PR number");
  if (!env.GH_TOKEN) throw new Error("GitHub token is required");
  const requestId = env.REQUEST_ID;
  if (!/^[1-9][0-9]*$/.test(requestId ?? "")) throw new Error("Invalid preview request ID");
  const api = githubClient(env.GH_TOKEN);
  if (mode === "authorize" || mode === "prepare") {
    if (!env.GITHUB_ACTOR) throw new Error("Preview requester is required");
    const actor = await api(`collaborators/${encodeURIComponent(env.GITHUB_ACTOR)}/permission`);
    if (!canRequestPreview(actor.permission)) {
      throw new Error("Only repository writers or maintainers can request a preview");
    }
  }
  const pr = await api(`pulls/${number}`);
  const sha = mode === "authorize" ? pr.head?.sha : env.PR_SHA;
  if (!eligible(pr, sha)) {
    if (mode === "authorize" || mode === "prepare") await appendFile(env.GITHUB_OUTPUT, "enabled=false\n");
    console.log("Skipping a closed, superseded or fork PR.");
    return;
  }
  const runUrl = `https://github.com/${repository}/actions/runs/${env.GITHUB_RUN_ID}`;
  if (mode === "authorize" || mode === "prepare") {
    const files = await paginate(api, `pulls/${number}/files`);
    if (changedSlugs(files).length === 0) {
      await appendFile(env.GITHUB_OUTPUT, "enabled=false\n");
      console.log("No setup guides changed.");
      return;
    }
    if (mode === "authorize") {
      await appendFile(env.GITHUB_OUTPUT, `enabled=true\nsha=${sha}\n`);
      return;
    }
    const claimed = await updateComment(api, number, sha,
      commentBody({ sha, requestId, state: "building", runUrl }), requestId, true);
    await appendFile(env.GITHUB_OUTPUT, claimed ? `enabled=true\nsha=${sha}\n` : "enabled=false\n");
    return;
  }
  if (mode !== "publish") throw new Error("Unknown preview operation");
  const state = env.DEPLOY_OUTCOME === "success" ? "ready" : "failed";
  const origin = state === "ready" ? previewOrigin(await readFile(env.DEPLOYMENT_OUTPUT, "utf8")) : undefined;
  const files = state === "ready" ? await paginate(api, `pulls/${number}/files`) : [];
  const body = commentBody({ sha, requestId, state, origin, slugs: changedSlugs(files), runUrl });
  if (await updateComment(api, number, sha, body, requestId)) await appendFile(env.GITHUB_STEP_SUMMARY, body);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv[2]).catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
