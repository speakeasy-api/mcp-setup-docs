import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { decidePreflight, filterClosingPrs, type MatchingPr } from './preflight.ts'

describe('filterClosingPrs', () => {
  it('keeps PRs that Closes/Fixes/Resolves the issue', () => {
    const prs: MatchingPr[] = [
      {
        number: 1,
        url: 'https://example/1',
        body: 'Closes #42',
        author: { login: 'bot' },
        headRefName: 'guide/issue-42-box',
      },
      {
        number: 2,
        url: 'https://example/2',
        body: 'Related to #42',
        author: { login: 'bot' },
        headRefName: 'other',
      },
      {
        number: 3,
        url: 'https://example/3',
        body: 'fixes #42\n\nnotes',
        author: { login: 'bot' },
        headRefName: 'x',
      },
    ]
    const got = filterClosingPrs(prs, '42')
    assert.equal(got.length, 2)
    assert.equal(got[0]!.number, 1)
    assert.equal(got[1]!.number, 3)
  })
})

describe('decidePreflight', () => {
  it('resumes on factory collaborator PR', () => {
    const r = decidePreflight({
      issueNumber: '7',
      matchingPrs: [
        {
          number: 99,
          url: 'https://example/99',
          body: 'Closes #7',
          author: { login: 'agent' },
          headRefName: 'guide/issue-7-box',
        },
      ],
      isCollaborator: () => true,
      orphanRefs: [],
    })
    assert.equal(r.resume, true)
    assert.equal(r.refused, false)
    assert.equal(r.resume_branch, 'guide/issue-7-box')
    assert.equal(r.resume_pr_number, '99')
  })

  it('refuses non-factory collaborator PR', () => {
    const r = decidePreflight({
      issueNumber: '7',
      matchingPrs: [
        {
          number: 5,
          url: 'https://example/5',
          body: 'Closes #7',
          author: { login: 'human' },
          headRefName: 'feature/manual',
        },
      ],
      isCollaborator: () => true,
      orphanRefs: [],
    })
    assert.equal(r.refused, true)
    assert.equal(r.resume, false)
    assert.equal(r.refused_pr_url, 'https://example/5')
  })

  it('skips non-collaborator PRs and resumes orphan branch', () => {
    const r = decidePreflight({
      issueNumber: '7',
      matchingPrs: [
        {
          number: 1,
          url: 'https://example/1',
          body: 'Closes #7',
          author: { login: 'outsider' },
          headRefName: 'guide/issue-7-box',
        },
      ],
      isCollaborator: () => false,
      orphanRefs: [
        { ref: 'refs/heads/guide/issue-7-box', object: { sha: 'abc' } },
      ],
    })
    assert.equal(r.resume, true)
    assert.equal(r.resume_branch, 'guide/issue-7-box')
    assert.equal(r.resume_pr_number, '')
  })

  it('picks newest orphan branch by committer date', () => {
    const dates: Record<string, string> = {
      old: '2026-01-01T00:00:00Z',
      neu: '2026-06-01T00:00:00Z',
    }
    const r = decidePreflight({
      issueNumber: '7',
      matchingPrs: [],
      isCollaborator: () => true,
      orphanRefs: [
        { ref: 'refs/heads/guide/issue-7-a', object: { sha: 'old' } },
        { ref: 'refs/heads/guide/issue-7-b', object: { sha: 'neu' } },
      ],
      committerDate: (sha) => dates[sha],
    })
    assert.equal(r.resume, true)
    assert.equal(r.resume_branch, 'guide/issue-7-b')
  })
})
