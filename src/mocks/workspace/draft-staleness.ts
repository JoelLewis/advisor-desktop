import type { Draft } from '@/types/workspace'
import { isDraftStale } from '@/mocks/data/proposals-store'
import { accounts } from '@/mocks/data/accounts'
import { store } from '@/mocks/data/workspace-store'
import { openWashSaleWindowsFor } from '@/mocks/handlers/tax-return'
import type { OpenWashSaleWindow } from '@/mocks/data/realized-sales'
import { todayISO } from '@/lib/clock'
import { clientDate } from '@/kit/measure'

/** The client's open INTC loss-sale windows (their own wash-sale taxpayer's), from the engine, each sale once. */
export function openIntelWindows(clientId: string): readonly OpenWashSaleWindow[] {
  const bySale = new Map(accounts.filter((a) => a.clientId === clientId)
    .flatMap((a) => openWashSaleWindowsFor(a, todayISO()))
    .filter((w) => w.symbol === 'INTC')
    .map((w) => [w.id, w]))
  return [...bySale.values()]
}

/** The latest end among the client's open INTC windows. */
export function latestIntelWindowEnd(clientId: string): string | undefined {
  return openIntelWindows(clientId).map((w) => w.end).sort().pop()
}

const clientOfDraft = (draft: Draft): string | undefined => {
  const clientId = store().threads.find((t) => t.id === draft.clientThreadId)?.partyId
  return clientId
}

const filingMoved = (draft: Draft): boolean => {
  const basis = draft.recordBasis
  if (!basis) return false
  const filed = store().meetings.find((m) => m.eventId === basis.eventId)?.filed
  return !filed || filed.actId !== basis.actId || filed.fingerprint !== basis.fingerprint
}

/** The Intel window the recap states no longer matches the engine's, though the filing is unchanged. */
const windowMoved = (draft: Draft): boolean => {
  const basis = draft.recordBasis
  const clientId = clientOfDraft(draft)
  if (!basis) return false
  if (clientId === undefined) throw new Error(`Recap ${draft.id} is in a thread with no client`)
  return basis.windowEnd !== latestIntelWindowEnd(clientId)
}

/** A recap is current only while the meeting's filing is exactly the one it was written from and its Intel window is still the engine's. */
export const isRecapStale = (draft: Draft): boolean => filingMoved(draft) || windowMoved(draft)

/** Whether an agent letter's basis — an approved version, or a filed record — no longer holds. */
export const isStale = (draft: Draft): boolean => isDraftStale(draft) || isRecapStale(draft)

export function staleMessage(draft: Draft): string {
  if (draft.recordBasis && !filingMoved(draft)) {
    const stated = draft.recordBasis.windowEnd
    const now = latestIntelWindowEnd(clientOfDraft(draft) ?? '')
    if (stated === undefined) return `This recap states no Intel wash-sale window, but one now runs through ${now === undefined ? 'no date' : clientDate(now)}. Ask for a new recap.`
    if (now === undefined) return `This recap states the Intel wash-sale window through ${clientDate(stated)}, but no window is open now. Ask for a new recap.`
    return `This recap states the Intel wash-sale window through ${clientDate(stated)}, but it now runs through ${clientDate(now)}. Ask for a new recap.`
  }
  return draft.recordBasis
    ? `This recap was drafted from ${draft.recordBasis.actId}, which no longer matches the filed record. Ask for a new recap.`
    : `This letter was drafted from v${draft.basis?.version ?? 0}, which is no longer the approved version. Ask for a new letter.`
}
