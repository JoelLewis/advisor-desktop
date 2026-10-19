import { describe, it, expect } from 'vitest'
import { releaseAnnouncement } from '@/workspace/context/release-announcement'

describe('the release announcement', () => {
  it('says one order filled in the singular', () => {
    expect(releaseAnnouncement('Mark Davis', 1)).toBe('Released by Mark Davis; 1 order filled')
  })
  it('says several orders filled in the plural', () => {
    expect(releaseAnnouncement('Mark Davis', 3)).toBe('Released by Mark Davis; 3 orders filled')
  })
})
