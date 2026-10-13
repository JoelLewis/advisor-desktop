import { store } from '@/mocks/data/workspace-store'

/** Dr. Pell's thread and its internal sibling, as Task 3 seeds them. Idempotent. */
export function ensurePellThreads(): void {
  const s = store()
  if (!s.threads.some((t) => t.id === 'th-pell')) {
    s.threads.push({ id: 'th-pell', title: 'Dr. Amanda Pell', visibility: 'client', partyId: 'prsp-011', memberIds: ['prsp-011', 'user-001', 'user-002'],
      agentIds: [], subject: { type: 'prospect', id: 'prsp-011' } })
  }
  if (!s.threads.some((t) => t.id === 'th-pell-work')) {
    s.threads.push({ id: 'th-pell-work', title: 'Pell · prospect work', visibility: 'internal', memberIds: ['user-001', 'user-002', 'user-003'],
      agentIds: [], subject: { type: 'prospect', id: 'prsp-011' } })
  }
}
