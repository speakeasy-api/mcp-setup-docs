/**
 * Deterministic I4 grammar lint for a guide directory.
 * No LLM — used by the draft-guide review loop and a standalone CLI.
 *
 * Setup is split: external.md (provider-side) + speakeasy.md (Control Plane).
 * Prerequisites fold into external.md opening prose — no separate H2.
 */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createRequire } from 'node:module'
import { parse as parseYaml } from 'yaml'
import { PATHS, abs } from './paths.ts'

const require = createRequire(import.meta.url)
// CJS interop — ajv's ESM types don't expose a constructable default under NodeNext.
const Ajv = require('ajv') as typeof import('ajv').default
const addFormats = require('ajv-formats') as typeof import('ajv-formats').default

export type LintFinding = {
  severity: 'blocker' | 'nit'
  target: 'external' | 'speakeasy' | 'research' | 'meta'
  where: string
  problem: string
  suggestion: string
  dimension: 'lint'
}

const SPEAKEASY_ANCHORS = [
  'add-server-in-speakeasy',
  'connect-speakeasy-credentials',
] as const
const FORBIDDEN_EXTERNAL_H2 = [
  'Prerequisites',
  'Provider setup',
  'Speakeasy setup',
] as const
const ALLOWED_TEMPLATE_KEY = 'gram.oauth.callback_url'
const ANCHOR_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/
const SETUP_REF_RE = /(external|speakeasy)\.md#([a-z0-9-]+)/g

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

function lintTemplateKeys(
  body: string,
  target: 'external' | 'speakeasy'
): LintFinding[] {
  const out: LintFinding[] = []
  const keyRe = /\{\{\s*([^}]+?)\s*\}\}/g
  let km: RegExpExecArray | null
  while ((km = keyRe.exec(body)) !== null) {
    const key = km[1]!.trim()
    if (key !== ALLOWED_TEMPLATE_KEY) {
      out.push(
        finding({
          severity: 'blocker',
          target,
          where: `line ${lineOfOffset(body, km.index)}`,
          problem: `Unsupported template key {{ ${key} }}.`,
          suggestion: `Only {{ ${ALLOWED_TEMPLATE_KEY} }} is allowed.`,
        })
      )
    }
  }
  return out
}

/** Provider-side file: folded prerequisites + provider steps. */
export function lintExternalMarkdown(externalMd: string): LintFinding[] {
  const out: LintFinding[] = []
  const { frontmatter, body } = stripFrontmatter(externalMd)

  if (frontmatter === null) {
    out.push(
      finding({
        severity: 'blocker',
        target: 'external',
        where: 'frontmatter',
        problem: 'external.md is missing YAML frontmatter delimited by ---.',
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
            target: 'external',
            where: 'frontmatter',
            problem: 'external.md frontmatter must set setup_version: 1.',
            suggestion: 'Use exactly: setup_version: 1',
          })
        )
      }
    } catch {
      out.push(
        finding({
          severity: 'blocker',
          target: 'external',
          where: 'frontmatter',
          problem: 'external.md frontmatter is not valid YAML.',
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
        target: 'external',
        where: 'title',
        problem: `external.md must have exactly one H1; found ${h1s.length}.`,
        suggestion: 'Keep a single "# …" title after the frontmatter.',
      })
    )
  }

  for (const h of headings.filter((x) => x.level === 2)) {
    if (
      (FORBIDDEN_EXTERNAL_H2 as readonly string[]).includes(h.text)
    ) {
      out.push(
        finding({
          severity: 'blocker',
          target: 'external',
          where: `line ${h.line}: ## ${h.text}`,
          problem: `external.md must not use "## ${h.text}" — prerequisites fold into opening prose; Speakeasy steps live in speakeasy.md.`,
          suggestion:
            h.text === 'Speakeasy setup'
              ? 'Move this section into speakeasy.md.'
              : 'Drop the H2 and keep the content as opening prose (Prerequisites) or H3 steps (Provider setup).',
        })
      )
    }
  }

  // Screenshot + anchor rules apply to H3 steps until an optional ## Gotchas
  // (legacy guides still carrying gotchas until re-draft).
  const gotchasIdx = headings.findIndex(
    (h) => h.level === 2 && h.text === 'Gotchas'
  )
  for (let i = 0; i < headings.length; i++) {
    const h = headings[i]!
    if (h.level !== 3) continue
    if (gotchasIdx !== -1 && h.index >= headings[gotchasIdx]!.index) continue

    if (!h.anchor) {
      out.push(
        finding({
          severity: 'blocker',
          target: 'external',
          where: `line ${h.line}: ${h.text}`,
          problem: 'External setup H3 is missing a {#kebab-case} anchor.',
          suggestion:
            'Add a Dossier-minted anchor, e.g. ### Create credentials {#create-credentials}',
        })
      )
    } else if (!ANCHOR_RE.test(h.anchor)) {
      out.push(
        finding({
          severity: 'blocker',
          target: 'external',
          where: `#${h.anchor}`,
          problem: 'External setup anchor is not kebab-case [a-z0-9-]+.',
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
          target: 'external',
          where: h.anchor ? `#${h.anchor}` : `line ${h.line}`,
          problem:
            'External setup step lacks a screenshot placeholder or screenshot-exception comment.',
          suggestion:
            'Add <!-- screenshot: … --> or <!-- screenshot-exception: … --> on its own line in the step.',
        })
      )
    }
  }

  out.push(...lintTemplateKeys(body, 'external'))
  return out
}

