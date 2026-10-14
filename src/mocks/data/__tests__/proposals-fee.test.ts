import { describe, it, expect } from 'vitest'
import { generateSectionContent, proposalTemplates } from '@/mocks/data/proposals'
import { createProposal, generateSection } from '@/services/proposals'
import { blendedTieredFee } from '@/lib/fees'
import { formatCurrency } from '@/lib/utils'

describe('C33: proposal fee illustration is derived, not a hardcoded $5M/$40,250 example', () => {
  it('tpl-001 on a $5,000,000 basis shows $45,500 / 0.91%, not the stale $40,250 / 0.805%', () => {
    const content = generateSectionContent('fee_schedule', 'Test Client', 'tpl-001', 5_000_000)
    expect(content).toContain('$45,500')
    expect(content).toContain('0.910%')
    expect(content).not.toContain('$40,250')
    expect(content).not.toContain('0.805%')
  })

  it('recomputes for a different basis rather than always illustrating $5,000,000', () => {
    const content = generateSectionContent('fee_schedule', 'Test Client', 'tpl-001', 8_000_000)
    // tpl-001 tiers: 1.00% to $2M, 0.85% $2-5M, 0.70% $5-10M
    // fee = 2M*0.01 + 3M*0.0085 + 3M*0.0070 = 20,000 + 25,500 + 21,000 = 66,500
    expect(content).toContain('$66,500')
    expect(content).toContain('$8,000,000')
  })

  it('falls back to a $5,000,000 illustrative basis when no household AUM is supplied', () => {
    const content = generateSectionContent('fee_schedule', 'Test Client', 'tpl-001')
    expect(content).toContain('$45,500')
  })

  it('states the real per-trade commission schedule instead of claiming there are none', () => {
    const content = generateSectionContent('fee_schedule', 'Test Client', 'tpl-001', 5_000_000)
    expect(content.toLowerCase()).not.toContain('no additional trading commissions')
    expect(content).toContain('$4.95')
    expect(content).toContain('$0.65')
    expect(content).toContain('$1.00')
  })

  // Review round 1, Minor · billing convention is stated twice ("### Advisory Fee Structure" and
  // "### Annual Cost Estimate"); the first pass fixed an "in arrears"/"in advance" contradiction
  // between them, but nothing guarded it — reverting either line back to "arrears" passed every
  // other test. Guard both occurrences and the absence of "arrears" anywhere in the section.
  it('states "billed quarterly in advance" consistently; "arrears" appears only as the agreement-specific exception', () => {
    const content = generateSectionContent('fee_schedule', 'Test Client', 'tpl-001', 5_000_000)
    expect(content.toLowerCase().split('in arrears where the agreement says so').join('')).not.toContain('arrears')
    const adviceMatches = content.match(/quarterly in advance/gi) ?? []
    expect(adviceMatches.length).toBeGreaterThanOrEqual(2)
  })
})

describe('C33 wiring: the handler actually threads the client\'s AUM through', () => {
  // Review round 1, Minor · `generateSectionContent`'s own arithmetic is well covered above, but
  // nothing exercised the two call sites in `handlers/proposals.ts` that must pass
  // `clientData.householdAUM` through — deleting that argument at either call site (silently
  // falling back to the $5M illustration for every real client, i.e. C33 recurring in a new form)
  // passed every test above. This goes through the actual MSW handler, not the bare function.
  it("createProposal's fee_schedule section reflects the client's real household AUM, not the $5,000,000 fallback", async () => {
    const draft = await createProposal('tpl-001', 'cli-001')
    const householdAUM = draft.clientData.householdAUM
    expect(householdAUM).toBeGreaterThan(0)
    expect(householdAUM).not.toBe(5_000_000)

    const template = proposalTemplates.find((t) => t.id === 'tpl-001')!
    const tiers = template.feeTiers.map((t) => ({ upTo: t.maxAUM, rate: t.rate }))
    const { fee, blendedRate } = blendedTieredFee(householdAUM, tiers)

    const feeSection = draft.sections.find((s) => s.type === 'fee_schedule')!
    expect(feeSection.content).toContain(formatCurrency(householdAUM))
    expect(feeSection.content).toContain(formatCurrency(fee))
    expect(feeSection.content).toContain((blendedRate * 100).toFixed(3))

    // Guard the second call site too (`POST /:id/generate-section`) — re-generating the same
    // section must keep using the real AUM, not silently drop back to the $5M illustration.
    const regenerated = await generateSection(draft.id, 'fee_schedule')
    expect(regenerated.content).toContain(formatCurrency(fee))
  }, 10_000)
})
