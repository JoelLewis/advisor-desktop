import { describe, it, expect } from 'vitest'
import { UNIT, fmtBasisPoints, fmtEffect, fmtExposure, fmtRate, fmtRatio } from '@/kit/measure'

describe('the reference formatters', () => {
  it('format rates, basis points, ratios, exposures and effects', () => {
    expect([fmtRate(0.0085), fmtRate(0.01), fmtRate(0.0074386)]).toEqual(['0.85', '1.00', '0.74'])
    expect(fmtBasisPoints(0.0074386)).toBe('74.4')
    expect(UNIT.bps).toBe('bps')
    expect([fmtRatio(0.64), fmtRatio(1.6)]).toEqual(['0.64', '1.60'])
    expect([fmtExposure(-0.05), fmtExposure(0.3), fmtExposure(0)]).toEqual(['−0.05', '+0.30', '0.00'])
    expect([fmtEffect(0.00123), fmtEffect(-0.0004), fmtEffect(0.00001)]).toEqual(['+0.12', '−0.04', '0.00'])
  })
})
