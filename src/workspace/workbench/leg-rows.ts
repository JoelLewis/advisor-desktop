import type { Status } from '@/kit/status/status'
import type { DraftPreview } from '@/types/workspace-proposal'
import { legStatus } from '@/workspace/proposal/leg-status'

export type LegRow = {
  symbol: string; name: string; side: 'buy' | 'sell'; quantity: number; estimatedValue: number
  shortTerm?: number; longTerm?: number; washed?: number; restrictedTo?: string; status: Status; excluded: boolean
}

/** The workbench's rows: the version's legs as the engine settled them, then the legs the edits excluded, as the agent proposed them. */
export function legRows(view: DraftPreview): LegRow[] {
  const traded = view.preview.trades.map((t, i): LegRow => {
    const sell = t.side === 'sell'
    const facts = view.legFacts.find((f) => f.symbol === t.symbol)
    if (sell && !facts) throw new Error(`The ${t.symbol} sale has no record of its lots or washed loss`)
    return {
      symbol: t.symbol, name: t.name, side: t.side, quantity: t.quantity, estimatedValue: t.estimatedValue,
      shortTerm: sell ? t.realizedShortTerm : undefined, longTerm: sell ? t.realizedLongTerm : undefined,
      washed: sell ? facts?.washed : undefined, restrictedTo: t.repurchaseBlockedUntil,
      status: legStatus(view.pretrade, i, t.symbol), excluded: false,
    }
  })
  const excluded = view.excludedLegs.map((l): LegRow => ({ ...l, status: 'OPEN', excluded: true }))
  return [...traded, ...excluded]
}
