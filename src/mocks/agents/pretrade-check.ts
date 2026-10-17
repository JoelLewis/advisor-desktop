import type { AgentContext, AgentFinding } from './agent'
import type { Figure } from '@/types/workspace'
import type { ProposalViolation } from '@/services/oms'
import { accounts } from '@/mocks/data/accounts'
import { getPositionsForAccount } from '@/mocks/data/positions'
import { generateRebalanceTrades } from '@/mocks/handlers/oms'
import { evaluateProposal } from '@/mocks/handlers/compliance'
import { tolerancePhrase, withSuitability } from '@/mocks/workspace/suitability'
import { claimNameOf } from './claim-name'

const hasDigit = (text: string) => /\d/.test(text)

type Names = ReadonlyMap<string, string>

// Claims name the security (claimNameOf keeps digits out); figure labels carry the ticker.
const securityName = (names: Names, symbol: string): string => claimNameOf(symbol, names.get(symbol))

// The sector is the parenthesised part of the engine's constraint name: "Sector concentration (Technology)".
const sectorOf = (v: ProposalViolation): string => /\(([^)]+)\)/.exec(v.constraint)?.[1] ?? 'A sector'

function weightPhrase(v: ProposalViolation, noun: string): string {
  const { projectedWeight, limitWeight, currentWeight } = v
  if (projectedWeight === undefined || limitWeight === undefined || projectedWeight <= limitWeight) return `is approaching its ${noun} limit`
  if (!v.preExisting) return `would exceed its ${noun} limit`
  if (currentWeight !== undefined && projectedWeight > currentWeight) return `is already over its ${noun} limit, and the proposal adds to it`
  if (currentWeight !== undefined && projectedWeight < currentWeight) return `is already over its ${noun} limit; the proposal reduces it`
  return `is already over its ${noun} limit; the proposal does not add to it`
}

function symbolOf(v: ProposalViolation): string {
  if (v.symbol === undefined) throw new Error(`A ${v.category} violation names no symbol`)
  return v.symbol
}

function describe(v: ProposalViolation, names: Names): { who: string; label: string; phrase: string } {
  switch (v.category) {
    case 'restricted_securities': { const symbol = symbolOf(v); return { who: securityName(names, symbol), label: symbol, phrase: 'is on the restricted list' } }
    case 'concentration_limit': { const symbol = symbolOf(v); return { who: securityName(names, symbol), label: symbol === 'CASH' ? 'Cash' : symbol, phrase: weightPhrase(v, 'concentration') } }
    case 'sector_limit': { const sector = sectorOf(v); return { who: sector, label: sector, phrase: weightPhrase(v, 'sector') } }
    case 'cash_minimum': return { who: 'Cash', label: 'Cash', phrase: 'would fall below the minimum reserve' }
    case 'wash_sale': { const symbol = symbolOf(v); return { who: securityName(names, symbol), label: symbol, phrase: 'may trigger a wash sale' } }
    case 'model_above_tolerance': {
      const t = v.tolerance
      if (!t) throw new Error('A model_above_tolerance violation carries no tolerance facts')
      const model = hasDigit(t.modelName) ? 'The model' : t.modelName
      return { who: model, label: t.modelName, phrase: tolerancePhrase(t.clientName, t.toleranceBand, t.wholeAfterStatus, 'proposal') }
    }
  }
}

export function runPretradeCheck({ asOf, subject }: AgentContext): AgentFinding[] {
  if (subject.type !== 'account') return []
  const account = accounts.find((a) => a.id === subject.id)
  if (!account) return []
  const citations = [{ source: `Pre-trade check · tax-aware rebalance preview · ${account.name}`, asOf }]
  const info = (claim: string): AgentFinding[] => [{ claim, attention: 'info', figures: [], citations }]
  if (account.mandate === 'custom') return info('This account is a custom mandate, not model-managed: there is no model to rebalance it to, so no proposal to check.')
  const legs = generateRebalanceTrades(account.id, true)
  if (legs.length === 0) return info('There is no rebalance proposal to check.')
  const evaluated = evaluateProposal(account.id, legs.map((l) => ({ symbol: l.symbol, side: l.side, quantity: l.quantity, estimatedValue: l.estimatedValue })))
  if (!evaluated) return info('The pre-trade check could not evaluate this account.')
  const result = withSuitability(evaluated, account, legs)
  if (result.violations.length === 0) return info('No pre-trade check flagged the proposal.')
  const names: Names = new Map([...getPositionsForAccount(account.id, account.totalValue).map((p) => [p.symbol, p.name] as const), ...legs.map((l) => [l.symbol, l.name] as const)])
  return result.violations.map((v) => {
    const { who, label, phrase } = describe(v, names)
    const verb = v.severity === 'block' ? 'Blocked' : 'Warning'
    const figures: Figure[] = []
    if (v.category === 'cash_minimum') {
      figures.push({ label: 'Cash after the proposal', value: result.projectedCashPct, unit: '%', source: 'evaluateProposal.projectedCashPct' })
      figures.push({ label: 'Minimum cash', value: v.limitWeight ?? result.minimumCash / account.totalValue, unit: '%', source: 'evaluateProposal.violations.limitWeight' })
    } else if (v.category === 'model_above_tolerance' && v.tolerance) {
      figures.push({ label: `${v.tolerance.modelName} risk score`, value: v.tolerance.modelScore, unit: 'pts', source: 'riskScoreOf(modelVolatility)' })
      figures.push({ label: `${v.tolerance.clientName}'s tolerance ceiling`, value: v.tolerance.ceiling, unit: 'pts', source: 'clients.riskProfile.score · RISK_PROFILE_TABLE' })
      figures.push({ label: `${v.tolerance.clientName}'s accounts as a whole, after this proposal`, value: v.tolerance.wholeAfterScore, unit: 'pts', source: 'clientRiskOf after the legs' })
    } else {
      if (v.projectedWeight !== undefined) figures.push({ label: `${label} after the proposal`, value: v.projectedWeight, unit: '%', source: 'evaluateProposal.violations.projectedWeight' })
      if (v.limitWeight !== undefined) figures.push({ label: `${label} limit`, value: v.limitWeight, unit: '%', source: 'evaluateProposal.violations.limitWeight' })
    }
    return { claim: `${verb}: ${who} ${phrase}.`, attention: v.severity === 'block' ? 'attention' : 'info', figures, citations }
  })
}
