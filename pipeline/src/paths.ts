/**
 * Repo-relative path constants for doctrine, personas, guides, schema, retro.
 * Flip these (and only these) when the concern-first layout moves directories.
 */
import { join } from 'node:path'

export const PATHS = {
  glossary: 'doctrine/glossary.md',
  shared: 'doctrine/shared.md',
  /** Directory containing role docs (writer.md, fidelity.md, …). */
  rolesDir: 'doctrine/roles',
  constitution: 'doctrine/constitution.md',
  changelog: 'doctrine/CHANGELOG.md',
  pipelineLockDoc: 'doctrine/pipeline-lock.md',
  personasDir: 'doctrine/personas',
  speakeasySetup: 'doctrine/speakeasy-setup.md',
  guidesDir: 'guides',
  retroRunsDir: 'retro/runs',
  guideSchema: 'schema/guide.v1.schema.json',
  pipelineLockSchema: 'schema/pipeline-lock.v1.schema.json',
} as const

export function roleDoc(name: string): string {
  return PATHS.rolesDir + '/' + name
}

export function personaFile(persona: string): string {
  return PATHS.personasDir + '/' + persona + '.md'
}

export function guideDir(slug: string): string {
  return PATHS.guidesDir + '/' + slug
}

export function abs(repoRoot: string, repoRel: string): string {
  return join(repoRoot, repoRel)
}
