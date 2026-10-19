import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { calendarEvents } from '@/mocks/data/calendar'
import { activities } from '@/mocks/data/activities'
import { documents } from '@/mocks/data/documents'
import { prospects } from '@/mocks/data/prospects'
import { clients } from '@/mocks/data/clients'
import { accounts } from '@/mocks/data/accounts'
import { complianceAlerts } from '@/mocks/handlers/compliance'
import { MODEL_DEFINITIONS } from '@/mocks/data/model-definitions'
import { RISK_PROFILE_TABLE, bandFor, lowerRiskBand } from '@/lib/risk-profile'
import { FIRM_NAME } from '@/lib/firm'

const easternWeekday = (iso: string) => new Date(Date.parse(iso) - 5 * 3_600_000).getUTCDay()
const isWeekend = (iso: string) => [0, 6].includes(easternWeekday(iso.length === 10 ? `${iso}T17:00:00Z` : iso))

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return name === '__tests__' ? [] : sourceFiles(path)
    return /\.(ts|tsx)$/.test(name) ? [path] : []
  })
}

describe('Dr. Amanda Pell, the referral', () => {
  it('no source names Dr. Amanda Foster', () => {
    for (const file of sourceFiles('src')) expect(readFileSync(file, 'utf8'), file).not.toMatch(/Amanda Foster/)
  })

  it('evt-004 is her coffee with Adrian this afternoon, after the Johnson review', () => {
    expect(calendarEvents.find((e) => e.id === 'evt-004')).toMatchObject({
      title: 'Coffee — Dr. Amanda Pell (prospect)', meetingType: 'prospect',
      startTime: '2026-02-25T15:30:00-05:00', endTime: '2026-02-25T16:30:00-05:00', attendees: ['user-001'],
    })
  })

  it('names her in act-019, crediting James Thompson', () => {
    const text = activities.find((a) => a.id === 'act-019')?.description
    expect(text).toContain('Dr. Amanda Pell')
    expect(text).toMatch(/James/)
  })

  it('is prospect prsp-011 in the CRM: a referral from cli-008, assigned to Adrian Hale', () => {
    expect(prospects.find((p) => p.id === 'prsp-011')).toMatchObject({
      name: 'Dr. Amanda Pell', source: 'referral', stage: 'lead', assignedAdvisor: 'Adrian Hale', estimatedAUM: 3_000_000,
    })
  })
})

describe('William Foster, one story', () => {
  const foster = 'cli-017'
  it('his accounts were opened in 2022', () => {
    for (const a of accounts.filter((x) => x.clientId === foster)) expect(a.openDate.slice(0, 4), a.id).toBe('2022')
  })

  it('no record about him describes a new account or its opening', () => {
    const sources = {
      documents: documents.filter((d) => d.clientId === foster).map((d) => d.name),
      activities: activities.filter((a) => a.entityId === foster).flatMap((a) => [a.title, a.description]),
      alerts: complianceAlerts.filter((c) => c.entityId === foster).flatMap((c) => [c.title, c.description]),
    }
    // Every source is read: an empty one would let a renamed field pass this test by reading nothing.
    for (const [source, found] of Object.entries(sources)) expect(found.length, source).toBeGreaterThanOrEqual(1)
    const texts = Object.values(sources).flat()
    for (const text of texts) expect(text).not.toMatch(/account opening|new (individual )?brokerage|opened Feb|initial deposit|account application|Account Activated|Custodian Setup/i)
  })
})

describe('prospects', () => {
  it('are all assigned to Adrian Hale, the advisor', () => {
    for (const p of prospects) expect(p.assignedAdvisor, p.id).toBe('Adrian Hale')
  })

  it('have no next action on a weekend', () => {
    for (const p of prospects) expect(isWeekend(p.nextActionDate), `${p.id} ${p.nextActionDate}`).toBe(false)
  })

  it('name only real clients as referrers, by their own names', () => {
    const named = prospects.flatMap((p) => [p.notes ?? '', ...p.activities.map((a) => a.description)])
      .flatMap((text) => [...text.matchAll(/Referred by ([A-Z][a-z]+ [A-Z][a-z]+)/g)])
    expect(named.length).toBeGreaterThanOrEqual(5)
    for (const [, name] of named) expect(clients.some((c) => c.fullName === name), `${name ?? '?'} is a client`).toBe(true)
  })
})

describe('the firm', () => {
  it('no source names the invented "Mitchell Wealth Advisors" or gives Sarah Mitchell advisor credentials', () => {
    for (const file of sourceFiles('src')) {
      const text = readFileSync(file, 'utf8')
      expect(text, file).not.toMatch(/Mitchell Wealth|mitchellwealth|Sarah Mitchell, CFP/)
    }
  })

  it('is the fictional Larkfield Advisory', () => {
    expect(FIRM_NAME).toBe('Larkfield Advisory')
  })
})

describe('the risk-profile table', () => {
  it('maps every band to a model that exists', () => {
    for (const band of RISK_PROFILE_TABLE) expect(MODEL_DEFINITIONS.some((m) => m.id === band.modelId), band.profile).toBe(true)
  })

  it('covers every score from 0 to 100 exactly once, in order of risk', () => {
    expect(RISK_PROFILE_TABLE[0]?.floor).toBe(0)
    expect(RISK_PROFILE_TABLE[RISK_PROFILE_TABLE.length - 1]?.ceiling).toBe(100)
    for (let i = 1; i < RISK_PROFILE_TABLE.length; i++) expect(RISK_PROFILE_TABLE[i]?.floor).toBe((RISK_PROFILE_TABLE[i - 1]?.ceiling ?? -1) + 1)
  })

  it('puts more in stocks as the band gets riskier', () => {
    const equity = (modelId: string) => (MODEL_DEFINITIONS.find((m) => m.id === modelId)?.assetClasses ?? [])
      .filter((a) => ['us_equity', 'intl_equity', 'emerging_markets'].includes(a.assetClass)).reduce((s, a) => s + a.targetWeight, 0)
    const shares = RISK_PROFILE_TABLE.map((b) => equity(b.modelId))
    for (let i = 1; i < shares.length; i++) expect(shares[i]).toBeGreaterThan(shares[i - 1] ?? 1)
  })

  it('reads a score into its band, and a band into the next lower-risk one', () => {
    expect(bandFor(66)).toMatchObject({ profile: 'moderate_aggressive', modelId: 'mod-002' })
    expect(bandFor(25).profile).toBe('conservative')
    expect(bandFor(26).profile).toBe('moderate_conservative')
    expect(lowerRiskBand(bandFor(66))?.modelId).toBe('mod-001')
    expect(lowerRiskBand(bandFor(0))).toBeUndefined()
    expect(() => bandFor(101)).toThrow('score 101')
  })
})
