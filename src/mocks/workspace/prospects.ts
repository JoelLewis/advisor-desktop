import type { ProspectRecord, ProspectStage, ProspectSummary } from '@/types/workspace-prospect'
import { store } from '@/mocks/data/workspace-store'
import { canSeeThread, isFirmViewer } from './visibility'

export const PROSPECT_STAGES: readonly ProspectStage[] = ['contact', 'discovery', 'proposal', 'accepted', 'onboarding']

export const prospectOf = (id: string): ProspectRecord | undefined => store().prospects.find((p) => p.id === id)

export function requireProspect(id: string): ProspectRecord {
  const record = prospectOf(id)
  if (!record) throw new Error(`No prospect ${id}`)
  return record
}

/** A prospect a firm viewer may read: one whose internal thread they can see. Anyone else is told she does not exist. */
export function visibleProspect(viewerId: string, id: string): ProspectRecord | undefined {
  if (!isFirmViewer(viewerId)) return undefined
  const record = prospectOf(id)
  const thread = record && store().threads.find((t) => t.id === record.internalThreadId)
  return record && thread && canSeeThread(viewerId, thread) ? record : undefined
}

/** Moves her stage forward, recording when; a stage she has passed is never re-entered. */
export function advanceStage(record: ProspectRecord, stage: ProspectStage, at: string): void {
  if (PROSPECT_STAGES.indexOf(stage) <= PROSPECT_STAGES.indexOf(record.stage)) return
  record.stage = stage
  record.stageHistory.push({ stage, at })
}

/** What is on file about her: an agent run on her is a new run once this moves. */
export function prospectRevision(id: string): number {
  const record = prospectOf(id)
  return record ? record.steps.length + (record.coffee ? 1 : 0) : 0
}

export function prospectSummaries(viewerId: string): ProspectSummary[] | undefined {
  if (!isFirmViewer(viewerId)) return undefined
  return store().prospects.filter((p) => visibleProspect(viewerId, p.id) !== undefined)
    .map((p) => ({ id: p.id, name: p.name, stage: p.stage, threadId: p.threadId, internalThreadId: p.internalThreadId }))
}
