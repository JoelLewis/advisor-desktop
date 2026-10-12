import { useEffect, useId, useState } from 'react'
import { Button } from '@/kit/button/Button'
import { Checkbox } from '@/kit/checkbox/Checkbox'
import { NumberInput } from '@/kit/number-input/NumberInput'
import { fmtDate, fmtQuantity, fmtResult } from '@/kit/measure'
import { useTaxLots } from '@/hooks/use-accounts'
import { usePositions } from '@/hooks/use-portfolio'
import type { DraftPreview } from '@/types/workspace-proposal'

type LegDetailProps = {
  accountId: string
  view: DraftPreview
  symbol: string
  excluded: boolean
  /** The draft's quantity and lots for this leg, when it edits them. */
  quantity?: number
  lotIds?: string[]
  onToggleExclude?: () => void
  onQuantity?: (quantity: number | undefined) => void
  onLots?: (lotIds: string[]) => void
}

export function LegDetail({ accountId, view, symbol, excluded, quantity, lotIds, onToggleExclude, onQuantity, onLots }: LegDetailProps) {
  const titleId = useId()
  const lots = useTaxLots(accountId)
  const positions = usePositions(accountId)
  const trade = view.preview.trades.find((t) => t.symbol === symbol) ?? view.excludedLegs.find((l) => l.symbol === symbol)
  const shownQuantity = quantity ?? trade?.quantity
  const [text, setText] = useState(shownQuantity === undefined ? '' : String(shownQuantity))
  // Keeps the field in step when the version on screen changes; typing is held until it is committed.
  useEffect(() => setText(shownQuantity === undefined ? '' : String(shownQuantity)), [shownQuantity])
  if (!trade) return null
  const editable = onQuantity !== undefined
  const position = positions.data?.find((p) => p.symbol === symbol)
  const positionLots = position ? (lots.data ?? []).filter((l) => l.positionId === position.id) : []
  const selected = lotIds ?? view.legFacts.find((f) => f.symbol === symbol)?.lotIds ?? []
  // Blank returns to the agent's quantity; an unchanged field (a blur with no edit) changes nothing.
  const commit = () => {
    if (!onQuantity) return
    const typed = text.trim() === '' ? undefined : Number(text.replace(/,/g, ''))
    if (typed === shownQuantity && quantity !== undefined) return
    if (typed === trade.quantity && quantity === undefined) return
    onQuantity(typed)
  }
  const toggleLot = (lotId: string, on: boolean) => {
    if (!onLots) return
    const next = new Set(selected)
    if (on) next.add(lotId)
    else next.delete(lotId)
    onLots(positionLots.map((l) => l.id).filter((id) => next.has(id)))
  }
  return (
    <section aria-labelledby={titleId} className="flex min-w-0 flex-col gap-4 border border-rule-2 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id={titleId} className="text-label uppercase text-ink-2">{`Leg · ${symbol}`}</h2>
        <span className="text-body">{trade.name}</span>
      </div>
      <div className="flex flex-wrap items-end gap-6">
        <NumberInput label="Quantity" unit="sh" value={text} onChange={setText} onCommit={commit} disabled={!editable || excluded} />
        {onToggleExclude ? <Button rank="secondary" onClick={onToggleExclude}>{excluded ? 'Include this leg' : 'Exclude this leg'}</Button> : null}
      </div>
      {trade.side === 'sell' ? (
        <fieldset className="flex flex-col gap-2">
          <legend className="text-label uppercase text-ink-3">Lots sold · specific identification</legend>
          {lots.isPending || positions.isPending ? <p role="status" className="text-body text-ink-3">Loading the lots…</p> : null}
          {lots.isError ? <p role="alert" className="text-body">{lots.error.message}</p> : null}
          {positions.isError ? <p role="alert" className="text-body">{positions.error.message}</p> : null}
          {positionLots.map((lot) => (
            <Checkbox key={lot.id} checked={selected.includes(lot.id)} disabled={!onLots || excluded}
              onChange={(on) => toggleLot(lot.id, on)}
              label={`${lot.id} · bought ${fmtDate(lot.purchaseDate)} · ${fmtQuantity(lot.quantity)} sh · ${lot.holdingPeriod === 'long' ? 'long-term' : 'short-term'} · ${fmtResult(lot.gainLoss)} USD`} />
          ))}
        </fieldset>
      ) : null}
    </section>
  )
}
