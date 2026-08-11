import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  DUPLICATE_THRESHOLD,
  isDuplicateQuestion,
  similarity,
} from './text-similarity.ts'

/**
 * The two real open questions from the hubspot run.
 * They share 9 tokens, and the smaller token set has 15 tokens.
 * The score is the lowest measured score between true duplicates.
 */
const HUBSPOT_DOSSIER_BULLET =
  '**Admin-connects-first mechanics.** Only the overview page states the admin must connect first; no source defines which admin role qualifies, or what error/experience a non-admin user gets when connecting before any admin has. Needs console verification or provider confirmation.'
const HUBSPOT_SCOPE_QUESTION =
  'The admin-connects-first requirement is documented only on the partially stale overview page; the qualifying admin role and pre-admin user experience are undocumented.'

/**
 * Two real open-question bullets from `guides/x/research.md`.
 * They share 10 tokens, and the smaller token set has 17 tokens.
 * The score is the highest measured score between different questions.
 * This pair is the guard that keeps the threshold above 0.5.
 */
const X_FIELD_LABELS_BULLET =
  "X's public Developer Console documentation does not publish the exact field labels or final submit-button label in the first-time developer enrollment flow."
const X_NEW_APP_BULLET =
  "X's public documentation says to enter an app name, description, and use case after clicking **New App**, but does not publish the exact field labels or the final create-button label."

describe('DUPLICATE_THRESHOLD', () => {
  it('stays pinned at the measured separating value', () => {
    assert.equal(DUPLICATE_THRESHOLD, 0.6)
  })
})

describe('similarity', () => {
  it('scores identical text as 1', () => {
    assert.equal(
      similarity(
        'Which permission gates the workspace',
        'Which permission gates the workspace',
      ),
      1,
    )
  })

  it('ignores markdown bold and punctuation', () => {
    assert.equal(
      similarity(
        '**Admin-connects-first mechanics.**',
        'Admin connects first mechanics',
      ),
      1,
    )
  })

  it('scores empty and short-token input as 0', () => {
    assert.equal(similarity('', 'anything at all here'), 0)
    assert.equal(similarity('a b c', 'x y z'), 0)
  })

  it('is symmetric', () => {
    assert.equal(
      similarity(HUBSPOT_DOSSIER_BULLET, HUBSPOT_SCOPE_QUESTION),
      similarity(HUBSPOT_SCOPE_QUESTION, HUBSPOT_DOSSIER_BULLET),
    )
  })
})

describe('isDuplicateQuestion', () => {
  it('merges the lowest-scoring true duplicate pair', () => {
    assert.equal(
      similarity(HUBSPOT_DOSSIER_BULLET, HUBSPOT_SCOPE_QUESTION),
      0.6,
    )
    assert.equal(
      isDuplicateQuestion(HUBSPOT_DOSSIER_BULLET, HUBSPOT_SCOPE_QUESTION),
      true,
    )
  })

  it('keeps the highest-scoring different pair apart', () => {
    assert.equal(similarity(X_FIELD_LABELS_BULLET, X_NEW_APP_BULLET), 10 / 17)
    assert.ok(
      similarity(X_FIELD_LABELS_BULLET, X_NEW_APP_BULLET) <
        DUPLICATE_THRESHOLD,
    )
    assert.equal(
      isDuplicateQuestion(X_FIELD_LABELS_BULLET, X_NEW_APP_BULLET),
      false,
    )
  })
})
