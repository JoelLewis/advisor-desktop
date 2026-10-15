import { useEffect, useId, useState, type MutableRefObject } from 'react'
import { Button } from '@/kit/button/Button'
import { Checkbox } from '@/kit/checkbox/Checkbox'
import { NumberInput } from '@/kit/number-input/NumberInput'
import { fmtDayMonthYear, fmtQuantity, fmtResult } from '@/kit/measure'
import { useTaxLots } from '@/hooks/use-accounts'
import { usePositions } from '@/hooks/use-portfolio'
import { ApiClientError } from '@/services/api-client'
import type { TaxLot } from '@/types/portfolio'
import type { DraftPreview, LotTake } from '@/types/workspace-proposal'
import { parseQuantityText, type TypedQuantity } from './edit-draft'
import { SAVES_DRAFT_ATTRIBUTE } from './use-save-shortcut'

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
  /** The engine's refusal of the draft, shown beside the control it concerns when it names this leg. */
  refusal?: Error | null
  /** The view is not this draft's preview, so what each lot gives up is unknown and is not claimed. */
  takesUnknown?: boolean
  /** Holds this leg's commit of typed text, so a save commits what is on screen first. */
  pendingEdit?: MutableRefObject<(() => void) | undefined>
  /** Told what the field holds against the draft, and told 'none' when the leg closes. */
  onTypedText?: (typed: TypedQuantity) => void
}

const QUANTITY_REFUSALS = new Set(['BAD_QUANTITY', 'OVER_HELD'])

/** Where the engine's reason belongs: the quantity field or the lots; nothing when it is about another leg. */
function refusalPlace(refusal: Error | null | undefined, symbol: string): 'quantity' | 'lots' | undefined {
  if (!refusal || !refusal.message.startsWith(`${symbol}:`)) return undefined
  return refusal instanceof ApiClientError && QUANTITY_REFUSALS.has(refusal.code) ? 'quantity' : 'lots'
}

/** A lot as this version sells it: what the sale takes against what the lot holds, or the whole lot when it is not sold. */
function lotLabel(lot: TaxLot, take: LotTake | undefined, takesUnknown: boolean): string {
  const head = `${lot.id} · bought ${fmtDayMonthYear(lot.purchaseDate)} · ${lot.holdingPeriod === 'long' ? 'long-term' : 'short-term'}`
  if (takesUnknown) return `${head} · ${fmtQuantity(lot.quantity)} sh · ${fmtResult(lot.gainLoss)} USD · sold —`
  if (!take) return `${head} · ${fmtQuantity(lot.quantity)} sh · ${fmtResult(lot.gainLoss)} USD · not sold`
  return `${head} · ${fmtQuantity(take.shares)} of ${fmtQuantity(lot.quantity)} sh · ${fmtResult(take.realized)} of ${fmtResult(lot.gainLoss)} USD`
}

export function LegDetail({ accountId, view, symbol, excluded, quantity, lotIds, onToggleExclude, onQuantity, onLots, refusal, takesUnknown = false, pendingEdit, onTypedText }: LegDetailProps) {
  const lotsRefusalId = useId()
  const titleId = useId()
  const lots = useTaxLots(accountId)
  const positions = usePositions(accountId)
  const trade = view.preview.trades.find((t) => t.symbol === symbol) ?? view.excludedLegs.find((l) => l.symbol === symbol)
  const shownQuantity = quantity ?? trade?.quantity
  const [text, setText] = useState(shownQuantity === undefined ? '' : String(shownQuantity))
  // Keeps the field in step when the version on screen changes; typing is held until it is committed.
  useEffect(() => setText(shownQuantity === undefined ? '' : String(shownQuantity)), [shownQuantity])
  // Blank returns to the agent's quantity; an unchanged field (a blur with no edit) changes nothing.
  const commit = () => {
    if (!onQuantity || !trade) return
    const parsed = parseQuantityText(text)
    if (!parsed.ok) return
    const typed = parsed.quantity
    if (typed === shownQuantity && quantity !== undefined) return
    if (typed === trade.quantity && quantity === undefined) return
    onQuantity(typed)
  }
  const parsedText = parseQuantityText(text)
  const typedState: TypedQuantity = !parsedText.ok ? 'unparseable'
    : text !== (shownQuantity === undefined ? '' : String(shownQuantity)) ? 'differs' : 'none'
  useEffect(() => {
    onTypedText?.(typedState)
  }, [onTypedText, typedState])
  useEffect(() => () => onTypedText?.('none'), [onTypedText])
  useEffect(() => {
    if (!pendingEdit) return
    pendingEdit.current = commit
    return () => { pendingEdit.current = undefined }
  })
  if (!trade) return null
  const editable = onQuantity !== undefined
  const position = positions.data?.find((p) => p.symbol === symbol)
  const positionLots = position ? (lots.data ?? []).filter((l) => l.positionId === position.id) : []
  const facts = view.legFacts.find((f) => f.symbol === symbol)
  const selected = lotIds ?? facts?.lotIds ?? []
  const takes = new Map((facts?.lots ?? []).map((t) => [t.lotId, t]))
  const refusedAt = refusalPlace(refusal, symbol)
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
        <h3 id={titleId} className="text-label uppercase text-ink-2">{`Leg · ${symbol}`}</h3>
        <span className="text-body">{trade.name}</span>
      </div>
      <div className="flex flex-wrap items-end gap-6">
        <div {...{ [SAVES_DRAFT_ATTRIBUTE]: '' }}>
          <NumberInput label="Quantity" unit="sh" value={text} onChange={setText} onCommit={commit} disabled={!editable || excluded}
            error={!parsedText.ok ? 'Enter a number of shares' : refusedAt === 'quantity' ? refusal?.message : undefined} />
        </div>
        {onToggleExclude ? <Button rank="secondary" onClick={onToggleExclude}>{excluded ? 'Include this leg' : 'Exclude this leg'}</Button> : null}
      </div>
      {trade.side === 'sell' ? (
        <fieldset className="flex flex-col gap-2" aria-describedby={refusedAt === 'lots' ? lotsRefusalId : undefined}>
          <legend className="text-label uppercase text-ink-3">Lots sold · specific identification</legend>
          {lots.isPending || positions.isPending ? <p role="status" className="text-body text-ink-3">Loading the lots…</p> : null}
          {lots.isError ? <p role="alert" className="text-body">{lots.error.message}</p> : null}
          {positions.isError ? <p role="alert" className="text-body">{positions.error.message}</p> : null}
          {positionLots.map((lot) => (
            <Checkbox key={lot.id} checked={selected.includes(lot.id)} disabled={!onLots || excluded}
              onChange={(on) => toggleLot(lot.id, on)}
              label={lotLabel(lot, takes.get(lot.id), takesUnknown)} />
          ))}
          {refusedAt === 'lots' ? <p id={lotsRefusalId} className="text-label text-ink">{refusal?.message}</p> : null}
        </fieldset>
      ) : null}
    </section>
  )
}