export function lintSpeakeasyMarkdown(speakeasyMd: string): LintFinding[] {
  const out: LintFinding[] = []
  const { frontmatter, body } = stripFrontmatter(speakeasyMd)

  if (frontmatter !== null) {
    out.push(
      finding({
        severity: 'blocker',
        target: 'speakeasy',
        where: 'frontmatter',
        problem: 'speakeasy.md must not have YAML frontmatter.',
        suggestion:
          'Put setup_version only on external.md; start speakeasy.md with "# Speakeasy setup".',
      })
    )
  }

  const headings = parseHeadings(body)
  const h1s = headings.filter((h) => h.level === 1)
  if (h1s.length !== 1) {
    out.push(
      finding({
        severity: 'blocker',
        target: 'speakeasy',
        where: 'title',
        problem: `speakeasy.md must have exactly one H1; found ${h1s.length}.`,
        suggestion: 'Use a single "# Speakeasy setup" title.',
      })
    )
  } else if (h1s[0]!.text !== 'Speakeasy setup') {
    out.push(
      finding({
        severity: 'blocker',
        target: 'speakeasy',
        where: `line ${h1s[0]!.line}`,
        problem: `Expected "# Speakeasy setup", found "# ${h1s[0]!.text}".`,
        suggestion: 'Rename the H1 to Speakeasy setup.',
      })
    )
  }

  const h3s = headings.filter((h) => h.level === 3)
  const anchors = new Set(
    h3s.map((h) => h.anchor).filter(Boolean) as string[]
  )
  for (const id of SPEAKEASY_ANCHORS) {
    if (!anchors.has(id)) {
      out.push(
        finding({
          severity: 'blocker',
          target: 'speakeasy',
          where: 'speakeasy.md',
          problem: `Missing canonical Speakeasy step {#${id}}.`,
          suggestion: `Carry ### … {#${id}} from ${PATHS.speakeasySetup} via the Dossier.`,
        })
      )
    }
  }
  for (const h of h3s) {
    if (!h.anchor) {
      out.push(
        finding({
          severity: 'blocker',
          target: 'speakeasy',
          where: `line ${h.line}: ${h.text}`,
          problem: 'Speakeasy setup H3 is missing its fixed {#…} anchor.',
          suggestion: `Use the fixed anchors from ${PATHS.speakeasySetup}.`,
        })
      )
    }
  }

  out.push(...lintTemplateKeys(body, 'speakeasy'))
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
            'Fix the field so meta.yaml validates against ' +
              PATHS.guideSchema +
              '.',
        })
      )
    }
  }

  const blob = JSON.stringify(data)
  let rm: RegExpExecArray | null
  const refRe = new RegExp(SETUP_REF_RE.source, 'g')
  while ((rm = refRe.exec(blob)) !== null) {
    if (!ANCHOR_RE.test(rm[2]!)) {
      out.push(
        finding({
          severity: 'blocker',
          target: 'meta',
          where: `${rm[1]}.md#${rm[2]}`,
          problem: 'meta.yaml references a non-kebab-case setup anchor.',
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
  externalMd: string,
  speakeasyMd: string,
  researchMd: string | null,
  metaRaw: string | null
): LintFinding[] {
  const out: LintFinding[] = []
  const externalAnchors = collectAnchors(externalMd)
  const speakeasyAnchors = collectAnchors(speakeasyMd)
  const allSetupAnchors = new Set([...externalAnchors, ...speakeasyAnchors])

  if (researchMd) {
    const researchAnchors = collectAnchors(researchMd)
    for (const id of externalAnchors) {
      if (!researchAnchors.has(id)) {
        out.push(
          finding({
            severity: 'blocker',
            target: 'external',
            where: `#${id}`,
            problem:
              'external.md uses an anchor that does not appear in research.md (anchor contract).',
            suggestion:
              'Mint the anchor in the Dossier first, or reuse a Dossier id verbatim.',
          })
        )
      }
    }
  }

  if (metaRaw) {
    const refRe = new RegExp(SETUP_REF_RE.source, 'g')
    let m: RegExpExecArray | null
    while ((m = refRe.exec(metaRaw)) !== null) {
      const file = m[1]!
      const id = m[2]!
      const inFile =
        file === 'external' ? externalAnchors.has(id) : speakeasyAnchors.has(id)
      if (!inFile && !allSetupAnchors.has(id)) {
        out.push(
          finding({
            severity: 'blocker',
            target: 'meta',
            where: `${file}.md#${id}`,
            problem: `meta.yaml references ${file}.md#… but that anchor is missing from the setup files.`,
            suggestion: 'Fix the reference or restore the matching H3 {#anchor}.',
          })
        )
      } else if (!inFile) {
        out.push(
          finding({
            severity: 'blocker',
            target: 'meta',
            where: `${file}.md#${id}`,
            problem: `meta.yaml references ${file}.md#${id} but that anchor lives in the other setup file.`,
            suggestion: `Point at the file that defines {#${id}}.`,
          })
        )
      }
    }
  }

  return out
}

export function lintGuide(guideDir: string, repoRoot: string): LintFinding[] {
  const out: LintFinding[] = []
  const externalPath = join(guideDir, 'external.md')
  const speakeasyPath = join(guideDir, 'speakeasy.md')
  const legacySetupPath = join(guideDir, 'setup.md')
  const metaPath = join(guideDir, 'meta.yaml')
  const researchPath = join(guideDir, 'research.md')
  const schemaPath = abs(repoRoot, PATHS.guideSchema)

  if (existsSync(legacySetupPath)) {
    out.push(
      finding({
        severity: 'blocker',
        target: 'external',
        where: 'setup.md',
        problem:
          'setup.md is legacy — split into external.md (provider) and speakeasy.md (Control Plane).',
        suggestion:
          'Move provider steps to external.md and Speakeasy steps to speakeasy.md, then delete setup.md.',
      })
    )
  }

  if (!existsSync(externalPath)) {
    out.push(
      finding({
        severity: 'blocker',
        target: 'external',
        where: 'external.md',
        problem: 'external.md is missing.',
        suggestion: 'Write external.md (provider-side setup) before review.',
      })
    )
  }

  if (!existsSync(speakeasyPath)) {
    out.push(
      finding({
        severity: 'blocker',
        target: 'speakeasy',
        where: 'speakeasy.md',
        problem: 'speakeasy.md is missing.',
        suggestion: 'Write speakeasy.md from doctrine/speakeasy-setup.md via the Dossier.',
      })
    )
  }

  if (!existsSync(externalPath) || !existsSync(speakeasyPath)) {
    return out
  }

  const externalMd = readFileSync(externalPath, 'utf8')
  const speakeasyMd = readFileSync(speakeasyPath, 'utf8')
  out.push(...lintExternalMarkdown(externalMd))
  out.push(...lintSpeakeasyMarkdown(speakeasyMd))

  let metaRaw: string | null = null
  if (!existsSync(metaPath)) {
    out.push(
      finding({
        severity: 'blocker',
        target: 'meta',
        where: 'meta.yaml',
        problem: 'meta.yaml is missing.',
        suggestion:
          'Write meta.yaml validating against ' + PATHS.guideSchema + '.',
      })
    )
  } else if (!existsSync(schemaPath)) {
    out.push(
      finding({
        severity: 'blocker',
        target: 'meta',
        where: PATHS.guideSchema,
        problem: 'Guide schema file is missing; cannot validate meta.yaml.',
        suggestion: 'Restore ' + PATHS.guideSchema + ' at the repo root.',
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
  out.push(
    ...lintAnchorAgreement(externalMd, speakeasyMd, researchMd, metaRaw)
  )

  return out
}
