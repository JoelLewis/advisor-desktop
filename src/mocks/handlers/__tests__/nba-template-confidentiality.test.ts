import { describe, it, expect, beforeAll } from 'vitest'
import { getNBAEffectiveness, getNBATemplates, getNBAs } from '@/services/nba'
import { formatCurrency } from '@/lib/utils'
import type { NBAActionTemplate } from '@/types/nba'
import { nbas, intcHolderFor, clientDriftFacts, driftBatchFacts, type IntcHolder } from '@/mocks/data/nbas'
import { formatRatePercent } from '@/lib/tax-rules'
import { clients } from '@/mocks/data/clients'
import { ORDINARY_INCOME_OFFSET_LIMIT_SEPARATE } from '@/lib/capital-gains'

// The MSW server is started for every test file by src/test/setup.ts.

const dollarFigures = (text: string) => text.match(/\$[\d,]+(\.\d+)?[KMB]?/g) ?? []
const dollars = (amount: number) => `$${Math.round(Math.abs(amount)).toLocaleString('en-US')}`

/** Every dollar figure a letter about this holder's INTC may state: theirs, and the §1211(b) limits on their return. */
function holderFigures(h: IntcHolder): Set<string> {
  const amounts = [h.loss, h.ytdNet, h.savingThisYear, h.ordinaryIncomeOffset, h.carriedForward, h.ordinaryIncomeLimit]
  if (h.ifFilingSeparately) amounts.push(h.ifFilingSeparately.ordinaryIncomeOffset, h.ifFilingSeparately.carriedForward, ORDINARY_INCOME_OFFSET_LIMIT_SEPARATE)
  return new Set(amounts.map(dollars))
}

const taxNbas = nbas.filter((n) => n.category === 'tax_management')
const rebalancingNbas = nbas.filter((n) => n.category === 'rebalancing')

// Fetched together: the handler waits 500ms per template.
const templates = new Map<string, NBAActionTemplate>()
const templateFor = (nbaId: string, clientId: string) => templates.get(`${nbaId}:${clientId}`)!
beforeAll(async () => {
  const pairs = [...taxNbas, ...rebalancingNbas].flatMap((nba) => nba.clients.map((c) => [nba.id, c.id] as const))
  const fetched = await Promise.all(pairs.map(([nbaId, clientId]) => getNBATemplates(nbaId, clientId)))
  pairs.forEach(([nbaId, clientId], i) => templates.set(`${nbaId}:${clientId}`, fetched[i]!))
})

describe('C1 · a tax_management email speaks to one client, about that client alone', () => {
  for (const nba of taxNbas) {
    for (const client of nba.clients) {
      it(`${nba.id} addressed to ${client.name}: no other client's name, no figure that is not theirs`, () => {
        const template = templateFor(nba.id, client.id)
        const email = `${template.emailDraft.subject}\n${template.emailDraft.body}`
        expect(email).toContain(`Dear ${client.name},`)
        for (const other of clients.filter((c) => c.id !== client.id)) expect(email).not.toContain(other.fullName)
        // Advisor-facing copy may name the addressee's spouse on a joint return, never another holder.
        const whole = JSON.stringify(template)
        for (const other of nba.clients.filter((c) => c.id !== client.id)) expect(whole).not.toContain(other.name)

        const holder = intcHolderFor(client.id)
        const allowed = nba.id === 'nba-002' && holder
          ? holderFigures(holder)
          : new Set(nba.clients.length === 1 ? dollarFigures(nba.description) : [])
        for (const figure of dollarFigures(email)) expect(allowed, `${figure} in ${client.name}'s email`).toContain(figure)
      })
    }
  }
})

describe("C1 · the nba-002 email states the addressee's own saving", () => {
  const nba = nbas.find((n) => n.id === 'nba-002')!

  it('every INTC holder is an addressee of nba-002', () => {
    for (const client of nba.clients) expect(intcHolderFor(client.id)).toBeDefined()
  })

  it("Robert Johnson's email says he saves no capital-gains tax this year and that his loss carries forward; it never quotes David Williams's $1,490", () => {
    const holder = intcHolderFor('cli-001')!
    const { emailDraft } = templateFor('nba-002', 'cli-001')
    expect(holder.savingThisYear).toBe(0)
    expect(emailDraft.body).toContain('On your joint return, with a $32,750 net capital loss so far this year, harvesting the rest saves no capital-gains tax this year')
    expect(emailDraft.body).toContain(`${dollars(holder.carriedForward)} carries forward to later years`)
    expect(emailDraft.body).not.toContain('$1,490')
    expect(emailDraft.body).not.toMatch(/approximately \$\d+K/)
  })

  it("David Williams's email states his own $1,490", () => {
    const holder = intcHolderFor('cli-004')!
    const { emailDraft } = templateFor('nba-002', 'cli-004')
    expect(emailDraft.body).toContain(`harvesting saves about ${dollars(holder.savingThisYear)} of capital-gains tax this year`)
  })

  it('states the basis of the estimate, not a lot-rate range', () => {
    for (const client of nba.clients) {
      const template = templateFor('nba-002', client.id)
      expect(JSON.stringify(template)).not.toContain('applicable rate')
      expect(template.talkingPoints.join(' ')).toContain("against this return's realized results so far this year")
    }
  })

  it('addresses the first client when none is named, and refuses a client the NBA does not concern', async () => {
    const [unnamed, refused] = await Promise.allSettled([getNBATemplates('nba-002'), getNBATemplates('nba-002', 'cli-003')])
    expect(unnamed.status === 'fulfilled' && unnamed.value.emailDraft.body).toContain(`Dear ${nba.clients[0]!.name},`)
    expect(refused.status).toBe('rejected')
  })
})

