import type { Draft } from '@/types/workspace'
import { isDraftStale } from '@/mocks/data/proposals-store'
import { accounts } from '@/mocks/data/accounts'
import { store } from '@/mocks/data/workspace-store'
import { openWashSaleWindowsFor } from '@/mocks/handlers/tax-return'
import { todayISO } from '@/lib/clock'

/** The latest end among the client's open INTC windows (their own wash-sale taxpayer's), from the engine. */
export function latestIntelWindowEnd(clientId: string): string | undefined {
  const ends = accounts.filter((a) => a.clientId === clientId)
    .flatMap((a) => openWashSaleWindowsFor(a, todayISO()))
    .filter((w) => w.symbol === 'INTC')
    .map((w) => w.end)
  return [...ends].sort().pop()
}

const clientOfDraft = (draft: Draft): string | undefined => {
  const clientId = store().threads.find((t) => t.id === draft.clientThreadId)?.clientId
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
    return `This recap states the Intel window through ${draft.recordBasis.windowEnd ?? 'no date'}, but the window now runs through ${latestIntelWindowEnd(clientOfDraft(draft) ?? '') ?? 'no date'}. Ask for a new recap.`
  }
  return draft.recordBasis
    ? `This recap was drafted from ${draft.recordBasis.actId}, which no longer matches the filed record. Ask for a new recap.`
    : `This letter was drafted from v${draft.basis?.version ?? 0}, which is no longer the approved version. Ask for a new letter.`
}
