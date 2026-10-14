import { PRESENTER_ID } from '@/lib/presenter'
import type { Act, AgentProfile, Person } from '@/types/workspace'

export const PEOPLE: readonly Person[] = [
  { id: 'user-001', name: 'Adrian Hale', role: 'advisor' },
  { id: 'user-002', name: 'Sarah Mitchell', role: 'csa' },
  { id: 'user-003', name: 'Mike Chen', role: 'analyst' },
  { id: 'cco-001', name: 'Mark Davis', role: 'compliance' },
  { id: 'cli-001', name: 'Robert Johnson', role: 'client' },
  { id: 'prsp-011', name: 'Dr. Amanda Pell', role: 'prospect' },
]

export const CCO_ID = 'cco-001'
export { PRESENTER_ID }

export const AGENTS: readonly AgentProfile[] = [
  { id: 'drift-monitor', name: 'Drift Monitor', produces: 'findings', scope: { may: ['measure and flag'], mayNot: ['stage or release trades', 'post in a client thread'] } },
  { id: 'pretrade-check', name: 'Pre-trade Check', produces: 'findings', scope: { may: ['run checks and report'], mayNot: ['clear a block', 'release orders', 'post in a client thread'] } },
  { id: 'harvest-scanner', name: 'Harvest Scanner', produces: 'findings', scope: { may: ['measure harvestable losses and their windows'], mayNot: ['stage trades', 'post in a client thread'] } },
  { id: 'proposal', name: 'Proposal Agent', produces: 'proposals', scope: { may: ['draft and revise proposals under constraints', 'draft and revise a prospect proposal under constraints'], mayNot: ['approve', 'release', 'post in a client thread'] } },
  { id: 'client-letter', name: 'Client Letter Agent', produces: 'letters', scope: { may: ['draft a client message from an approved version', 'draft a meeting recap from a filed record'], mayNot: ['send', 'post in a client thread'] } },
  { id: 'meeting-prep', name: 'Meeting Prep', produces: 'agenda', scope: { may: ['measure the household', 'propose an agenda'], mayNot: ['file notes', 'contact the client', 'post in a client thread'] } },
  { id: 'meeting-notes', name: 'Meeting Notes', produces: 'notes', scope: { may: ['draft notes from the transcript, each line citing it'], mayNot: ['file', 'assign people', 'add a recommendation nobody made', 'post in a client thread'] } },
  { id: 'prospect-profile', name: 'Prospect Profile', produces: 'findings', scope: { may: ['score the questionnaire', "map it to the firm's model, showing the working"], mayNot: ['contact the prospect', 'recommend accounts', 'post in a client thread'] } },
  { id: 'transfer-in', name: 'Transfer-In', produces: 'findings', scope: { may: ['read her statements', 'set moving each holding in kind against selling it, with the gain and a tax estimate'], mayNot: ['sell', 'recommend a rollover', 'post in a client thread'] } },
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
