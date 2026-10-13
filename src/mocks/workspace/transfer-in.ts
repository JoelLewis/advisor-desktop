import type { Concentration, HeldAwayLine, Holding, ProspectRecord, Statement, TransferLine, TransferSummary } from '@/types/workspace-prospect'
import { HELD_AWAY_CLOSES, type Close } from '@/mocks/data/held-away-closes'
import { usdQuoteFor } from '@/mocks/handlers/pms'
import { holdingPeriodOn } from '@/lib/holding-period'
import { taxRateFor } from '@/lib/tax-rules'
import { SINGLE_NAME_LIMIT, securityKind } from '@/lib/security-master'
import { MOCK_TODAY_ISO } from '@/lib/clock'

/** The engine's day: her holdings are valued at the 25 Feb close and their holding periods read on it, whatever the session clock says. */
export const PRICES_AS_OF = MOCK_TODAY_ISO
export const cents = (v: number) => Math.round(v * 100) / 100

export function closeOf(symbol: string): Close {
  const close = usdQuoteFor(symbol) ?? HELD_AWAY_CLOSES.get(symbol)
  if (!close) throw new Error(`No 25 Feb close for ${symbol}`)
  return close
}

function lineOf(statement: Statement, holding: Holding): TransferLine {
  const kind = securityKind(holding.symbol, holding.assetClass)
  if (kind === 'cash') throw new Error(`${statement.id} lists cash as a holding; cash is the statement's own field`)
  const price = closeOf(holding.symbol).price
  const marketValue = cents(holding.quantity * price)
  const unrealised = cents(marketValue - holding.costBasis)
  const holdingPeriod = holdingPeriodOn(holding.acquired, PRICES_AS_OF)
  return {
    statementId: statement.id, symbol: holding.symbol, name: holding.name, assetClass: holding.assetClass, securityKind: kind,
    quantity: holding.quantity, price, marketValue, costBasis: holding.costBasis, acquired: holding.acquired, holdingPeriod, unrealised,
    taxIfSoldNow: unrealised > 0 ? cents(unrealised * taxRateFor(holdingPeriod)) : 0, plan: 'in_kind',
  }
}

const statementValue = (s: Statement) => cents(s.holdings.reduce((sum, h) => sum + h.quantity * closeOf(h.symbol).price, 0) + s.cash)

/** What she would transfer (her taxable account, in kind) and what stays held away (the 403(b)), at the 25 Feb close. */
export function transferSummary(record: ProspectRecord): TransferSummary | undefined {
  const taxable = record.statements.find((s) => s.accountType === 'taxable_brokerage')
  if (!taxable) return undefined
  const lines = taxable.holdings.map((h) => lineOf(taxable, h))
  const transferValue = cents(lines.reduce((s, l) => s + l.marketValue, 0) + taxable.cash)
  const heldAway: HeldAwayLine[] = record.statements.filter((s) => s.accountType === '403b')
    .map((s) => ({ statementId: s.id, custodian: s.custodian, accountType: '403b', value: statementValue(s), rollover: 'asked_about' }))
  const totalAssets = cents(transferValue + heldAway.reduce((s, h) => s + h.value, 0))
  return { lines, cash: taxable.cash, heldAway, transferValue, totalAssets, pricesAsOf: PRICES_AS_OF }
}

/** The largest single stock, when it is more than the single-name limit of everything she holds. */
export function concentrationOf(summary: TransferSummary): Concentration | undefined {
  const largest = summary.lines.filter((l) => l.securityKind === 'single_name').sort((a, b) => b.marketValue - a.marketValue)[0]
  if (!largest) return undefined
  const weightOfAssets = largest.marketValue / summary.totalAssets
  return weightOfAssets > SINGLE_NAME_LIMIT ? {
    symbol: largest.symbol, name: largest.name, marketValue: largest.marketValue, weightOfAssets, totalAssets: summary.totalAssets,
    unrealised: largest.unrealised, taxIfSoldNow: largest.taxIfSoldNow,
  } : undefined
}
