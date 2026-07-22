#!/usr/bin/env node
// Pulls our tenant's curated MCP server catalog from the PulseMCP registry and
// saves it to a local JSON file (gitignored).
//
// Mirrors the control plane's registry client:
//   GET {base}/v0.1/servers?version=latest&limit=50[&cursor=...]
//   Headers: X-Tenant-ID, X-API-Key
// Pages are followed via metadata.nextCursor and deduplicated by server name,
// since the registry can return overlapping pages under a continuing cursor.
//
// Usage: node scripts/pull-pulse-catalog.mjs [output-path]
// Requires PULSE_REGISTRY_KEY in the environment (set it in mise.local.toml).

import { writeFileSync } from "node:fs";

const BASE_URL = process.env.PULSE_REGISTRY_URL ?? "https://api.pulsemcp.com";
const TENANT = process.env.PULSE_REGISTRY_TENANT ?? "gram-recommended";
const API_KEY = process.env.PULSE_REGISTRY_KEY;
const OUT_PATH = process.argv[2] ?? "pulse-catalog.json";
const PAGE_SIZE = 50;
const MAX_PAGES = 20;

if (!API_KEY) {
  console.error(
    "PULSE_REGISTRY_KEY is not set.\n" +
      "Add it to mise.local.toml (gitignored):\n\n" +
      '  [env]\n  PULSE_REGISTRY_KEY = "<your key>"\n\n' +
      "then re-run from the repo root (mise loads it automatically).",
  );
  process.exit(1);
}

async function fetchPage(cursor) {
  const url = new URL("/v0.1/servers", BASE_URL);
  url.searchParams.set("version", "latest");
  url.searchParams.set("limit", String(PAGE_SIZE));
  if (cursor) url.searchParams.set("cursor", cursor);

  const res = await fetch(url, {
    headers: { "X-Tenant-ID": TENANT, "X-API-Key": API_KEY },
  });
  if (!res.ok) {
    const body = (await res.text()).slice(0, 500);
    throw new Error(`registry returned ${res.status} for ${url}: ${body}`);
  }
  return res.json();
}

const seen = new Set();
const servers = [];
let cursor = "";

for (let page = 1; page <= MAX_PAGES; page++) {
  const data = await fetchPage(cursor);
  const entries = data.servers ?? [];

  let added = 0;
  for (const entry of entries) {
    const name = entry.server?.name;
    if (!name || seen.has(name)) continue;
    seen.add(name);
    servers.push(entry);
    added++;
  }

  cursor = data.metadata?.nextCursor ?? "";
  console.error(`page ${page}: ${entries.length} entries, ${added} new (total ${servers.length})`);

  if (!cursor || added === 0) {
    cursor = "";
    break;
  }
}

if (cursor) {
  console.error(`warning: stopped at ${MAX_PAGES} pages with more remaining — catalog may be truncated`);
}

servers.sort((a, b) => a.server.name.localeCompare(b.server.name));

const output = {
  tenant: TENANT,
  fetchedAt: new Date().toISOString(),
  count: servers.length,
  servers,
};

writeFileSync(OUT_PATH, JSON.stringify(output, null, 2) + "\n");
console.error(`wrote ${servers.length} servers to ${OUT_PATH}`);
