import type { AgentContext, AgentFinding } from './agent'
import type { Figure } from '@/types/workspace'
import { accounts } from '@/mocks/data/accounts'
import { generateRebalanceTrades } from '@/mocks/handlers/oms'
import { getPositionsForAccount } from '@/mocks/data/positions'
import { evaluateProposal } from '@/mocks/handlers/compliance'

const CATEGORY: Record<string, string> = {
  restricted_securities: 'is on the restricted list',
  concentration_limit: 'would exceed its concentration limit',
  sector_limit: 'would push its sector over the limit',
  cash_minimum: 'would leave cash below the minimum reserve',
  wash_sale: 'would trigger a wash sale',
}

// Claim text carries no digits and tickers can (0700.HK), so claims name the holding; figure labels carry the ticker.
const holdingName = (names: ReadonlyMap<string, string>, symbol: string | undefined): string => {
  const name = symbol === undefined ? undefined : names.get(symbol)
  return name !== undefined && !/\d/.test(name) ? name : 'A holding'
}

export function runPretradeCheck({ asOf, subject }: AgentContext): AgentFinding[] {
  if (subject.type !== 'account') return []
  const account = accounts.find((a) => a.id === subject.id)
  if (!account) return []
  const legs = generateRebalanceTrades(account.id, true)
  const cite = [{ source: `Pre-trade check · tax-aware rebalance preview · ${account.name}`, asOf }]
  if (legs.length === 0) return [{ claim: 'There is no rebalance proposal to check.', attention: 'info', figures: [], citations: cite }]
  const result = evaluateProposal(account.id, legs.map((l) => ({ symbol: l.symbol, side: l.side, quantity: l.quantity, estimatedValue: l.estimatedValue })))
  if (!result) return []
  if (result.violations.length === 0) return [{ claim: 'The proposal passes every pre-trade check.', attention: 'info', figures: [], citations: cite }]
  const names = new Map(getPositionsForAccount(account.id, account.totalValue).map((p) => [p.symbol, p.name]))
  return result.violations.map((v) => {
    const who = v.symbol === undefined ? 'The proposal' : holdingName(names, v.symbol)
    const subjectLabel = v.symbol ?? 'Proposal'
    const verb = v.severity === 'block' ? 'Blocked' : 'Warning'
    const figures: Figure[] = []
    if (v.projectedWeight !== undefined) figures.push({ label: `${subjectLabel} after the proposal`, value: v.projectedWeight, unit: '%', source: 'evaluateProposal.violations.projectedWeight' })
    if (v.limitWeight !== undefined) figures.push({ label: `${subjectLabel} limit`, value: v.limitWeight, unit: '%', source: 'evaluateProposal.violations.limitWeight' })
    if (v.category === 'cash_minimum') figures.push({ label: 'Cash after the proposal', value: result.projectedCashPct, unit: '%', source: 'evaluateProposal.projectedCashPct' })
    return { claim: `${verb}: ${who} ${CATEGORY[v.category] ?? 'fails a pre-trade rule'}.`, attention: v.severity === 'block' ? 'attention' : 'info', figures, citations: cite }
  })
}
