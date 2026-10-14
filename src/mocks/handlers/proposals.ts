import { http, HttpResponse, delay } from 'msw'
import { nextEventTime, nextRecordNumber } from './event-clock'
import { proposalTemplates, SECTION_LABELS, generateSectionContent, complianceRules } from '../data/proposals'
import { clients } from '../data/clients'
import { accounts } from '../data/accounts'
import { households } from '../data/households'
import type { ProposalDraft, ProposalSection, ProposalSectionType, ProposalClientData } from '@/types/proposal'
import { notFound } from './utils'
import type { AssetClass } from '@/types/portfolio'
import { now as clockNow } from '@/lib/clock'
import { bandFor, type ProfileBand, type RiskProfile } from '@/lib/risk-profile'
import { MODEL_DEFINITIONS } from '@/mocks/data/model-definitions'

const proposalStore = new Map<string, ProposalDraft>()

const OBJECTIVE_BY_PROFILE: Readonly<Record<RiskProfile, string>> = {
  conservative: 'Capital Preservation',
  moderate_conservative: 'Income with Moderate Growth',
  moderate: 'Balanced Growth',
  moderate_aggressive: 'Capital Appreciation',
  aggressive: 'Maximum Growth',
}

const DISPLAY_CLASS: Readonly<Record<AssetClass, string>> = {
  us_equity: 'US Equity', intl_equity: 'International Equity', emerging_markets: 'International Equity',
  fixed_income: 'Fixed Income', cash: 'Cash',
  alternatives: 'Alternatives', real_estate: 'Alternatives', commodities: 'Alternatives', private_equity: 'Alternatives', digital_assets: 'Alternatives',
}

const isAssetClass = (value: string): value is AssetClass => Object.prototype.hasOwnProperty.call(DISPLAY_CLASS, value)

/** The targets of the firm model the client's band names, in percent, grouped into the proposal's five classes. */
function bandModelAllocation(band: ProfileBand): { assetClass: string; weight: number }[] {
  const model = MODEL_DEFINITIONS.find((m) => m.id === band.modelId)
  if (!model) throw new Error(`The ${band.label} band names no firm model ${band.modelId}`)
  const grouped = new Map<string, number>()
  for (const { assetClass, targetWeight } of model.assetClasses) {
    if (!isAssetClass(assetClass)) throw new Error(`${model.id} targets an unknown asset class ${assetClass}`)
    const label = DISPLAY_CLASS[assetClass]
    grouped.set(label, (grouped.get(label) ?? 0) + targetWeight)
  }
  return [...grouped].map(([assetClass, weight]) => ({ assetClass, weight: Math.round(weight * 10_000) / 100 }))
}

function deriveTimeHorizon(dateOfBirth: string): string {
  const today = clockNow()
  const birth = new Date(dateOfBirth)
  const age = today.getUTCFullYear() - birth.getUTCFullYear()
  if (age < 55) return '10+ years'
  if (age <= 65) return '5-10 years'
  return '3-5 years'
}

