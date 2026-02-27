import { http, HttpResponse, delay } from 'msw'
import { proposalTemplates, SECTION_LABELS, generateSectionContent, complianceRules } from '../data/proposals'
import { clients } from '../data/clients'
import { accounts } from '../data/accounts'
import { households } from '../data/households'
import type { ProposalDraft, ProposalSection, ProposalSectionType, ProposalClientData } from '@/types/proposal'
import { notFound } from './utils'

const proposalStore = new Map<string, ProposalDraft>()

function deriveInvestmentObjective(tolerance: string): string {
  switch (tolerance) {
    case 'conservative':
      return 'Capital Preservation'
    case 'moderate':
      return 'Balanced Growth'
    case 'growth':
      return 'Capital Appreciation'
    case 'aggressive':
      return 'Maximum Growth'
    default:
      return 'Balanced Growth'
  }
}

function deriveTimeHorizon(dateOfBirth: string): string {
  const today = new Date()
  const birth = new Date(dateOfBirth)
  const age = today.getFullYear() - birth.getFullYear()
  if (age < 55) return '10+ years'
  if (age <= 65) return '5-10 years'
  return '3-5 years'
}

function getAllocationForRiskProfile(tolerance: string): { assetClass: string; weight: number }[] {
  switch (tolerance) {
    case 'conservative':
      return [
        { assetClass: 'US Equity', weight: 20 },
        { assetClass: 'International Equity', weight: 10 },
        { assetClass: 'Fixed Income', weight: 45 },
        { assetClass: 'Alternatives', weight: 10 },
        { assetClass: 'Cash', weight: 15 },
      ]
    case 'moderate':
      return [
        { assetClass: 'US Equity', weight: 35 },
        { assetClass: 'International Equity', weight: 15 },
        { assetClass: 'Fixed Income', weight: 30 },
        { assetClass: 'Alternatives', weight: 10 },
        { assetClass: 'Cash', weight: 10 },
      ]
    case 'growth':
      return [
        { assetClass: 'US Equity', weight: 45 },
        { assetClass: 'International Equity', weight: 20 },
        { assetClass: 'Fixed Income', weight: 20 },
        { assetClass: 'Alternatives', weight: 10 },
        { assetClass: 'Cash', weight: 5 },
      ]
    case 'aggressive':
      return [
        { assetClass: 'US Equity', weight: 50 },
        { assetClass: 'International Equity', weight: 25 },
        { assetClass: 'Fixed Income', weight: 10 },
        { assetClass: 'Alternatives', weight: 10 },
        { assetClass: 'Cash', weight: 5 },
      ]
    default:
      return [
        { assetClass: 'US Equity', weight: 35 },
        { assetClass: 'International Equity', weight: 15 },
        { assetClass: 'Fixed Income', weight: 30 },
        { assetClass: 'Alternatives', weight: 10 },
        { assetClass: 'Cash', weight: 10 },
      ]
  }
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

    const clientData: ProposalClientData = {
      clientId: client.id,
      clientName: client.fullName,
      email: client.email,
      phone: client.phone,
      householdAUM: household?.totalAUM ?? clientAccounts.reduce((sum, a) => sum + a.totalValue, 0),
      riskScore: client.riskProfile.score,
      riskTolerance: client.riskProfile.tolerance,
      investmentObjective: deriveInvestmentObjective(client.riskProfile.tolerance),
      timeHorizon: deriveTimeHorizon(client.dateOfBirth),
      currentAllocation: getAllocationForRiskProfile(client.riskProfile.tolerance),
    }

    const now = new Date().toISOString()

    // Auto-generate all section content inline during creation
    const sections: ProposalSection[] = template.sections.map((sectionType, idx) => {
      const content = generateSectionContent(sectionType, client.fullName, template.id)
      return {
        id: `sec-${Date.now()}-${idx}`,
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
      id: `prop-${Date.now()}`,
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

    const content = generateSectionContent(body.sectionType, draft.clientData.clientName, draft.templateId)
    const now = new Date().toISOString()

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

    const now = new Date().toISOString()
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

    const now = new Date().toISOString()
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
        id: `chk-${Date.now()}-${idx}`,
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

    const now = new Date().toISOString()
    draft.status = 'finalized'
    draft.finalizedAt = now
    draft.updatedAt = now

    return HttpResponse.json({
      success: true,
      proposalId: draft.id,
      documentId: `doc-prop-${Date.now()}`,
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
