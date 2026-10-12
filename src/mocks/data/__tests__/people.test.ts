import { describe, it, expect } from 'vitest'
import { PEOPLE, AGENTS, can, personById } from '../people'

describe('people and permissions', () => {
  it('has the five roles and no real names', () => {
    expect(PEOPLE.map((p) => p.role).sort()).toEqual(['advisor', 'analyst', 'client', 'compliance', 'csa'])
    expect(personById('user-001')?.name).toBe('Adrian Hale')
    expect(PEOPLE.some((p) => /joel/i.test(p.name))).toBe(false)
  })
  it.each([
    ['user-001', 'send_to_client', true], ['user-001', 'approve_proposal', true], ['user-001', 'draft_for_client', true],
    ['user-002', 'draft_for_client', true], ['user-002', 'send_to_client', false], ['user-002', 'approve_proposal', false],
    ['user-003', 'draft_for_client', false], ['user-003', 'post_firm', true],
    ['cco-001', 'dispose_exception', true], ['cco-001', 'read_all_firm_threads', true], ['cco-001', 'send_to_client', false],
    ['cli-001', 'post_firm', false], ['cli-001', 'send_to_client', false],
    ['drift-monitor', 'send_to_client', false], ['nobody', 'post_firm', false],
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
  it('the desk has five agents, each producing one kind of output', () => {
    expect(AGENTS.map((a) => [a.id, a.produces])).toEqual([
      ['drift-monitor', 'findings'], ['pretrade-check', 'findings'], ['harvest-scanner', 'findings'],
      ['proposal', 'proposals'], ['client-letter', 'letters'],
    ])
  })
  it('the Proposal Agent may not approve or release; the Client Letter Agent may not send', () => {
    expect(AGENTS.find((a) => a.id === 'proposal')?.scope.mayNot).toEqual(['approve', 'release', 'post in a client thread'])
    expect(AGENTS.find((a) => a.id === 'client-letter')?.scope.mayNot).toEqual(['send', 'post in a client thread'])
    expect(AGENTS.find((a) => a.id === 'harvest-scanner')?.scope.mayNot).toEqual(['stage trades', 'post in a client thread'])
  })
})