const percentFigures = (text: string) => text.match(/±?\d+(\.\d+)?%/g) ?? []
const pct1 = (fraction: number) => `${(fraction * 100).toFixed(1)}%`

describe("I1 · a rebalancing email states the addressee's own drift, band and value to trade", () => {
  for (const nba of rebalancingNbas) {
    for (const client of nba.clients) {
      it(`${nba.id} addressed to ${client.name}`, () => {
        const { emailDraft } = templateFor(nba.id, client.id)
        const email = `${emailDraft.subject}\n${emailDraft.body}`
        const { outOfBand, valueToTradeUsd } = clientDriftFacts(client.id)
        for (const other of clients.filter((c) => c.id !== client.id)) expect(email).not.toContain(other.fullName)
        expect(email).not.toContain('threshold')
        expect(email).not.toContain(nba.trigger.value)

        // Every percentage is one of the addressee's own out-of-band accounts': the worst class's
        // weight and target, or the model's band.
        const own = new Set(outOfBand.flatMap(({ drift, worst }) => [pct1(worst.actual), pct1(worst.target), `±${formatRatePercent(drift.driftTolerance)}`]))
        for (const figure of percentFigures(email)) expect(own, `${figure} in ${client.name}'s email`).toContain(figure)
        const ownDollars = outOfBand.length > 0 ? [dollars(valueToTradeUsd)] : []
        expect(dollarFigures(email)).toEqual(ownDollars)
        for (const { account } of outOfBand) expect(email).toContain(`In your ${account.name}`)
      })
    }
  }

  it("Robert Johnson's nba-001 email gives his two accounts' drift, not the book-wide 6.2%–90.6% range", () => {
    const { emailDraft } = templateFor('nba-001', 'cli-001')
    const { outOfBand } = clientDriftFacts('cli-001')
    expect(outOfBand.map(({ account }) => account.id)).toEqual(['acc-001', 'acc-002'])
    expect(emailDraft.body).toContain('In your Robert Johnson Individual, US Equity is 68.2% against the Growth model\'s 55.0% target, 13.2 points over, outside its ±5% band.')
    expect(emailDraft.body).not.toContain('90.6%')
    expect(emailDraft.body).not.toContain('$45K')
  })
})

describe('I1 · nba-001 is not scored in dollars; its note states the turnover from the engine', () => {
  const nba = nbas.find((n) => n.id === 'nba-001')!

  it('has no dollar impact, and no hand-typed $45K', () => {
    expect(nba.estimatedImpact).toBe(0)
  })

  it('the note gives the one-way turnover and the account count, derived', () => {
    const facts = driftBatchFacts()
    expect(nba.estimatedImpactNote).toBe(
      'Not scored in dollars: rebalancing restores the risk each IPS sets. ' +
      `The batch would sell about ${formatCurrency(facts.valueToTradeUsd, { compact: true })}, and buy about as much, across ${facts.accountCount} accounts.`,
    )
    // Phase 7a · C1: each generated account holds its own model's lineup inside its band, so the batch
    // is the seven accounts a story or a transfer moved, not forty: about $6.2M one way, not $20.9M.
    expect(nba.estimatedImpactNote).toContain('$6.2M')
    expect(nba.estimatedImpactNote).toContain('across 7 accounts')
  })

  it('so the rebalancing category adds no revenue on the effectiveness page', async () => {
    const metrics = await getNBAEffectiveness()
    expect(rebalancingNbas.every((n) => n.estimatedImpact === 0)).toBe(true)
    expect(metrics.byCategory.find((c) => c.category === 'rebalancing')!.revenueImpact).toBe(0)
  })

  it('the note is served over the wire, not lost as an unread getter', async () => {
    const served = (await getNBAs()).find((n) => n.id === 'nba-001')!
    expect(served.estimatedImpactNote).toBe(nba.estimatedImpactNote)
  })
})
