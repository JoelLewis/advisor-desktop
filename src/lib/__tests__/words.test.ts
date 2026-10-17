import { describe, expect, it } from 'vitest'
import { addressNameOf, firstNameOf, joinClauses, joinWords } from '@/lib/words'

describe('joinWords', () => {
  it('joins none, one, two and three', () => {
    expect(joinWords([])).toBe('')
    expect(joinWords(['a'])).toBe('a')
    expect(joinWords(['a', 'b'])).toBe('a and b')
    expect(joinWords(['a', 'b', 'c'])).toBe('a, b and c')
  })
})

describe('joinClauses', () => {
  it('joins clauses that carry commas with semicolons, so two owners read apart', () => {
    expect(joinClauses(["Robert's IRA begin in 2031, at age 73"])).toBe("Robert's IRA begin in 2031, at age 73")
    expect(joinClauses(["Robert's IRA begin in 2031, at age 73", "Patricia's IRA begin in 2033, at age 75"]))
      .toBe("Robert's IRA begin in 2031, at age 73; and Patricia's IRA begin in 2033, at age 75")
  })
})

describe('firstNameOf', () => {
  it('takes the first word of a full name', () => {
    expect(firstNameOf('Patricia Johnson')).toBe('Patricia')
    expect(firstNameOf('Robert')).toBe('Robert')
  })
})

describe('addressNameOf', () => {
  it.each([['Dr. Amanda Pell', 'Dr. Pell'], ['Robert Johnson', 'Robert'], ["Mrs. Karen O'Brien", "Mrs. O'Brien"], ['Cher', 'Cher']])(
    '%s → %s', (name, expected) => expect(addressNameOf(name)).toBe(expected))
})
