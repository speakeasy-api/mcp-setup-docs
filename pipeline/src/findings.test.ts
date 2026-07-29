import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  isDossierRenderFix,
  shouldSalvageFinalization,
} from './findings.ts'

describe('isDossierRenderFix', () => {
  it('accepts fidelity on external or speakeasy only', () => {
    assert.equal(
      isDossierRenderFix({
        dimension: 'fidelity',
        target: 'external',
      }),
      true,
    )
    assert.equal(
      isDossierRenderFix({
        dimension: 'fidelity',
        target: 'speakeasy',
      }),
      true,
    )
    assert.equal(
      isDossierRenderFix({
        dimension: 'fidelity',
        target: 'research',
      }),
      false,
    )
    assert.equal(
      isDossierRenderFix({
        dimension: 'fidelity',
        target: 'setup',
      }),
      false,
    )
    assert.equal(
      isDossierRenderFix({
        dimension: 'achievability',
        target: 'external',
      }),
      false,
    )
  })
})

describe('shouldSalvageFinalization', () => {
  it('salvages only when every blocker is a dossier render fix', () => {
    assert.equal(shouldSalvageFinalization([]), false)
    assert.equal(
      shouldSalvageFinalization([
        { dimension: 'fidelity', target: 'external', where: 'opening' },
      ]),
      true,
    )
    assert.equal(
      shouldSalvageFinalization([
        { dimension: 'fidelity', target: 'external' },
        { dimension: 'fidelity', target: 'speakeasy' },
      ]),
      true,
    )
    assert.equal(
      shouldSalvageFinalization([
        { dimension: 'fidelity', target: 'external' },
        { dimension: 'fidelity', target: 'research' },
      ]),
      false,
    )
    assert.equal(
      shouldSalvageFinalization([
        { dimension: 'fidelity', target: 'external' },
        { dimension: 'achievability', target: 'external' },
      ]),
      false,
    )
    assert.equal(
      shouldSalvageFinalization([
        { dimension: 'fidelity', target: 'meta' },
      ]),
      false,
    )
  })
})