export const proposalHandlers = [
  // 1. GET /api/proposals/templates — return all proposal templates
  http.get('/api/proposals/templates', () => {
    return HttpResponse.json(proposalTemplates)
  }),

  // 2. POST /api/proposals/create — create a new proposal draft with pre-generated sections
  http.post('/api/proposals/create', async ({ request }) => {
    await delay(1500) // simulate AI generation time
    const body = (await request.json()) as { templateId: string; clientId: string }

    const template = proposalTemplates.find((t) => t.id === body.templateId)
    if (!template) {
      return new HttpResponse(JSON.stringify({ error: 'Template not found' }), { status: 404 })
    }

    const client = clients.find((c) => c.id === body.clientId)
    if (!client) {
      return new HttpResponse(JSON.stringify({ error: 'Client not found' }), { status: 404 })
    }

    const household = households.find((h) => h.id === client.householdId)
    const clientAccounts = accounts.filter((a) => a.clientId === client.id)
    const band = bandFor(client.riskProfile.score)

    const clientData: ProposalClientData = {
      clientId: client.id,
      clientName: client.fullName,
      email: client.email,
      phone: client.phone,
      householdAUM: household?.totalAUM ?? clientAccounts.reduce((sum, a) => sum + a.totalValue, 0),
      riskScore: client.riskProfile.score,
      riskTolerance: band.label,
      investmentObjective: OBJECTIVE_BY_PROFILE[band.profile],
      timeHorizon: deriveTimeHorizon(client.dateOfBirth),
      currentAllocation: bandModelAllocation(band),
    }

    const now = nextEventTime()

    // Auto-generate all section content inline during creation
    const sections: ProposalSection[] = template.sections.map((sectionType, idx) => {
      const content = generateSectionContent(sectionType, client.fullName, template.id, clientData.householdAUM)
      return {
        id: `sec-${nextRecordNumber()}-${idx}`,
        type: sectionType,
        label: SECTION_LABELS[sectionType] ?? sectionType,
        content,
        originalContent: content,
        status: 'generated' as const,
        generatedAt: now,
        editedAt: null,
      }
    })

    const draft: ProposalDraft = {
      id: `prop-${nextRecordNumber()}`,
      templateId: template.id,
      templateName: template.name,
      clientId: client.id,
      clientData,
      status: 'review',
      sections,
      allocation: template.defaultAllocation,
      feeTiers: template.feeTiers,
      complianceChecks: [],
      createdAt: now,
      updatedAt: now,
      finalizedAt: null,
    }

    proposalStore.set(draft.id, draft)
    return HttpResponse.json(draft, { status: 201 })
  }),

  // 3. GET /api/proposals/:id — return a single proposal draft
  http.get('/api/proposals/:id', ({ params }) => {
    const draft = proposalStore.get(params.id as string)
    if (!draft) return notFound()
    return HttpResponse.json(draft)
  }),

  // 4. POST /api/proposals/:id/generate-section — AI-generate content for a section
  http.post('/api/proposals/:id/generate-section', async ({ params, request }) => {
    await delay(600)
    const body = (await request.json()) as { sectionType: ProposalSectionType }
    const draft = proposalStore.get(params.id as string)
    if (!draft) return notFound()

    const section = draft.sections.find((s) => s.type === body.sectionType)
    if (!section) {
      return new HttpResponse(JSON.stringify({ error: 'Section not found' }), { status: 404 })
    }

    const content = generateSectionContent(body.sectionType, draft.clientData.clientName, draft.templateId, draft.clientData.householdAUM)
    const now = nextEventTime()

    section.content = content
    section.originalContent = content
    section.status = 'generated'
    section.generatedAt = now
    draft.updatedAt = now

    // If all sections are generated or edited, move to review status
    const allGenerated = draft.sections.every((s) => s.status === 'generated' || s.status === 'edited')
    if (allGenerated) {
      draft.status = 'review'
    }

    return HttpResponse.json(section)
  }),

  // 5. PUT /api/proposals/:id/sections/:sectionId — manually edit a section
  http.put('/api/proposals/:id/sections/:sectionId', async ({ params, request }) => {
    const body = (await request.json()) as { content: string }
    const draft = proposalStore.get(params.id as string)
    if (!draft) return notFound()

    const section = draft.sections.find((s) => s.id === params.sectionId)
    if (!section) {
      return new HttpResponse(JSON.stringify({ error: 'Section not found' }), { status: 404 })
    }

    const now = nextEventTime()
    section.content = body.content
    section.status = 'edited'
    section.editedAt = now
    draft.updatedAt = now

    return HttpResponse.json(section)
  }),

  // 6. POST /api/proposals/:id/compliance-check — run compliance rules
  http.post('/api/proposals/:id/compliance-check', async ({ params }) => {
    await delay(500)
    const draft = proposalStore.get(params.id as string)
    if (!draft) return notFound()

    const now = nextEventTime()
    const checks = complianceRules.map((cr, idx) => {
      let status: 'pass' | 'warning' | 'fail' = 'pass'
      let message = `${cr.rule} check passed.`

      // Fee reasonableness: warn if AUM < $1M
      if (cr.id === 'cr-003' && draft.clientData.householdAUM < 1_000_000) {
        status = 'warning'
        message = 'Fee schedule may exceed competitive rates for accounts under $1M. Consider reviewing fee tiers.'
      }

      // Required disclosures: warn if disclosures section not generated
      if (cr.id === 'cr-004') {
        const disclosureSection = draft.sections.find((s) => s.type === 'disclosures')
        if (!disclosureSection || disclosureSection.status === 'pending') {
          status = 'warning'
          message = 'Disclosures section has not been generated yet. Required before finalization.'
        }
      }

      // Regulatory filing: informational note
      if (cr.id === 'cr-006') {
        message = 'Form ADV Part 2 reference is current as of last annual update.'
      }

      return {
        id: `chk-${nextRecordNumber()}-${idx}`,
        rule: cr.rule,
        description: cr.description,
        status,
        message,
        severity: cr.severity,
      }
    })

    draft.complianceChecks = checks
    draft.status = 'compliance_check'
    draft.updatedAt = now

    return HttpResponse.json(checks)
  }),

  // 7. POST /api/proposals/:id/finalize — finalize the proposal
  http.post('/api/proposals/:id/finalize', async ({ params }) => {
    await delay(400)
    const draft = proposalStore.get(params.id as string)
    if (!draft) return notFound()

    const now = nextEventTime()
    draft.status = 'finalized'
    draft.finalizedAt = now
    draft.updatedAt = now

    return HttpResponse.json({
      success: true,
      proposalId: draft.id,
      documentId: `doc-prop-${nextRecordNumber()}`,
      message: 'Proposal finalized and ready for client presentation. Document has been added to the client document vault.',
    })
  }),

  // 8. GET /api/proposals/client/:clientId — all proposals for a client
  http.get('/api/proposals/client/:clientId', ({ params }) => {
    const clientId = params.clientId as string
    const clientProposals = Array.from(proposalStore.values()).filter(
      (p) => p.clientId === clientId,
    )
    return HttpResponse.json(clientProposals)
  }),
]
