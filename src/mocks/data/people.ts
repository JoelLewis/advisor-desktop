import type { Act, AgentProfile, Person } from '@/types/workspace'

export const PEOPLE: readonly Person[] = [
  { id: 'user-001', name: 'Adrian Hale', role: 'advisor' },
  { id: 'user-002', name: 'Sarah Mitchell', role: 'csa' },
  { id: 'user-003', name: 'Mike Chen', role: 'analyst' },
  { id: 'cco-001', name: 'Mark Davis', role: 'compliance' },
  { id: 'cli-001', name: 'Robert Johnson', role: 'client' },
]

export const CCO_ID = 'cco-001'

export const AGENTS: readonly AgentProfile[] = [
  { id: 'drift-monitor', name: 'Drift Monitor', produces: 'findings', scope: { may: ['measure and flag'], mayNot: ['stage or release trades', 'post in a client thread'] } },
  { id: 'pretrade-check', name: 'Pre-trade Check', produces: 'findings', scope: { may: ['run checks and report'], mayNot: ['clear a block', 'release orders', 'post in a client thread'] } },
  { id: 'harvest-scanner', name: 'Harvest Scanner', produces: 'findings', scope: { may: ['measure harvestable losses and their windows'], mayNot: ['stage trades', 'post in a client thread'] } },
  { id: 'proposal', name: 'Proposal Agent', produces: 'proposals', scope: { may: ['draft and revise proposals under constraints'], mayNot: ['approve', 'release', 'post in a client thread'] } },
  { id: 'client-letter', name: 'Client Letter Agent', produces: 'letters', scope: { may: ['draft a client message from an approved version'], mayNot: ['send', 'post in a client thread'] } },
]

const PERMISSIONS: Readonly<Record<Person['role'], readonly Act[]>> = {
  advisor: ['post_firm', 'draft_for_client', 'send_to_client', 'approve_proposal', 'withdraw_approval'],
  csa: ['post_firm', 'draft_for_client'],
  analyst: ['post_firm'],
  compliance: ['post_firm', 'read_all_firm_threads', 'release_orders', 'return_to_advisor', 'escalate', 'dispose_alert', 'review_correspondence'],
  client: [],
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
