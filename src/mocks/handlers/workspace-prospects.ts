import { http, HttpResponse } from 'msw'
import type { BindingAct } from '@/types/workspace'
import type { RiskAnswer } from '@/types/onboarding'
import { isProspectStepName, type ProspectStepName } from '@/types/workspace-prospect'
import { prospectSummaries, visibleProspect } from '../workspace/prospects'
import { prospectView } from '../workspace/prospect-view'
import { actAsProspect, advanceProspect, herStep, partySteps, recordCoffee, type StepDone, type StepFailure } from '../workspace/prospect-steps'
import {
  createProspectProposal, parseProspectConstraints, readableProspectProposals, reviseProspectProposal, visibleProspectProposal,
} from '../workspace/prospect-proposals'
import { actForOutsider } from '../workspace/outsider-view'
import { isExternalViewer, viewerFrom } from '../workspace/visibility'
import { notFound } from './utils'
import { badRequest, firmViewer, nonEmptyString, readJson, refusal, unauthorized, withoutProvenance } from './workspace-http'

function parseAnswers(value: unknown): { ok: true; value?: RiskAnswer[] } | { ok: false; message: string } {
  if (value === undefined) return { ok: true }
  if (!Array.isArray(value)) return { ok: false, message: 'answers must be a list.' }
  const answers: RiskAnswer[] = []
  for (const raw of value) {
    const fields = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {}
    if (!nonEmptyString(fields.questionId) || typeof fields.selectedOption !== 'number') return { ok: false, message: 'Each answer names its question and its option.' }
    answers.push({ questionId: fields.questionId, selectedOption: fields.selectedOption })
  }
  return { ok: true, value: answers }
}

function actThreadOf(act: BindingAct): string {
  if (act.threadId === undefined) throw new Error(`Act ${act.id} has no thread an outsider could read it in`)
  return act.threadId
}

/** A step's answer. An outsider (she, viewing as herself) reads the act stripped of the firm's provenance. */
function stepped(r: StepDone | StepFailure, viewer: string) {
  if (!r.ok) return refusal(r)
  const act = r.act && isExternalViewer(viewer) ? actForOutsider(withoutProvenance(r.act), actThreadOf(r.act)) : r.act
  return HttpResponse.json({ steps: r.steps, ...(act ? { act } : {}) }, { status: 201 })
}

/** A step of hers: answered for her, the firm (told 403 by the engine) and no one else; the body is read only after that. */
function herRoute(step: ProspectStepName) {
  return http.post(`/api/workspace/prospects/:id/${step}`, async ({ request, params }) => {
    const viewer = viewerFrom(request)
    if (!viewer) return unauthorized()
    const id = String(params.id)
    if (!partySteps(viewer, id)) return notFound()
    const body = (await readJson(request)) ?? {}
    if (step === 'questionnaire') {
      const answers = parseAnswers(body.answers)
      if (!answers.ok) return badRequest(answers.message)
      return stepped(herStep(viewer, id, step, answers.value ? { answers: answers.value } : {}), viewer)
    }
    if (step === 'accept') {
      if (body.version !== undefined && typeof body.version !== 'number') return badRequest('version is a number.')
      return stepped(herStep(viewer, id, step, typeof body.version === 'number' ? { version: body.version } : {}), viewer)
    }
    return stepped(herStep(viewer, id, step), viewer)
  })
}

/** Prospects are a firm surface; only her own steps (and her steps' state) answer her. */
export const workspaceProspectHandlers = [
  http.get('/api/workspace/prospects', ({ request }) => {
    const viewer = firmViewer(request)
    if (!viewer.ok) return viewer.response
    return HttpResponse.json(prospectSummaries(viewer.viewerId) ?? [])
  }),

  http.get('/api/workspace/prospects/:id', ({ request, params }) => {
    const viewer = firmViewer(request)
    if (!viewer.ok) return viewer.response
    const view = prospectView(viewer.viewerId, String(params.id))
    return view ? HttpResponse.json(view) : notFound()
  }),

  http.get('/api/workspace/prospects/:id/steps', ({ request, params }) => {
    const viewer = viewerFrom(request)
    if (!viewer) return unauthorized()
    const steps = partySteps(viewer, String(params.id))
    return steps ? HttpResponse.json(steps) : notFound()
  }),

  http.post('/api/workspace/prospects/:id/coffee', async ({ request, params }) => {
    const viewer = firmViewer(request)
    if (!viewer.ok) return viewer.response
    const body = await readJson(request)
    const r = recordCoffee(viewer.viewerId, String(params.id), typeof body?.body === 'string' ? body.body : '')
    return r.ok ? HttpResponse.json(r.message, { status: 201 }) : refusal(r)
  }),

  http.post('/api/workspace/prospects/:id/advance', async ({ request, params }) => {
    const viewer = firmViewer(request)
    if (!viewer.ok) return viewer.response
    const id = String(params.id)
    if (!visibleProspect(viewer.viewerId, id)) return notFound()
    const to = (await readJson(request))?.to
    if (to !== 'reply' && to !== 'acceptance') return badRequest("to must be 'reply' or 'acceptance'.")
    return stepped(advanceProspect(viewer.viewerId, id, to), viewer.viewerId)
  }),

  herRoute('questionnaire'),
  herRoute('statements'),
  herRoute('accept'),

  http.get('/api/workspace/prospects/:id/proposals', ({ request, params }) => {
    const viewer = firmViewer(request)
    if (!viewer.ok) return viewer.response
    const list = readableProspectProposals(viewer.viewerId, String(params.id))
    return list ? HttpResponse.json(list) : notFound()
  }),

  http.post('/api/workspace/prospects/:id/proposals', ({ request, params }) => {
    const viewer = firmViewer(request)
    if (!viewer.ok) return viewer.response
    const r = createProspectProposal(viewer.viewerId, String(params.id))
    return r.ok ? HttpResponse.json(r.detail, { status: r.created ? 201 : 200 }) : refusal(r)
  }),

  http.post('/api/workspace/prospects/:id/proposals/:proposalId/revise', async ({ request, params }) => {
    const viewer = firmViewer(request)
    if (!viewer.ok) return viewer.response
    const proposal = visibleProspectProposal(viewer.viewerId, String(params.proposalId))
    if (!proposal || proposal.prospectId !== params.id) return notFound()
    const parsed = parseProspectConstraints((await readJson(request))?.constraints)
    if (!parsed.ok) return badRequest(parsed.message)
    const r = reviseProspectProposal(viewer.viewerId, proposal.id, parsed.value)
    return r.ok ? HttpResponse.json(r.detail, { status: 201 }) : refusal(r)
  }),

  http.post('/api/workspace/presenter/act-as-prospect', async ({ request }) => {
    const viewer = firmViewer(request)
    if (!viewer.ok) return viewer.response
    const body = await readJson(request)
    if (!body || !nonEmptyString(body.prospectId) || !isProspectStepName(body.step)) return badRequest('prospectId and step (questionnaire, statements or accept) are required.')
    return stepped(actAsProspect(viewer.viewerId, body.prospectId, body.step), viewer.viewerId)
  }),
]
