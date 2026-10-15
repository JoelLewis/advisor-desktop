import { describe, it, expect } from 'vitest'
import { JUST_YOU, OUTSIDER_BAND, THREAD_GROUP_TITLE, bandWordsOf, teamWords } from '@/workspace/people/visibility-words'

describe('visibility words', () => {
  it('the thread list groups name who reads them', () => {
    expect(THREAD_GROUP_TITLE).toEqual({ private: 'Just me', internal: 'Larkfield team', client: 'Client conversations' })
  })
  it('a firm viewer reads the band in names', () => {
    expect(bandWordsOf({ kind: 'owner' }, false)).toBe('Just you')
    expect(bandWordsOf({ kind: 'team', about: ['Robert Johnson'] }, false)).toBe("Larkfield team · Robert can't see this")
    expect(bandWordsOf({ kind: 'team', about: ['Robert Johnson', 'Patricia Johnson'] }, false)).toBe("Larkfield team · Robert and Patricia can't see this")
    expect(bandWordsOf({ kind: 'team', about: ['Dr. Amanda Pell'] }, false)).toBe("Larkfield team · Dr. Pell can't see this")
    expect(bandWordsOf({ kind: 'team', about: [] }, false)).toBe('Larkfield team · no client can see this')
    expect(bandWordsOf({ kind: 'party', name: 'Robert Johnson' }, false)).toBe('Robert Johnson can read this')
  })
  it('an outsider is told the truth: the team, and compliance review', () => {
    expect(OUTSIDER_BAND).toBe('You and the Larkfield team. Messages are kept and reviewed by compliance, as the law requires.')
    expect(bandWordsOf({ kind: 'party', name: 'Robert Johnson' }, true)).toBe(OUTSIDER_BAND)
  })
  it('a team band with nobody named never reads an empty name', () => expect(teamWords([])).not.toMatch(/·\s+can't/))
  it('a private thread is its owner alone, in the band and in its row', () => expect(bandWordsOf({ kind: 'owner' }, false)).toBe(JUST_YOU))
})
