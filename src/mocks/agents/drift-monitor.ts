import type { AgentContext, AgentFinding } from './agent'
import { accounts } from '@/mocks/data/accounts'
import { getPositionsForAccount } from '@/mocks/data/positions'
import { computeDriftForAccount } from '@/mocks/handlers/pms'
import { ASSET_CLASS_LABELS } from '@/lib/labels'
import { isMarketTradable } from '@/lib/security-master'

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
  return findings
}
