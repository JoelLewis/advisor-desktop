import { describe, it, expect } from 'vitest'
import { getThread, getThreads } from '@/services/workspace'
import { PEOPLE } from '@/mocks/data/people'
import { personWithRole } from '@/lib/role-label'
import { store } from '@/mocks/data/workspace-store'
import { OUTSIDER_THREAD_TITLE, threadTitleFor } from '@/workspace/people/roster'
import { JUST_YOU, OUTSIDER_BAND, bandWordsOf } from '@/workspace/people/visibility-words'
import type { Thread } from '@/types/workspace'

const ADRIAN = 'user-001'
const ROBERT = 'cli-001'
const LARKFIELD_COMPLIANCE = 'Larkfield compliance (review)'
const outsiders = PEOPLE.filter((p) => p.role === 'client' || p.role === 'prospect')
const complianceNames = PEOPLE.filter((p) => p.role === 'compliance').map((p) => p.name)
const isOutsiderEntry = (entry: string) => outsiders.some((p) => entry === `${p.name} · Client` || entry === `${p.name} · Prospect`)

describe('the served roster', () => {
  it('names each reader and their role, and compliance supervising, to the firm', async () => {
    expect((await getThread(ADRIAN, 'th-robert')).roster).toEqual([
      'Robert Johnson · Client', 'Adrian Hale · Advisor', 'Sarah Mitchell · Client service', 'Mark Davis · Compliance (supervision)',
    ])
  })
  it("tells an outsider compliance reviews their messages, without a compliance officer's name", async () => {
    const { roster } = await getThread(ROBERT, 'th-robert')
    expect(roster).toEqual(['Robert Johnson · Client', 'Adrian Hale · Advisor', 'Sarah Mitchell · Client service', LARKFIELD_COMPLIANCE])
    for (const name of complianceNames) expect(roster.join(' ')).not.toContain(name)
  })
  it('a private thread is its owner alone', async () => {
    expect((await getThread(ADRIAN, 'th-brief')).roster).toEqual(['Adrian Hale · Advisor'])
  })

  it('agrees with the band on every seeded thread, for every viewer who can open it', async () => {
    let checked = 0
    for (const viewer of PEOPLE) {
      const external = outsiders.includes(viewer)
      const visible = new Set((await getThreads(viewer.id)).map((t) => t.id))
      for (const seeded of store().threads.filter((t: Thread) => visible.has(t.id))) {
        const { audience, roster } = await getThread(viewer.id, seeded.id)
        const band = bandWordsOf(audience, external)
        const where = `${seeded.id} as ${viewer.id}`
        expect(roster.length, where).toBeGreaterThan(0)
        switch (audience.kind) {
          case 'owner':
            // "Just you": the roster is the owner, and the owner is the viewer.
            expect(band, where).toBe(JUST_YOU)
            expect(roster, where).toEqual([personWithRole(viewer)])
            break
          case 'party':
            // The band names the party (or, to the party, the team and compliance); the roster leads with the party.
            expect(roster[0], where).toMatch(new RegExp(`^${audience.name.replace('.', '\\.')} · (Client|Prospect)$`))
            if (external) {
              expect(band, where).toBe(OUTSIDER_BAND)
              expect(roster[roster.length - 1], where).toBe(LARKFIELD_COMPLIANCE)
              for (const name of complianceNames) expect(roster.join(' '), where).not.toContain(name)
            } else {
              expect(band, where).toBe(`${audience.name} can read this`)
              expect(roster.some((r) => r.includes('Compliance')), where).toBe(true)
            }
            break
          case 'team':
            // The band says which clients can't see it; no client or prospect is on the roster, and compliance is.
            expect(external, where).toBe(false)
            expect(roster.filter(isOutsiderEntry), where).toEqual([])
            for (const name of audience.about) expect(roster.join(' '), where).not.toContain(`${name} ·`)
            expect(roster.some((r) => r.includes('Compliance')), where).toBe(true)
            break
        }
        checked += 1
      }
    }
    expect(checked).toBeGreaterThan(PEOPLE.length)
  })
})

describe('threadTitleFor', () => {
  it('addresses an outsider; the firm reads the thread title', () => {
    const robert = store().threads.find((t) => t.id === 'th-robert')
    if (!robert) throw new Error('th-robert is seeded')
    expect(threadTitleFor(robert, true)).toBe(OUTSIDER_THREAD_TITLE)
    expect(threadTitleFor(robert, true)).toBe('Your conversation with Larkfield')
    expect(threadTitleFor(robert, false)).toBe('Robert Johnson')
  })
})
