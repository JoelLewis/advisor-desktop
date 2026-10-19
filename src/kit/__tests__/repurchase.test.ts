import { describe, it, expect } from 'vitest'
import { dontRepurchaseThrough } from '@/kit/repurchase'

describe('the one wash-sale phrase', () => {
  it('names the last day of the window, the way every window is written: through <date>', () => {
    expect(dontRepurchaseThrough('2026-03-27')).toBe("Don't repurchase through 27 Mar 2026")
  })
})
