import type { ProspectRecord } from '@/types/workspace-prospect'
import { PELL_ANSWERS, PELL_STATEMENTS, REPLY_AT } from '@/mocks/data/prospect-script'
import { requireProspect } from '../prospects'
import { deliverDisclosure } from '../disclosures'

export const ADRIAN = 'user-001'
const SCRIPTED = { presenterId: ADRIAN, path: 'scripted' } as const

/** Her coffee, questionnaire and statements on file, as the reply jump (Task 8) records them, without the clock or messages. */
export function withHerReply(): ProspectRecord {
  const record = requireProspect('prsp-011')
  record.coffee = { at: '2026-02-25T21:30:00.000Z', messageId: 'msg-fx01', authorId: ADRIAN }
  record.questionnaire = { answers: PELL_ANSWERS.map((a) => ({ ...a })), receivedAt: REPLY_AT }
  record.statements = PELL_STATEMENTS.map((s) => ({ ...s, holdings: s.holdings.map((h) => ({ ...h })) }))
  record.steps.push({ kind: 'questionnaire', at: REPLY_AT, messageId: 'msg-fx02', viaPresenter: SCRIPTED },
    { kind: 'statements', at: REPLY_AT, messageId: 'msg-fx03', viaPresenter: SCRIPTED })
  record.stage = 'discovery'
  record.stageHistory.push({ stage: 'discovery', at: REPLY_AT })
  return record
}

export function withFormCrs(): void {
  const r = deliverDisclosure(ADRIAN, 'prsp-011', 'form_crs')
  if (!r.ok) throw new Error(r.message)
}
