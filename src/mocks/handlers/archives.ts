import { http, HttpResponse, delay } from 'msw'
import { archiveRecords } from '../data/archives'
import type { ArchiveDocType, AdvisorDisposition } from '@/types/archive'

export const archiveHandlers = [
  // List / search archives
  http.get('/api/compliance/archives', async ({ request }) => {
    await delay(200)
    const url = new URL(request.url)
    const query = url.searchParams.get('query')?.toLowerCase()
    const clientId = url.searchParams.get('clientId')
    const docType = url.searchParams.get('docType') as ArchiveDocType | null
    const disposition = url.searchParams.get('disposition') as AdvisorDisposition | null
    const dateFrom = url.searchParams.get('dateFrom')
    const dateTo = url.searchParams.get('dateTo')

    let results = [...archiveRecords]

    if (query) {
      results = results.filter((r) =>
        r.title.toLowerCase().includes(query) ||
        r.clientName.toLowerCase().includes(query) ||
        r.advisorName.toLowerCase().includes(query) ||
        r.originalContent.toLowerCase().includes(query) ||
        r.finalContent.toLowerCase().includes(query),
      )
    }

    if (clientId) {
      results = results.filter((r) => r.clientId === clientId)
    }

    if (docType) {
      results = results.filter((r) => r.documentType === docType)
    }

    if (disposition) {
      results = results.filter((r) => r.disposition === disposition)
    }

    if (dateFrom) {
      results = results.filter((r) => r.createdAt >= dateFrom)
    }

    if (dateTo) {
      results = results.filter((r) => r.createdAt <= dateTo)
    }

    // Sort newest first
    results.sort((a, b) => b.createdAt.localeCompare(a.createdAt))

    return HttpResponse.json(results)
  }),

  // Get single archive record
  http.get('/api/compliance/archives/:id', async ({ params }) => {
    await delay(100)
    const record = archiveRecords.find((r) => r.id === params.id)
    if (!record) return new HttpResponse(null, { status: 404 })
    return HttpResponse.json(record)
  }),

  // Archive stats
  http.get('/api/compliance/archives/stats', async () => {
    await delay(100)
    const total = archiveRecords.length
    const approved = archiveRecords.filter((r) => r.disposition === 'approved').length
    const edited = archiveRecords.filter((r) => r.disposition === 'edited').length
    const rejected = archiveRecords.filter((r) => r.disposition === 'rejected').length
    const byType = archiveRecords.reduce<Record<string, number>>((acc, r) => {
      acc[r.documentType] = (acc[r.documentType] ?? 0) + 1
      return acc
    }, {})

    return HttpResponse.json({
      total,
      approved,
      edited,
      rejected,
      byType,
      wormCompliant: archiveRecords.filter((r) => r.worm).length,
      oldestRecord: archiveRecords.reduce((oldest, r) => r.createdAt < oldest ? r.createdAt : oldest, archiveRecords[0]?.createdAt ?? ''),
      newestRecord: archiveRecords.reduce((newest, r) => r.createdAt > newest ? r.createdAt : newest, archiveRecords[0]?.createdAt ?? ''),
    })
  }),
]
