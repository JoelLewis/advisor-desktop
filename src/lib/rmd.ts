/**
 * When a traditional IRA owner's required minimum distributions begin (IRC §401(a)(9) as amended by
 * SECURE 2.0 §107): the year they reach 73 if born 1951–1959, 75 if born 1960 or later. The statute's
 * text puts 1959 in both bands; the proposed regulations read it as 73, and so does this rule. An owner
 * born before 1951 began under the earlier ages (70½ or 72), which this rule does not state.
 */
export function requiredBeginningAge(dateOfBirth: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) throw new Error(`not a date of birth: ${dateOfBirth}`)
  const year = Number(dateOfBirth.slice(0, 4))
  if (year < 1951) throw new Error(`born ${year}: distributions began under the pre-SECURE 2.0 ages, which this rule does not cover`)
  return year <= 1959 ? 73 : 75
}

/** The calendar year of the first required distribution: the year the owner reaches the required beginning age. */
export function firstRmdYear(dateOfBirth: string): number {
  return Number(dateOfBirth.slice(0, 4)) + requiredBeginningAge(dateOfBirth)
}
