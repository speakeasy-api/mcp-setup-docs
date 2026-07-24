/**
 * Deterministic I4 grammar lint for a guide directory.
 * No LLM — used by the draft-guide review loop and a standalone CLI.
 */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createRequire } from 'node:module'
import { parse as parseYaml } from 'yaml'

const require = createRequire(import.meta.url)
// CJS interop — ajv's ESM types don't expose a constructable default under NodeNext.
const Ajv = require('ajv') as typeof import('ajv').default
const addFormats = require('ajv-formats') as typeof import('ajv-formats').default

export type LintFinding = {
  severity: 'blocker' | 'nit'
  target: 'setup' | 'research' | 'meta'
  where: string
  problem: string
  suggestion: string
  dimension: 'lint'
}

const H2_ORDER = ['Prerequisites', 'Provider setup', 'Speakeasy setup'] as const
const SPEAKEASY_ANCHORS = [
  'add-server-in-speakeasy',
  'connect-speakeasy-credentials',
] as const
const ALLOWED_TEMPLATE_KEY = 'gram.oauth.callback_url'
const ANCHOR_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/

type Heading = {
  level: number
  text: string
  anchor: string | null
  line: number // 1-based
  index: number // char offset in body
}

function finding(
  partial: Omit<LintFinding, 'dimension'>
): LintFinding {
  return { ...partial, dimension: 'lint' }
}

function stripFrontmatter(raw: string): {
  frontmatter: string | null
  body: string
} {
  if (!raw.startsWith('---\n') && !raw.startsWith('---\r\n')) {
    return { frontmatter: null, body: raw }
  }
  const end = raw.indexOf('\n---', 3)
  if (end === -1) return { frontmatter: null, body: raw }
  const after = raw.indexOf('\n', end + 4)
  const fm = raw.slice(4, end)
  const body = after === -1 ? '' : raw.slice(after + 1)
  return { frontmatter: fm, body }
}

