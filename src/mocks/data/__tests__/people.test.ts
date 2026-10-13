import { describe, it, expect } from 'vitest'
import { PEOPLE, AGENTS, CCO_ID, can, personById } from '../people'

describe('people and permissions', () => {
  it('has the six roles and no real names', () => {
    expect(PEOPLE.map((p) => p.role).sort()).toEqual(['advisor', 'analyst', 'client', 'compliance', 'csa', 'prospect'])
    expect(personById('user-001')?.name).toBe('Adrian Hale')
    expect(PEOPLE.some((p) => /joel/i.test(p.name))).toBe(false)
  })
  it.each([
    ['user-001', 'send_to_party', true], ['user-001', 'approve_proposal', true], ['user-001', 'draft_for_client', true],
    ['user-002', 'draft_for_client', true], ['user-002', 'send_to_party', false], ['user-002', 'approve_proposal', false],
    ['user-003', 'draft_for_client', false], ['user-003', 'post_firm', true],
    ['cco-001', 'release_orders', true], ['cco-001', 'return_to_advisor', true], ['cco-001', 'escalate', true],
    ['cco-001', 'dispose_alert', true], ['cco-001', 'review_correspondence', true],
    ['cco-001', 'read_all_firm_threads', true], ['cco-001', 'send_to_party', false], ['cco-001', 'approve_proposal', false],
    ['user-001', 'release_orders', false], ['user-001', 'dispose_alert', false], ['user-002', 'review_correspondence', false],
    ['cli-001', 'release_orders', false],
    ['cli-001', 'post_firm', false], ['cli-001', 'send_to_party', false],
    ['drift-monitor', 'send_to_party', false], ['nobody', 'post_firm', false], ['prsp-011', 'post_firm', false], ['prsp-011', 'send_to_party', false],
    ['user-001', 'prepare_meeting', true], ['user-001', 'file_meeting_record', true],
    ['user-002', 'prepare_meeting', false], ['user-002', 'file_meeting_record', false],
    ['user-003', 'file_meeting_record', false], ['cco-001', 'file_meeting_record', false], ['cli-001', 'prepare_meeting', false],
  ] as const)('can(%s, %s) is %s', (person, act, expected) => {
    expect(can(person, act)).toBe(expected)
  })
  it('agents declare what they may and may not do', () => {
    for (const a of AGENTS) {
      expect(a.scope.may.length).toBeGreaterThan(0)
      expect(a.scope.mayNot).toEqual(expect.arrayContaining(['post in a client thread']))
    }
  })
})

describe('phase 3 agents', () => {
  it('the desk has nine agents, each producing one kind of output', () => {
    expect(AGENTS.map((a) => [a.id, a.produces])).toEqual([
      ['drift-monitor', 'findings'], ['pretrade-check', 'findings'], ['harvest-scanner', 'findings'],
      ['proposal', 'proposals'], ['client-letter', 'letters'], ['meeting-prep', 'agenda'], ['meeting-notes', 'notes'],
      ['prospect-profile', 'findings'], ['transfer-in', 'findings'],
    ])
  })
  it('the Proposal Agent may not approve or release; the Client Letter Agent may not send', () => {
    expect(AGENTS.find((a) => a.id === 'proposal')?.scope.mayNot).toEqual(['approve', 'release', 'post in a client thread'])
    expect(AGENTS.find((a) => a.id === 'client-letter')?.scope.mayNot).toEqual(['send', 'post in a client thread'])
    expect(AGENTS.find((a) => a.id === 'harvest-scanner')?.scope.mayNot).toEqual(['stage trades', 'post in a client thread'])
  })
})

describe('phase 4 · separation of duties', () => {
  it('only the compliance officer holds the five compliance acts, and he approves and sends nothing', () => {
    const compliance = ['release_orders', 'return_to_advisor', 'escalate', 'dispose_alert', 'review_correspondence'] as const
    for (const person of PEOPLE) {
      for (const act of compliance) expect(can(person.id, act), `${person.id} ${act}`).toBe(person.id === CCO_ID)
    }
    expect(personById(CCO_ID)?.name).toBe('Mark Davis')
  })
})

describe('phase 5 · meeting agents', () => {
  it('Meeting Prep measures and proposes; it files nothing and contacts no one', () => {
    expect(AGENTS.find((a) => a.id === 'meeting-prep')).toMatchObject({
      name: 'Meeting Prep', scope: { may: ['measure the household', 'propose an agenda'], mayNot: ['file notes', 'contact the client', 'post in a client thread'] },
    })
  })
  it('Meeting Notes drafts with citations; it never files, assigns or recommends', () => {
    expect(AGENTS.find((a) => a.id === 'meeting-notes')).toMatchObject({
      name: 'Meeting Notes',
      scope: { may: ['draft notes from the transcript, each line citing it'], mayNot: ['file', 'assign people', 'add a recommendation nobody made', 'post in a client thread'] },
    })
  })
  it('the Client Letter Agent may also draft a recap from a filed record, and still never sends', () => {
    expect(AGENTS.find((a) => a.id === 'client-letter')?.scope).toEqual({
      may: ['draft a client message from an approved version', 'draft a meeting recap from a filed record'], mayNot: ['send', 'post in a client thread'],
    })
  })
  it('only the advisor prepares a meeting and files its record', () => {
    for (const person of PEOPLE) {
      expect(can(person.id, 'prepare_meeting'), person.id).toBe(person.role === 'advisor')
      expect(can(person.id, 'file_meeting_record'), person.id).toBe(person.role === 'advisor')
    }
  })
})
