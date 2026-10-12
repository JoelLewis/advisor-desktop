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
    const facts = view.legFacts.find((f) => f.symbol === t.symbol)
    const sell = t.side === 'sell'
    return {
      symbol: t.symbol, name: t.name, side: t.side, quantity: t.quantity, estimatedValue: t.estimatedValue,
      shortTerm: sell ? t.realisedShortTerm : undefined, longTerm: sell ? t.realisedLongTerm : undefined,
      washed: sell ? facts?.washed ?? 0 : undefined, restrictedTo: t.repurchaseBlockedUntil,
      status: legStatus(view.pretrade, i, t.symbol), excluded: false,
    }
  })
  const excluded = view.excludedLegs.map((l): LegRow => ({ ...l, status: 'OPEN', excluded: true }))
  return [...traded, ...excluded]
}
