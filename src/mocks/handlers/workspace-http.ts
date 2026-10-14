import { HttpResponse } from 'msw'
import type { BindingAct } from '@/types/workspace'
import { isFirmViewer, viewerFrom } from '../workspace/visibility'
import { notFound } from './utils'

export const unauthorized = () => HttpResponse.json({ code: 'NO_VIEWER', message: 'A known viewer is required.' }, { status: 401 })
export const badRequest = (message: string) => HttpResponse.json({ code: 'BAD_REQUEST', message }, { status: 400 })
export const refusal = ({ status, code, message }: { status: number; code: string; message: string }) => HttpResponse.json({ code, message }, { status })

export async function readJson(request: Request): Promise<Record<string, unknown> | undefined> {
  const parsed: unknown = await request.json().catch(() => undefined)
  return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : undefined
}

export const nonEmptyString = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0

/**
 * The viewer for a firm-only surface (proposals, letters). Without a known viewer: 401. A client is told the
 * surface does not exist, before anything about the request is checked, so not even a 400 tells them otherwise.
 */
export function firmViewer(request: Request): { ok: true; viewerId: string } | { ok: false; response: Response } {
  const viewerId = viewerFrom(request)
  if (!viewerId) return { ok: false, response: unauthorized() }
  if (!isFirmViewer(viewerId)) return { ok: false, response: notFound() }
  return { ok: true, viewerId }
}

/** An act as an outsider may read it: what reached them, without the firm's subject, basis, rationale or presenter marker. */
export const withoutProvenance = ({ subject: _subject, basis: _basis, recordBasis: _recordBasis, editedBy: _editedBy, messageId: _messageId, viaPresenter: _via, rationale: _rationale, bestInterest: _bestInterest, ...act }: BindingAct): BindingAct => act
