import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { workbenchDriftRows } from '@/workspace/workbench/drift-rows'
import { DriftTable } from '@/workspace/workbench/DriftTable'
import type { DriftStatus } from '@/types/portfolio'
import type { ProjectedDrift } from '@/services/oms'

const before = { driftTolerance: 0.05, assetClassDrifts: [
  { assetClass: 'us_equity', drift: 0.132, actual: 0.682, target: 0.55 },
  { assetClass: 'cash', drift: -0.01, actual: 0.01, target: 0.02 },
] } as unknown as DriftStatus
const projected = { driftTolerance: 0.05, assetClassDrifts: [
  { assetClass: 'us_equity', drift: 0.012 },
  { assetClass: 'cash', drift: -0.008, residualReason: 'cash_capped' },
] } as unknown as ProjectedDrift

describe('workbench drift, before and after on one row', () => {
  it('joins each class before and after with its delta and reason', () => {
    expect(workbenchDriftRows(before, projected)).toMatchObject([
      { assetClass: 'us_equity', label: 'US Equity', before: 0.132, after: 0.012 },
      { assetClass: 'cash', reason: "held to the model's cash target" },
    ])
    expect(workbenchDriftRows(before, projected)[0]!.delta).toBeCloseTo(-0.12)
  })
  it('takes the change between the figures as shown, so before, after and Δ add up on screen', () => {
    const intl = { driftTolerance: 0.05, assetClassDrifts: [{ assetClass: 'intl_equity', drift: -0.07449, actual: 0.1255, target: 0.2 }] } as unknown as DriftStatus
    const after = { driftTolerance: 0.05, assetClassDrifts: [{ assetClass: 'intl_equity', drift: -0.05351 }] } as unknown as ProjectedDrift
    render(<DriftTable before={intl} projected={after} />)
    const row = screen.getByRole('row', { name: /International Equity/ })
    const cells = within(row).getAllByRole('cell').map((c) => c.textContent)
    expect(cells).toEqual(expect.arrayContaining(['−7.4', '−5.4', '+2.0']))
    expect(cells).not.toContain('+2.1')
  })
  it('refuses a class drawn after that was not measured before', () => {
    const extra = { ...projected, assetClassDrifts: [...projected.assetClassDrifts, { assetClass: 'commodities', drift: 0.01 }] } as unknown as ProjectedDrift
    expect(() => workbenchDriftRows(before, extra)).toThrow('Drift before has no commodities')
  })
  it('is one table, one row per class, reasons on their rows', () => {
    render(<DriftTable before={before} projected={projected} />)
    const table = screen.getByRole('table', { name: 'Drift before and after' })
    const rows = within(table).getAllByRole('row').slice(1)
    expect(rows).toHaveLength(2)
    expect(rows[0]).toHaveTextContent('+13.2')
    expect(rows[0]).toHaveTextContent('+1.2')
    expect(rows[0]).toHaveTextContent('−12.0')
  })
})
