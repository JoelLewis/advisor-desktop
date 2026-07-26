import { describe, it, expect } from 'vitest'
import { sendMessage, getAIInsights, getContextBriefing } from '@/services/ai'
import { accounts } from '@/mocks/data/accounts'
import { openWashSaleWindows } from '@/mocks/data/realised-sales'
import { computeDriftForAccount } from '@/mocks/handlers/pms'
import { MOCK_TODAY_ISO } from '@/lib/clock'

/**
 * §9.5 · AI answers agree with the data they cite.
 *
 * `getAIResponse` (mocks/data/ai.ts) picks between a context's response templates by
 * `message.length % responses.length` — it never inspects the message text unless a keyword
 * matches first. `'x'.repeat(n)` contains none of `keywordResponses`' keywords, so it reaches the
 * `trading:` context deterministically: even length selects index 0 (wash sale + open orders),
 * odd length selects index 1 (drift + harvestable-loss).
 */
const washSaleMessage = 'x'.repeat(4) // even → responsesByContext['trading:'][0]
const driftMessage = 'x'.repeat(5) // odd → responsesByContext['trading:'][1]

function longDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC',
  })
}

describe('§9.5 · AI answers agree with the data they cite', () => {
  it('the wash-sale count and date match openWashSaleWindows', async () => {
    const windows = openWashSaleWindows(MOCK_TODAY_ISO)
    const distinctAccounts = new Set(windows.map((w) => w.accountId)).size
    // Vacuity guard: if the fixture ever stopped producing open windows, a count of 0 would let
    // this test pass by matching a claim of "0 accounts" against reality trivially.
    expect(distinctAccounts).toBeGreaterThan(0)

    const sortedEnds = [...windows.map((w) => w.end)].sort()
    const latestEnd = sortedEnds[sortedEnds.length - 1]!

    const answer = await sendMessage(washSaleMessage, { screenType: 'trading' })
    const match = answer.content.match(/(\d+) accounts? with wash sale/)
    expect(match, `content had no wash-sale count: "${answer.content}"`).not.toBeNull()
    expect(Number(match![1])).toBe(distinctAccounts)
    expect(answer.content).toContain(longDate(latestEnd))
  })

  it('the drifted-account count matches the drift surface (computeDriftForAccount)', async () => {
    const driftedCount = accounts.filter((a) => computeDriftForAccount(a).needsRebalance).length
    // Vacuity guard: a count of 0 would let a claim of "0 accounts have drifted" pass trivially.
    expect(driftedCount).toBeGreaterThan(0)

    const answer = await sendMessage(driftMessage, { screenType: 'trading' })
    const match = answer.content.match(/(\d+) accounts? have drifted/)
    expect(match, `content had no drift count: "${answer.content}"`).not.toBeNull()
    expect(Number(match![1])).toBe(driftedCount)
  })

  it('every citation figure appears in the answer it supports', async () => {
    const answers = await Promise.all([
      sendMessage(washSaleMessage, { screenType: 'trading' }),
      sendMessage(driftMessage, { screenType: 'trading' }),
      // Reaches keywordResponses['tax'] regardless of screen — the book-wide TLH answer.
      sendMessage('Identify tax-loss harvesting opportunities', { screenType: 'dashboard' }),
    ])

    for (const answer of answers) {
      // Vacuity guard: an answer with no citations, or a citation with no digits, would let the
      // loop below pass without ever comparing a number — both must be non-empty for this test to
      // mean anything.
      const citations = answer.citations ?? []
      expect(citations.length, `"${answer.content}" has citations`).toBeGreaterThan(0)
      expect(
        citations.some((c) => /\d/.test(c.text)),
        `"${answer.content}" has at least one citation stating a number`,
      ).toBe(true)

      for (const citation of citations) {
        const numbers = citation.text.match(/[\d,]+(?:\.\d+)?/g) ?? []
        for (const n of numbers) {
          expect(answer.content, `citation "${citation.text}" claims a figure the answer doesn't state`).toContain(n)
        }
      }
    }
  })
})

