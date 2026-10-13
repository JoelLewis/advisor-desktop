import { describe, it, expect } from 'vitest'
import { firstRmdYear, requiredBeginningAge } from '../rmd'

describe('required minimum distributions (SECURE 2.0)', () => {
  it('begin at seventy-three for owners born 1951–1959, seventy-five from 1960', () => {
    expect(requiredBeginningAge('1958-03-22')).toBe(73)
    expect(requiredBeginningAge('1951-01-01')).toBe(73)
    expect(requiredBeginningAge('1959-12-31')).toBe(73)
    expect(requiredBeginningAge('1960-07-11')).toBe(75)
  })
  it("Robert Johnson's first required distribution is for 2031", () => {
    expect(firstRmdYear('1958-03-22')).toBe(2031)
  })
  it('refuses an owner born before 1951, whose distributions began under the earlier ages', () => {
    expect(() => requiredBeginningAge('1948-12-01')).toThrow(/pre-SECURE 2.0/)
  })
})
