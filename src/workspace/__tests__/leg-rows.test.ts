import { it, expect } from 'vitest'
import { legRows } from '@/workspace/workbench/leg-rows'
import { buildVersion } from '@/mocks/workspace/proposal-engine'

it('lists the legs in the engine\'s order, then the excluded ones, with the engine\'s figures', () => {
  const r = buildVersion('acc-002', [{ kind: 'avoid_self_wash' }], [{ kind: 'exclude', symbol: 'QAI' }])
  if (!r.ok) throw new Error(r.message)
  const rows = legRows(r.built)
  expect(rows.map((l) => [l.symbol, l.excluded])).toEqual([
    ['INTC', false], ['SPY', false], ['EFA', false], ['VWO', false], ['AGG', false], ['GLD', false], ['ETHE', false], ['IBIT', false], ['QAI', true],
  ])
  expect(rows[0]).toMatchObject({ name: 'Intel Corp.', side: 'sell', quantity: 7_000, longTerm: -45_850, shortTerm: 0, washed: 0, restrictedTo: '2026-03-27', status: 'CLEAR' })
  expect(rows[2]).toMatchObject({ symbol: 'EFA', side: 'buy', shortTerm: undefined, washed: undefined, restrictedTo: undefined })
})