function parseHeadings(body: string): Heading[] {
  const headings: Heading[] = []
  let offset = 0
  const lines = body.split(/\r?\n/)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!
    const m = /^(#{1,6})\s+(.+?)\s*$/.exec(line)
    if (m) {
      const level = m[1]!.length
      const rest = m[2]!
      const am = /^(.*?)\s*\{#([a-z0-9-]+)\}\s*$/.exec(rest)
      const text = (am ? am[1]! : rest).trim()
      const anchor = am ? am[2]! : null
      headings.push({
        level,
        text,
        anchor,
        line: i + 1,
        index: offset,
      })
    }
    offset += line.length + 1
  }
  return headings
}

/** Body slice from this heading until the next heading of same or higher level. */
function sectionBody(body: string, headings: Heading[], idx: number): string {
  const h = headings[idx]!
  const start = h.index
  let end = body.length
  for (let j = idx + 1; j < headings.length; j++) {
    if (headings[j]!.level <= h.level) {
      end = headings[j]!.index
      break
    }
  }
  return body.slice(start, end)
}

function lineOfOffset(body: string, offset: number): number {
  return body.slice(0, offset).split(/\r?\n/).length
}

export function lintSetupMarkdown(setupMd: string): LintFinding[] {
  const out: LintFinding[] = []
  const { frontmatter, body } = stripFrontmatter(setupMd)

  if (frontmatter === null) {
    out.push(
      finding({
        severity: 'blocker',
        target: 'setup',
        where: 'frontmatter',
        problem: 'setup.md is missing YAML frontmatter delimited by ---.',
        suggestion: 'Start the file with ---\\nsetup_version: 1\\n---',
      })
    )
  } else {
    try {
      const fm = parseYaml(frontmatter) as Record<string, unknown> | null
      if (!fm || typeof fm !== 'object' || fm.setup_version !== 1) {
        out.push(
          finding({
            severity: 'blocker',
            target: 'setup',
            where: 'frontmatter',
            problem: 'setup.md frontmatter must set setup_version: 1.',
            suggestion: 'Use exactly: setup_version: 1',
          })
        )
      }
    } catch {
      out.push(
        finding({
          severity: 'blocker',
          target: 'setup',
          where: 'frontmatter',
          problem: 'setup.md frontmatter is not valid YAML.',
          suggestion: 'Fix the YAML between the opening and closing --- lines.',
        })
      )
    }
  }

  const headings = parseHeadings(body)
  const h1s = headings.filter((h) => h.level === 1)
  if (h1s.length !== 1) {
    out.push(
      finding({
        severity: 'blocker',
        target: 'setup',
        where: 'title',
        problem: `setup.md must have exactly one H1; found ${h1s.length}.`,
        suggestion: 'Keep a single "# …" title after the frontmatter.',
      })
    )
  }

  const h2s = headings.filter((h) => h.level === 2)
  if (h2s.length !== 3) {
    out.push(
      finding({
        severity: 'blocker',
        target: 'setup',
        where: 'H2 sections',
        problem: `setup.md must have exactly three H2 sections; found ${h2s.length}.`,
        suggestion: `Use exactly: ${H2_ORDER.map((t) => '## ' + t).join(', ')}`,
      })
    )
  } else {
    for (let i = 0; i < 3; i++) {
      if (h2s[i]!.text !== H2_ORDER[i]) {
        out.push(
          finding({
            severity: 'blocker',
            target: 'setup',
            where: `H2 #${i + 1} (line ${h2s[i]!.line})`,
            problem: `Expected "## ${H2_ORDER[i]}", found "## ${h2s[i]!.text}".`,
            suggestion: `Rename to "## ${H2_ORDER[i]}" and keep the three H2s in order.`,
          })
        )
      }
    }
  }

  const providerIdx = headings.findIndex(
    (h) => h.level === 2 && h.text === 'Provider setup'
  )
  const speakeasyIdx = headings.findIndex(
    (h) => h.level === 2 && h.text === 'Speakeasy setup'
  )

  if (providerIdx !== -1) {
    for (let i = providerIdx + 1; i < headings.length; i++) {
      const h = headings[i]!
      if (h.level === 2) break
      if (h.level !== 3) continue
      if (!h.anchor) {
        out.push(
          finding({
            severity: 'blocker',
            target: 'setup',
            where: `line ${h.line}: ${h.text}`,
            problem: 'Provider setup H3 is missing a {#kebab-case} anchor.',
            suggestion:
              'Add a Dossier-minted anchor, e.g. ### Create credentials {#create-credentials}',
          })
        )
      } else if (!ANCHOR_RE.test(h.anchor)) {
        out.push(
          finding({
            severity: 'blocker',
            target: 'setup',
            where: `#${h.anchor}`,
            problem: 'Provider setup anchor is not kebab-case [a-z0-9-]+.',
            suggestion: 'Use a Dossier-minted kebab-case id.',
          })
        )
      }

      const sec = sectionBody(body, headings, i)
      const hasShot =
        /<!--\s*screenshot:/i.test(sec) ||
        /<!--\s*screenshot-exception:/i.test(sec) ||
        /^screenshot:/im.test(sec)
      if (!hasShot) {
        out.push(
          finding({
            severity: 'blocker',
            target: 'setup',
            where: h.anchor ? `#${h.anchor}` : `line ${h.line}`,
            problem:
              'Provider setup step lacks a screenshot placeholder or screenshot-exception comment.',
            suggestion:
              'Add <!-- screenshot: … --> or <!-- screenshot-exception: … --> on its own line in the step.',
          })
        )
      }
    }
  }

  if (speakeasyIdx !== -1) {
    const speakeasyH3 = []
    for (let i = speakeasyIdx + 1; i < headings.length; i++) {
      const h = headings[i]!
      if (h.level === 2) break
      if (h.level === 3) speakeasyH3.push(h)
    }
    const anchors = new Set(
      speakeasyH3.map((h) => h.anchor).filter(Boolean) as string[]
    )
    for (const id of SPEAKEASY_ANCHORS) {
      if (!anchors.has(id)) {
        out.push(
          finding({
            severity: 'blocker',
            target: 'setup',
            where: `## Speakeasy setup`,
            problem: `Missing canonical Speakeasy step {#${id}}.`,
            suggestion: `Carry ### … {#${id}} from docs/speakeasy-setup.md via the Dossier.`,
          })
        )
      }
    }
    for (const h of speakeasyH3) {
      if (!h.anchor) {
        out.push(
          finding({
            severity: 'blocker',
            target: 'setup',
            where: `line ${h.line}: ${h.text}`,
            problem: 'Speakeasy setup H3 is missing its fixed {#…} anchor.',
            suggestion: 'Use the fixed anchors from docs/speakeasy-setup.md.',
          })
        )
      }
    }
  }

  // Template keys: only {{ gram.oauth.callback_url }}
  const keyRe = /\{\{\s*([^}]+?)\s*\}\}/g
  let km: RegExpExecArray | null
  while ((km = keyRe.exec(body)) !== null) {
    const key = km[1]!.trim()
    if (key !== ALLOWED_TEMPLATE_KEY) {
      out.push(
        finding({
          severity: 'blocker',
          target: 'setup',
          where: `line ${lineOfOffset(body, km.index)}`,
          problem: `Unsupported template key {{ ${key} }}.`,
          suggestion: `Only {{ ${ALLOWED_TEMPLATE_KEY} }} is allowed.`,
        })
      )
    }
  }

  return out
}

