import { it, expect } from 'vitest'
import { draftOrigin, sentLetterOrigin } from '@/workspace/context/draft-origin'
import type { Directory, Draft } from '@/types/workspace'

const directory: Directory = {
  people: [{ id: 'user-001', name: 'Adrian Hale', role: 'advisor' }],
  agents: [{ id: 'client-letter', name: 'Client Letter Agent', produces: 'letters', scope: { may: ['draft'], mayNot: ['send', 'post in a client thread'] } }],
  permissions: {},
}
const draft = (extra: Partial<Draft>): Draft => ({ id: 'draft-0001', clientThreadId: 'th-robert', authorId: 'user-001', body: 'x', createdAt: 'x', ...extra })

it('says who drafted a draft, from which version, and who edited it', () => {
  expect(draftOrigin(draft({}), directory)).toBe('Drafted by Adrian Hale')
  expect(draftOrigin(draft({ agentId: 'client-letter', basis: { proposalId: 'prop-0001', version: 3, fingerprint: 'ABCD1234' } }), directory))
    .toBe("Drafted by Client Letter Agent at Adrian Hale's request · from v3 · fingerprint ABCD1234")
  expect(draftOrigin(draft({ agentId: 'client-letter', supersedes: 'draft-0001', basis: { proposalId: 'prop-0001', version: 3, fingerprint: 'ABCD1234' } }), directory))
    .toBe("Client Letter Agent's draft, edited by Adrian Hale · from v3 · fingerprint ABCD1234")
})

it("says a recap came from the filed record, and records it on the send", () => {
  const recordBasis = { eventId: 'evt-010', actId: 'REC-0001', fingerprint: '1A2B3C4D' }
  expect(draftOrigin(draft({ agentId: 'client-letter', recordBasis }), directory))
    .toBe("Drafted by Client Letter Agent at Adrian Hale's request · from the filed record REC-0001 · fingerprint 1A2B3C4D")
  const act = { id: 'REC-0002', kind: 'send_to_party' as const, actorId: 'user-001', at: '2026-02-25T20:30:00.000Z', fingerprint: 'X', summary: 'Message sent to the client', recordBasis, editedBy: [] }
  expect(sentLetterOrigin(act, directory)).toBe('from the filed record REC-0001 · fingerprint 1A2B3C4D · agent draft, unedited')
})
