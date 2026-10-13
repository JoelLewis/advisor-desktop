import { describe, expect, it } from 'vitest'
import { addressNameOf, firstNameOf, joinWords } from '@/lib/words'

describe('joinWords', () => {
  it('joins none, one, two and three', () => {
    expect(joinWords([])).toBe('')
    expect(joinWords(['a'])).toBe('a')
    expect(joinWords(['a', 'b'])).toBe('a and b')
    expect(joinWords(['a', 'b', 'c'])).toBe('a, b and c')
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