/**
 * §9.5 (scope amendment) · the "Position Concentration Alert" insight (account_detail branch,
 * mocks/handlers/ai.ts) previously fired for every account with a hardcoded '8.2%' weight against
 * an invented 5% limit — the real SINGLE_NAME_LIMIT is 10% (security-master.ts). Fixed to derive
 * the largest single-name breach (if any) from the account's own positions.
 */
describe('§9.5 · Position Concentration Alert reflects real single-name breaches', () => {
  it('acc-011 (real NVDA breach at 13.9%, above the 10% single-stock limit) gets the alert with the derived figures', async () => {
    const insights = await getAIInsights('account_detail', 'acc-011')
    const alert = insights.find((i) => i.title === 'Position Concentration Alert')
    expect(alert, 'acc-011 has a genuine breach and must get the alert').toBeDefined()
    expect(alert?.metric?.value).toBe('13.9%')
    expect(alert?.body).toContain('NVDA')
    expect(alert?.body).toContain('10%')
    expect(alert?.body).not.toContain('5%')
  })

  it('acc-001 (AAPL at 7.6%, under the real 10% limit) gets no concentration alert', async () => {
    const insights = await getAIInsights('account_detail', 'acc-001')
    expect(insights.find((i) => i.title === 'Position Concentration Alert')).toBeUndefined()
  })

  // acc-006 · the $12M irrevocable trust (trust_taxable) — Task 2's re-review flagged it as the
  // account most likely to be broken by a careless gate, since it both legitimately harvests
  // losses (trust_taxable is taxable-for-this-purpose) and holds no single-name positions at all
  // (its top position is a 16.5% SPY allocation, a fund). A permanent assertion, replacing the
  // scratch tests that re-review used and deleted.
  //
  // The harvesting insight's own figures were fixed alongside the concentration alert
  // (coordinator follow-up): acc-006's real harvestable set is 3 positions / $36,400, and none of
  // its harvestable lots sit inside an open wash-sale window, so "clear for all candidates" is
  // true for this account specifically — not asserted unconditionally.
  it('acc-006 (trust_taxable, no single-name holdings) gets no concentration alert but still gets its harvesting insight, with the real derived figure', async () => {
    const insights = await getAIInsights('account_detail', 'acc-006')
    expect(insights.find((i) => i.title === 'Position Concentration Alert')).toBeUndefined()
    const harvest = insights.find((i) => i.title === 'Tax-Loss Harvesting Opportunity')
    expect(harvest).toBeDefined()
    expect(harvest?.metric?.value).toBe('$36,400')
    expect(harvest?.body).toContain('3 positions')
    expect(harvest?.body).toContain('clear for all candidates')
  })

  // Phase 1b gate, T1 · The trading-desk briefing's "Trade Restrictions" metric derives its count
  // from `openWashSaleWindows`, correctly — but nothing pinned it, so hardcoding it back to the
  // pre-Task-6 literal `2` survived all 2,265 tests. The value was right and the guard was absent,
  // which is indistinguishable from the value being wrong until someone edits it. Asserts the
  // count against the selector AND the accounts behind it, so a constant that happens to match
  // today still fails the moment the fixtures change.
  it('the trading-desk briefing restriction count matches openWashSaleWindows', async () => {
    const windows = openWashSaleWindows(MOCK_TODAY_ISO)
    const restricted = new Set(windows.map((w) => w.accountId))
    // Vacuity guard — an empty fixture set would satisfy any count assertion below.
    expect(restricted.size, 'fixtures must contain open wash-sale windows').toBeGreaterThan(0)

    const briefing = await getContextBriefing('trading')
    expect(briefing, 'trading briefing must exist').not.toBeNull()

    const metric = briefing!.metrics?.find((m) => /trade restrictions/i.test(m.label))
    expect(metric, 'briefing must carry a Trade Restrictions metric').toBeDefined()
    expect(metric!.value).toBe(`${restricted.size} account${restricted.size === 1 ? '' : 's'}`)
  })
})