export function lintMetaYaml(
  metaRaw: string,
  schema: object
): LintFinding[] {
  const out: LintFinding[] = []
  let data: unknown
  try {
    data = parseYaml(metaRaw)
  } catch (err) {
    out.push(
      finding({
        severity: 'blocker',
        target: 'meta',
        where: 'meta.yaml',
        problem: 'meta.yaml is not valid YAML: ' + String(err),
        suggestion: 'Fix YAML syntax so the file parses.',
      })
    )
    return out
  }

  const ajv = new Ajv({ allErrors: true, strict: false })
  addFormats(ajv)
  const validate = ajv.compile(schema)
  if (!validate(data)) {
    for (const err of validate.errors || []) {
      out.push(
        finding({
          severity: 'blocker',
          target: 'meta',
          where: err.instancePath || 'meta.yaml',
          problem: `meta.yaml failed schema: ${err.message || 'invalid'}`,
          suggestion:
            'Fix the field so meta.yaml validates against schema/guide.v1.schema.json.',
        })
      )
    }
  }

  // setup.md#anchor references in meta must look like anchors
  const refRe = /setup\.md#([a-z0-9-]+)/g
  const blob = JSON.stringify(data)
  let rm: RegExpExecArray | null
  while ((rm = refRe.exec(blob)) !== null) {
    if (!ANCHOR_RE.test(rm[1]!)) {
      out.push(
        finding({
          severity: 'blocker',
          target: 'meta',
          where: `setup.md#${rm[1]}`,
          problem: 'meta.yaml references a non-kebab-case setup.md anchor.',
          suggestion: 'Point at a Dossier-minted kebab-case anchor.',
        })
      )
    }
  }

  return out
}

/** Collect {#anchor} ids from markdown headings. */
export function collectAnchors(md: string): Set<string> {
  const { body } = stripFrontmatter(md)
  const ids = new Set<string>()
  for (const h of parseHeadings(body)) {
    if (h.anchor) ids.add(h.anchor)
  }
  return ids
}

export function lintAnchorAgreement(
  setupMd: string,
  researchMd: string | null,
  metaRaw: string | null
): LintFinding[] {
  const out: LintFinding[] = []
  const setupAnchors = collectAnchors(setupMd)

  if (researchMd) {
    const researchAnchors = collectAnchors(researchMd)
    for (const id of setupAnchors) {
      if (SPEAKEASY_ANCHORS.includes(id as (typeof SPEAKEASY_ANCHORS)[number])) {
        continue // fixed Speakeasy anchors enter via transclusion
      }
      if (!researchAnchors.has(id)) {
        out.push(
          finding({
            severity: 'blocker',
            target: 'setup',
            where: `#${id}`,
            problem:
              'setup.md uses an anchor that does not appear in research.md (anchor contract).',
            suggestion:
              'Mint the anchor in the Dossier first, or reuse a Dossier id verbatim.',
          })
        )
      }
    }
  }

  if (metaRaw) {
    const refRe = /setup\.md#([a-z0-9-]+)/g
    let m: RegExpExecArray | null
    while ((m = refRe.exec(metaRaw)) !== null) {
      const id = m[1]!
      if (!setupAnchors.has(id)) {
        out.push(
          finding({
            severity: 'blocker',
            target: 'meta',
            where: `setup.md#${id}`,
            problem: 'meta.yaml references setup.md#… but that anchor is missing from setup.md.',
            suggestion: 'Fix the reference or restore the matching H3 {#anchor}.',
          })
        )
      }
    }
  }

  return out
}

export function lintGuide(guideDir: string, repoRoot: string): LintFinding[] {
  const out: LintFinding[] = []
  const setupPath = join(guideDir, 'setup.md')
  const metaPath = join(guideDir, 'meta.yaml')
  const researchPath = join(guideDir, 'research.md')
  const schemaPath = join(repoRoot, 'schema/guide.v1.schema.json')

  if (!existsSync(setupPath)) {
    out.push(
      finding({
        severity: 'blocker',
        target: 'setup',
        where: 'setup.md',
        problem: 'setup.md is missing.',
        suggestion: 'Write setup.md before review.',
      })
    )
    return out
  }

  const setupMd = readFileSync(setupPath, 'utf8')
  out.push(...lintSetupMarkdown(setupMd))

  let metaRaw: string | null = null
  if (!existsSync(metaPath)) {
    out.push(
      finding({
        severity: 'blocker',
        target: 'meta',
        where: 'meta.yaml',
        problem: 'meta.yaml is missing.',
        suggestion: 'Write meta.yaml validating against schema/guide.v1.schema.json.',
      })
    )
  } else if (!existsSync(schemaPath)) {
    out.push(
      finding({
        severity: 'blocker',
        target: 'meta',
        where: 'schema/guide.v1.schema.json',
        problem: 'Guide schema file is missing; cannot validate meta.yaml.',
        suggestion: 'Restore schema/guide.v1.schema.json at the repo root.',
      })
    )
  } else {
    metaRaw = readFileSync(metaPath, 'utf8')
    const schema = JSON.parse(readFileSync(schemaPath, 'utf8')) as object
    out.push(...lintMetaYaml(metaRaw, schema))
  }

  const researchMd = existsSync(researchPath)
    ? readFileSync(researchPath, 'utf8')
    : null
  out.push(...lintAnchorAgreement(setupMd, researchMd, metaRaw))

  return out
}
