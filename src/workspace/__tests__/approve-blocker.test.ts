import { it, expect } from 'vitest'
import { approveBlocker } from '@/workspace/context/approve-blocker'

it('names the first thing standing between the advisor and the approval', () => {
  expect(approveBlocker({ blocked: true, hasLegs: true, attested: true })).toBe('The pre-trade check blocks this version, so it cannot be approved.')
  expect(approveBlocker({ blocked: false, hasLegs: false, attested: true })).toBe('This version has no legs to approve.')
  expect(approveBlocker({ blocked: false, hasLegs: true, attested: false })).toBe('Confirm your review above to approve.')
  expect(approveBlocker({ blocked: false, hasLegs: true, attested: true })).toBeUndefined()
})
