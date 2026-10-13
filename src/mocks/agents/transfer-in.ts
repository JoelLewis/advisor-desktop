import type { AgentContext, AgentFinding } from './agent'
import { prospectOf } from '@/mocks/workspace/prospects'
import { concentrationOf, transferSummary } from '@/mocks/workspace/transfer-in'
import { taxRateFor } from '@/lib/tax-rules'
import { SINGLE_NAME_LIMIT } from '@/lib/security-master'
import { claimNameOf } from './claim-name'

const TAX_CAVEAT = 'an estimate at the top federal rate; state tax not modeled; consult your tax professional'

/** Reads her statements: each holding moved in kind against sold now, with the gain and a tax estimate. Sells nothing; recommends no rollover. */
export function runTransferIn({ asOf, subject }: AgentContext): AgentFinding[] {
  if (subject.type !== 'prospect') throw new Error(`Transfer-In works on a prospect, not a ${subject.type}`)
  const record = prospectOf(subject.id)
  if (!record) throw new Error(`Transfer-In: no prospect ${subject.id}`)
  const summary = transferSummary(record)
  const taxable = record.statements.find((s) => s.accountType === 'taxable_brokerage')
  if (!summary || !taxable) {
    return [{ claim: 'No statements are on file yet; there is nothing to read.', attention: 'info', figures: [], citations: [{ source: 'Prospect record', asOf }] }]
  }
  const concentration = concentrationOf(summary)
  const statement = { source: `Statement · ${taxable.custodian} · taxable brokerage`, asOf: taxable.asOf }
  const holdings: AgentFinding[] = summary.lines.map((l) => {
    const name = claimNameOf(l.symbol, l.name)
    const result = `${l.holdingPeriod === 'long' ? 'long-term' : 'short-term'} ${l.unrealised >= 0 ? 'gain' : 'loss'}`
    const concentrated = concentration?.symbol === l.symbol
    return {
      claim: concentrated
        ? `${name} is a concentrated position; it can move in kind, which defers its ${result}, and selling it now would realize it (${TAX_CAVEAT}).`
        : `${name} can move in kind; selling it now would realize a ${result} (${TAX_CAVEAT}).`,
      attention: concentrated ? 'attention' : 'info',
      figures: [
        { label: 'Market value', value: l.marketValue, unit: 'USD', source: 'transfer.marketValue' },
        { label: 'Cost basis', value: l.costBasis, unit: 'USD', source: 'statement.costBasis' },
        { label: 'Unrealized', value: l.unrealised, unit: 'USD', source: 'transfer.unrealised' },
        { label: 'Tax if sold now', value: l.taxIfSoldNow, unit: 'USD', source: 'transfer.taxIfSoldNow' },
        { label: 'Rate', value: taxRateFor(l.holdingPeriod), unit: '%', source: 'taxRateFor' },
        ...(concentrated && concentration ? [
          { label: 'Share of her assets', value: concentration.weightOfAssets, unit: '%' as const, source: 'concentration.weightOfAssets' },
          { label: 'Single-name limit', value: SINGLE_NAME_LIMIT, unit: '%' as const, source: 'SINGLE_NAME_LIMIT' },
        ] : []),
      ],
      citations: [statement, { source: `Close · ${l.symbol}`, asOf: summary.pricesAsOf }],
    }
  })
  const cash: AgentFinding = { claim: 'Cash moves as cash and carries no gain.', attention: 'info',
    figures: [{ label: 'Cash', value: summary.cash, unit: 'USD', source: 'statement.cash' }], citations: [statement] }
  const heldAway: AgentFinding[] = summary.heldAway.map((h) => ({
    claim: 'Rollover of the former employer 403(b): asked about; comparison to follow.', attention: 'info',
    figures: [{ label: 'Value', value: h.value, unit: 'USD', source: 'statement.value' }],
    citations: [{ source: `Statement · ${h.custodian} · 403(b)`, asOf: record.statements.find((s) => s.id === h.statementId)?.asOf ?? asOf }],
  }))
  return [...holdings, cash, ...heldAway]
}
