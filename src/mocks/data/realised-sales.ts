/**
 * C10 · tax-loss-harvesting (IRC §1091) / rebalancing — a wash-sale window is opened by a realised
 * loss **sale**, not by a purchase. The previous calendar anchored on `lot.purchaseDate` and passed
 * it into a parameter literally named `saleDate`, so every recently-bought lot — including
 * profitable ones — was displayed as an open wash-sale window.
 *
 * Leaf data: the firm's realised sales for the trailing quarter. Windows are derived.
 */
export type RealisedSale = {
  id: string
  accountId: string
  householdId: string
  symbol: string
  name: string
  saleDate: string
  quantity: number
  proceeds: number
  costBasis: number
  /** Negative values are loss sales and open a wash-sale window. */
  realisedGainLoss: number
  holdingPeriod: 'short' | 'long'
}

export const realisedSales: RealisedSale[] = [
  { id: 'rs-001', accountId: 'acc-002', householdId: 'hh-001', symbol: 'INTC', name: 'Intel Corp.', saleDate: '2026-02-21', quantity: 5_000, proceeds: 142_250, costBasis: 175_000, realisedGainLoss: -32_750, holdingPeriod: 'long' },
  { id: 'rs-002', accountId: 'acc-007', householdId: 'hh-002', symbol: 'NVDA', name: 'NVIDIA Corp.', saleDate: '2026-02-10', quantity: 300, proceeds: 234_000, costBasis: 262_500, realisedGainLoss: -28_500, holdingPeriod: 'short' },
  { id: 'rs-003', accountId: 'acc-015', householdId: 'hh-004', symbol: 'INTC', name: 'Intel Corp.', saleDate: '2026-02-18', quantity: 4_000, proceeds: 113_800, costBasis: 138_667, realisedGainLoss: -24_867, holdingPeriod: 'long' },
  { id: 'rs-004', accountId: 'acc-011', householdId: 'hh-003', symbol: 'EFA', name: 'iShares MSCI EAFE ETF', saleDate: '2026-01-08', quantity: 1_200, proceeds: 98_760, costBasis: 92_500, realisedGainLoss: 6_260, holdingPeriod: 'long' },
  { id: 'rs-005', accountId: 'acc-022', householdId: 'hh-006', symbol: 'TLT', name: 'iShares 20+ Year Treasury Bond ETF', saleDate: '2026-02-05', quantity: 900, proceeds: 86_220, costBasis: 94_500, realisedGainLoss: -8_280, holdingPeriod: 'short' },
]

const DAY_MS = 1000 * 60 * 60 * 24

function shiftDays(iso: string, days: number): string {
  return new Date(new Date(`${iso}T00:00:00Z`).getTime() + days * DAY_MS).toISOString().slice(0, 10)
}

/** IRC §1091: 30 days before the sale, the sale date itself, and 30 days after. */
export function washSaleWindow(saleDate: string): { start: string; end: string; days: 61 } {
  return { start: shiftDays(saleDate, -30), end: shiftDays(saleDate, 30), days: 61 }
}

export type OpenWashSaleWindow = RealisedSale & {
  start: string
  end: string
  daysRemaining: number
}

export function openWashSaleWindows(asOf: string, householdId?: string): OpenWashSaleWindow[] {
  const asOfMs = new Date(`${asOf}T00:00:00Z`).getTime()
  return realisedSales
    .filter((s) => s.realisedGainLoss < 0)
    .filter((s) => householdId === undefined || s.householdId === householdId)
    .map((s) => {
      const { start, end } = washSaleWindow(s.saleDate)
      return {
        ...s, start, end,
        daysRemaining: Math.ceil((new Date(`${end}T00:00:00Z`).getTime() - asOfMs) / DAY_MS),
      }
    })
    .filter((w) => w.daysRemaining >= 0)
    .sort((a, b) => a.end.localeCompare(b.end))
}
