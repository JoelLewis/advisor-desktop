import { PRESENTER_ID } from '@/lib/presenter'
import type { Act, AgentProfile, Person } from '@/types/workspace'

export const PEOPLE: readonly Person[] = [
  { id: 'user-001', name: 'Adrian Hale', role: 'advisor' },
  { id: 'user-002', name: 'Sarah Mitchell', role: 'csa' },
  { id: 'user-003', name: 'Mike Chen', role: 'analyst' },
  { id: 'cco-001', name: 'Mark Davis', role: 'compliance' },
  { id: 'cli-001', name: 'Robert Johnson', role: 'client' },
  { id: 'cli-002', name: 'Patricia Johnson', role: 'client' },
  { id: 'prsp-011', name: 'Dr. Amanda Pell', role: 'prospect' },
]

export const CCO_ID = 'cco-001'
export { PRESENTER_ID }

export const AGENTS: readonly AgentProfile[] = [
  { id: 'drift-monitor', name: 'Drift Monitor', produces: 'findings', scope: { may: ['measure drift against the model', 'flag what sits outside its band'], mayNot: ['place or approve trades', 'post in a client conversation'] } },
  { id: 'pretrade-check', name: 'Pre-trade Check', produces: 'findings', scope: { may: ['run the pre-trade checks on a proposal and report them'], mayNot: ['clear a block', 'release orders', 'post in a client conversation'] } },
  { id: 'harvest-scanner', name: 'Harvest Scanner', produces: 'findings', scope: { may: ['find losses that can be harvested, and their wash-sale windows'], mayNot: ['place or approve trades', 'post in a client conversation'] } },
  { id: 'proposal', name: 'Proposal Agent', produces: 'proposals', scope: { may: ['draft and revise proposals within the constraints given', "draft and revise a prospect's proposal within the constraints given"], mayNot: ['approve a proposal', 'release orders', 'post in a client conversation'] } },
  { id: 'client-letter', name: 'Client Letter Agent', produces: 'letters', scope: { may: ['draft a client letter from an approved version', 'draft a meeting recap from a filed record'], mayNot: ['send', 'post in a client conversation'] } },
  { id: 'meeting-prep', name: 'Meeting Prep', produces: 'agenda', scope: { may: ["measure the household's accounts", 'propose an agenda'], mayNot: ['file notes', 'contact the client', 'post in a client conversation'] } },
  { id: 'meeting-notes', name: 'Meeting Notes', produces: 'notes', scope: { may: ['draft notes from the transcript, each line citing it', 'check what the notes say about the book against the household ledger'], mayNot: ['file the record', 'assign people', 'add a recommendation nobody made', 'post in a client conversation'] } },
  { id: 'prospect-profile', name: 'Prospect Profile', produces: 'findings', scope: { may: ['score the questionnaire', "map it to the firm's model, showing the working"], mayNot: ['contact the prospect', 'recommend accounts', 'post in a client conversation'] } },
  { id: 'transfer-in', name: 'Transfer-In', produces: 'findings', scope: { may: ["read the prospect's statements", 'weigh moving each holding in kind against selling it, with the gain and a tax estimate'], mayNot: ['sell anything', 'recommend a rollover', 'post in a client conversation'] } },
]

const PERMISSIONS: Readonly<Record<Person['role'], readonly Act[]>> = {
  advisor: ['post_firm', 'draft_for_client', 'send_to_party', 'deliver_disclosure', 'approve_proposal', 'withdraw_approval', 'prepare_meeting', 'file_meeting_record', 'resolve_break'],
  csa: ['post_firm', 'draft_for_client', 'resolve_break'],
  analyst: ['post_firm'],
  compliance: ['post_firm', 'read_all_firm_threads', 'release_orders', 'return_to_advisor', 'escalate', 'dispose_alert', 'review_correspondence'],
  client: [],
  prospect: [],
}

export function personById(id: string): Person | undefined {
  return PEOPLE.find((p) => p.id === id)
}

export function can(personId: string, act: Act): boolean {
  const person = personById(personId)
  return person ? PERMISSIONS[person.role].includes(act) : false
}

export function permissionsOf(personId: string): Act[] {
  const person = personById(personId)
  return person ? [...PERMISSIONS[person.role]] : []
}
