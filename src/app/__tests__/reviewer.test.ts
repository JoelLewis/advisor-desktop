import { it, expect } from 'vitest'
import { splitReviewer } from '@/app/pages/kit/reviewer'

it('splits an engine reviewer into name and role', () => {
  expect(splitReviewer('Mark Davis (CCO)')).toEqual({ name: 'Mark Davis', role: 'CCO' })
})

it('refuses a reviewer without a stated role rather than inventing one', () => {
  expect(() => splitReviewer('Mark Davis')).toThrow(/no role/)
})
