import { describe, it, expect } from 'vitest'
import { findingStatus, formatFigure } from '@/workspace/thread/figure-format'
import type { Figure } from '@/types/workspace'

const fig = (value: number, unit: Figure['unit'], source = 'test.value'): Figure => ({ label: 'Figure', value, unit, source })

describe('formatFigure', () => {
  it('pp is a signed drift in percentage points', () => {
    expect(formatFigure(fig(-0.074, 'pp'))).toEqual({ value: '−7.4', unit: 'pp' })
    expect(formatFigure(fig(0.054, 'pp'))).toEqual({ value: '+5.4', unit: 'pp' })
  })
  it('a tolerance band in pp reads as ± rather than a signed drift', () => {
    expect(formatFigure(fig(0.05, 'pp', 'drift.driftTolerance'))).toEqual({ value: '±5.0', unit: 'pp' })
  })
  it('% is a weight given as a fraction', () => {
    expect(formatFigure(fig(0.2, '%'))).toEqual({ value: '20.0', unit: '%' })
  })
  it('USD is whole dollars', () => {
    expect(formatFigure(fig(1234567.4, 'USD'))).toEqual({ value: '1,234,567', unit: 'USD' })
  })
  it('sh is a share quantity', () => {
    expect(formatFigure(fig(12.5, 'sh'))).toEqual({ value: '12.5', unit: 'sh' })
  })
  it('d is whole days', () => {
    expect(formatFigure(fig(30, 'd'))).toEqual({ value: '30', unit: 'd' })
  })
})

describe('findingStatus', () => {
  const finding = (claim: string, attention: 'info' | 'attention') => ({ claim, attention })
  it('a blocked check is BLOCK whatever its attention', () => {
    expect(findingStatus(finding('Blocked: Cash would fall below the minimum reserve.', 'attention'))).toBe('BLOCK')
    expect(findingStatus(finding('Blocked: A security is on the restricted list.', 'info'))).toBe('BLOCK')
  })
  it('a warning is WARN', () => {
    expect(findingStatus(finding('Warning: A security may trigger a wash sale.', 'info'))).toBe('WARN')
  })
  it('otherwise attention is OUT and info is IN', () => {
    expect(findingStatus(finding('US Equity is outside its tolerance band.', 'attention'))).toBe('OUT')
    expect(findingStatus(finding('Every asset class is inside its tolerance band.', 'info'))).toBe('IN')
  })
})
