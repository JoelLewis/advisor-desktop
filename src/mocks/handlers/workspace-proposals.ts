import { http, HttpResponse } from 'msw'
import { visibleProposal } from '../workspace/proposal-acts'
import { createProposal, previewEdits, readableProposals, reviseProposal, saveVersion } from '../workspace/proposals'
import { parseConstraints, parseEdits } from '../workspace/proposal-engine'
import { detailOf } from '../data/proposals-store'
import { badRequest, firmViewer, nonEmptyString, readJson, refusal } from './workspace-http'
import { notFound } from './utils'

/** Proposals are a firm surface: a client gets 404 from every route, and each route checks visibility before the body. */
export const workspaceProposalHandlers = [
  http.get('/api/workspace/proposals', ({ request }) => {
    const viewer = firmViewer(request)
    if (!viewer.ok) return viewer.response
    const threadId = new URL(request.url).searchParams.get('threadId') ?? undefined
    const list = readableProposals(viewer.viewerId, threadId)
    return list ? HttpResponse.json(list) : notFound()
  }),

  http.get('/api/workspace/proposals/:id', ({ request, params }) => {
    const viewer = firmViewer(request)
    if (!viewer.ok) return viewer.response
    const proposal = visibleProposal(viewer.viewerId, String(params.id))
    return proposal ? HttpResponse.json(detailOf(proposal)) : notFound()
  }),

  http.post('/api/workspace/proposals', async ({ request }) => {
    const viewer = firmViewer(request)
    if (!viewer.ok) return viewer.response
    const body = await readJson(request)
    if (!body || !nonEmptyString(body.threadId) || !nonEmptyString(body.accountId)) return badRequest('threadId and accountId are required.')
    const r = createProposal(viewer.viewerId, body.threadId, body.accountId)
    return r.ok ? HttpResponse.json(r.detail, { status: r.created ? 201 : 200 }) : refusal(r)
  }),

  http.post('/api/workspace/proposals/:id/revise', async ({ request, params }) => {
    const viewer = firmViewer(request)
    if (!viewer.ok) return viewer.response
    const id = String(params.id)
    if (!visibleProposal(viewer.viewerId, id)) return notFound()
    const parsed = parseConstraints((await readJson(request))?.constraints)
    if (!parsed.ok) return badRequest(parsed.message)
    const r = reviseProposal(viewer.viewerId, id, parsed.value)
    return r.ok ? HttpResponse.json(r.detail, { status: 201 }) : refusal(r)
  }),

  http.post('/api/workspace/proposals/:id/versions', async ({ request, params }) => {
    const viewer = firmViewer(request)
    if (!viewer.ok) return viewer.response
    const id = String(params.id)
    if (!visibleProposal(viewer.viewerId, id)) return notFound()
    const parsed = parseEdits((await readJson(request))?.edits)
    if (!parsed.ok) return badRequest(parsed.message)
    const r = saveVersion(viewer.viewerId, id, parsed.value)
    return r.ok ? HttpResponse.json(r.detail, { status: 201 }) : refusal(r)
  }),

  http.post('/api/workspace/proposals/:id/preview', async ({ request, params }) => {
    const viewer = firmViewer(request)
    if (!viewer.ok) return viewer.response
    const id = String(params.id)
    if (!visibleProposal(viewer.viewerId, id)) return notFound()
    const parsed = parseEdits((await readJson(request))?.edits)
    if (!parsed.ok) return badRequest(parsed.message)
    const r = previewEdits(viewer.viewerId, id, parsed.value)
    return r.ok ? HttpResponse.json(r.preview) : refusal(r)
  }),
]
