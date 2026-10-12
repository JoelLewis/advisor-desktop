import { describe, expect, it } from 'vitest'
import { firstNameOf, joinWords } from '@/lib/words'

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
