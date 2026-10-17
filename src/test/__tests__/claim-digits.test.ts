import { describe, it, expect } from 'vitest'
import { handTypedDigits } from '@/test/claim-digits'
import type { Figure } from '@/types/workspace'

const year: Figure = { label: 'First required distribution · Robert', value: 2031, unit: 'year', source: 'firstRmdYear' }
const age: Figure = { label: 'Age at the first required distribution · Robert', value: 73, unit: 'count', source: 'requiredBeginningAge' }

describe('handTypedDigits', () => {
  it("allows a claim's own figures, as the kit formats them", () => {
    expect(handTypedDigits("Required distributions from Robert's traditional IRA begin in 2031, at age 73.", [year, age])).toEqual([])
  })
  it('catches a number that is not one of its figures', () => {
    expect(handTypedDigits('begin in 2032, at age 73', [year, age])).toEqual(['2032'])
    expect(handTypedDigits('begin in 2031', [])).toEqual(['2031'])
  })
})
