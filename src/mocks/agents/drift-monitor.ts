import type { AgentContext, AgentFinding } from './agent'
import { accounts } from '@/mocks/data/accounts'
import { getPositionsForAccount } from '@/mocks/data/positions'
import { computeDriftForAccount } from '@/mocks/handlers/pms'
import { ASSET_CLASS_LABELS } from '@/lib/labels'
import { isMarketTradable } from '@/lib/security-master'
import { todayISO } from '@/lib/clock'
import { openWashSaleWindows } from '@/mocks/data/realised-sales'
import type { Position } from '@/types/portfolio'
import { claimNameOf } from './claim-name'

const label = (key: string): string => {
  const name = ASSET_CLASS_LABELS[key]
  if (!name) throw new Error(`Drift Monitor: no display name for asset class "${key}"`)
  return name
}

export function runDriftMonitor({ asOf, subject }: AgentContext): AgentFinding[] {
  if (subject.type !== 'account') return []
  const account = accounts.find((a) => a.id === subject.id)
  if (!account) return []
  const drift = computeDriftForAccount(account)
  const cite = [{ source: `Drift calculation · ${account.name}`, asOf }]
  const drifts = drift.assetClassDrifts
  if (drifts.length === 0) {
    return [{ claim: 'There are no holdings or model targets to measure drift against.', attention: 'info', figures: [], citations: cite }]
  }
  const band = drift.driftTolerance
  const worst = drifts.reduce((a, b) => (Math.abs(b.drift) > Math.abs(a.drift) ? b : a))
  const outside = drifts.filter((d) => Math.abs(d.drift) > band)
  const findings: AgentFinding[] = [{
    claim: drift.needsRebalance ? `${label(worst.assetClass)} is outside its tolerance band.` : 'Every asset class is inside its tolerance band.',
    attention: drift.needsRebalance ? 'attention' : 'info',
    citations: cite,
    figures: [
      { label: `Largest drift · ${label(worst.assetClass)}`, value: worst.drift, unit: 'pp', source: 'drift.assetClassDrifts' },
      { label: 'Tolerance', value: band, unit: 'pp', source: 'drift.driftTolerance' },
      ...outside.filter((d) => d !== worst).map((d) => ({ label: label(d.assetClass), value: d.drift, unit: 'pp' as const, source: 'drift.assetClassDrifts' })),
    ],
  }]
  const offModel = drifts.filter((d) => d.target === 0 && d.actual > 0)
  if (offModel.length > 0) {
    findings.push({
      claim: 'Some holdings sit outside the model.',
      attention: 'info',
      citations: cite,
      figures: offModel.map((d) => ({ label: label(d.assetClass), value: d.actual, unit: '%' as const, source: 'drift.assetClassDrifts.actual' })),
    })
  }
  const positions = getPositionsForAccount(account.id, account.totalValue)
  for (const d of drifts) {
    const held = positions.filter((p) => p.assetClass === d.assetClass && p.symbol !== 'CASH')
    if (held.length > 0 && held.every((p) => !isMarketTradable(p.symbol)) && d.drift > 0) {
      findings.push({
        claim: `${label(d.assetClass)} cannot be sold at market; it can only be reduced at the fund's periodic repurchase windows.`,
        attention: 'info', citations: cite,
        figures: [{ label: label(d.assetClass), value: d.drift, unit: 'pp', source: 'drift.assetClassDrifts' }],
      })
    }
  }
  findings.push(...replacementHolds(account.id, positions, asOf))
  return findings
}

/** Replacements bought for a loss sale whose wash-sale window is still open: a rebalance should not trim them away. */
function replacementHolds(accountId: string, positions: readonly Position[], asOf: string): AgentFinding[] {
  return openWashSaleWindows(todayISO())
    .filter((w) => w.accountId === accountId && w.replacementSymbol !== undefined)
    .flatMap((w) => {
      const replacement = positions.find((p) => p.symbol === w.replacementSymbol && p.quantity > 0)
      if (!replacement) return []
      const held = claimNameOf(replacement.symbol, replacement.name)
      const sold = claimNameOf(w.symbol, w.name)
      return [{
        claim: `${held} replaces ${sold}, sold at a loss, and keeps that market exposure while the wash-sale window is open. `
          + `A ${label(replacement.assetClass)} trim should leave it in place, and ${sold} should not be bought back before the window closes, or the harvested loss would be disallowed.`,
        attention: 'info' as const,
        citations: [{ source: `Wash-sale window · ${w.id} · ${w.symbol} loss sale of ${w.saleDate}, open to ${w.end}`, asOf }],
        figures: [
          { label: `${replacement.symbol} weight`, value: replacement.weight, unit: '%' as const, source: 'positions.weight' },
          { label: `Days until the ${w.symbol} window closes`, value: w.daysRemaining, unit: 'd' as const, source: 'openWashSaleWindows.daysRemaining' },
        ],
      }]
    })
}
