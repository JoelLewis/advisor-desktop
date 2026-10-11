import { http, HttpResponse } from 'msw'
import type { Directory, ThreadDetail } from '@/types/workspace'
import { AGENTS, PEOPLE, permissionsOf } from '../data/people'
import { store } from '../data/workspace-store'
import { canSeeThread, viewerFrom, visibleThreads } from '../workspace/visibility'
import { notFound } from './utils'

const unauthorised = () => HttpResponse.json({ code: 'NO_VIEWER', message: 'A known viewer is required.' }, { status: 401 })

export const workspaceHandlers = [
  http.get('/api/workspace/people', ({ request }) => {
    if (!viewerFrom(request)) return unauthorised()
    const directory: Directory = { people: [...PEOPLE], agents: [...AGENTS], permissions: Object.fromEntries(PEOPLE.map((p) => [p.id, permissionsOf(p.id)])) }
    return HttpResponse.json(directory)
  }),

  http.get('/api/workspace/threads', ({ request }) => {
    const viewer = viewerFrom(request)
    if (!viewer) return unauthorised()
    return HttpResponse.json(visibleThreads(viewer))
  }),

  http.get('/api/workspace/threads/:id', ({ request, params }) => {
    const viewer = viewerFrom(request)
    if (!viewer) return unauthorised()
    const thread = store().threads.find((t) => t.id === params.id)
    if (!thread || !canSeeThread(viewer, thread)) return notFound()
    const messages = store().messages.filter((m) => m.threadId === thread.id).sort((a, b) => a.at.localeCompare(b.at))
    const detail: ThreadDetail = { thread, messages }
    return HttpResponse.json(detail)
  }),
]
