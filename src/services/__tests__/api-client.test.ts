import { describe, it, expect } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/server'
import { get, post, put, del, ApiClientError } from '../api-client'

describe('api-client', () => {
  describe('get', () => {
    it('constructs /api + path correctly', async () => {
      server.use(
        http.get('/api/test-resource', () => {
          return HttpResponse.json({ ok: true })
        }),
      )

      const result = await get<{ ok: boolean }>('/test-resource')
      expect(result).toEqual({ ok: true })
    })

    it('appends query params to the URL', async () => {
      server.use(
        http.get('/api/search', ({ request }) => {
          const url = new URL(request.url)
          const q = url.searchParams.get('q')
          const page = url.searchParams.get('page')
          return HttpResponse.json({ q, page })
        }),
      )

      const result = await get<{ q: string; page: string }>('/search', {
        q: 'hello',
        page: '2',
      })
      expect(result).toEqual({ q: 'hello', page: '2' })
    })

    it('works without query params', async () => {
      server.use(
        http.get('/api/items', () => {
          return HttpResponse.json([1, 2, 3])
        }),
      )

      const result = await get<number[]>('/items')
      expect(result).toEqual([1, 2, 3])
    })
  })

  describe('post', () => {
    it('sends JSON body with Content-Type header', async () => {
      server.use(
        http.post('/api/create', async ({ request }) => {
          const contentType = request.headers.get('Content-Type')
          const body = (await request.json()) as { name: string }
          return HttpResponse.json({ contentType, received: body })
        }),
      )

      const result = await post<{ contentType: string; received: { name: string } }>(
        '/create',
        { name: 'test' },
      )
      expect(result.contentType).toBe('application/json')
      expect(result.received).toEqual({ name: 'test' })
    })

    it('sends POST request without body', async () => {
      server.use(
        http.post('/api/trigger', () => {
          return HttpResponse.json({ triggered: true })
        }),
      )

      const result = await post<{ triggered: boolean }>('/trigger')
      expect(result).toEqual({ triggered: true })
    })
  })

  describe('put', () => {
    it('uses PUT method', async () => {
      server.use(
        http.put('/api/update/123', async ({ request }) => {
          const body = (await request.json()) as { value: number }
          return HttpResponse.json({ updated: true, value: body.value })
        }),
      )

      const result = await put<{ updated: boolean; value: number }>('/update/123', {
        value: 42,
      })
      expect(result).toEqual({ updated: true, value: 42 })
    })
  })

  describe('del', () => {
    it('uses DELETE method', async () => {
      server.use(
        http.delete('/api/remove/456', () => {
          return HttpResponse.json({ deleted: true })
        }),
      )

      const result = await del<{ deleted: boolean }>('/remove/456')
      expect(result).toEqual({ deleted: true })
    })
  })

  describe('error handling', () => {
    it('throws ApiClientError on non-200 response with JSON error body', async () => {
      server.use(
        http.get('/api/failing', () => {
          return HttpResponse.json(
            { code: 'NOT_FOUND', message: 'Resource not found' },
            { status: 404 },
          )
        }),
      )

      await expect(get('/failing')).rejects.toThrow(ApiClientError)

      try {
        await get('/failing')
      } catch (err) {
        expect(err).toBeInstanceOf(ApiClientError)
        const apiErr = err as ApiClientError
        expect(apiErr.code).toBe('NOT_FOUND')
        expect(apiErr.message).toBe('Resource not found')
        expect(apiErr.status).toBe(404)
      }
    })

    it('throws ApiClientError with UNKNOWN code when response body is not JSON', async () => {
      server.use(
        http.get('/api/bad-response', () => {
          return new HttpResponse('Internal Server Error', {
            status: 500,
            headers: { 'Content-Type': 'text/plain' },
          })
        }),
      )

      await expect(get('/bad-response')).rejects.toThrow(ApiClientError)

      try {
        await get('/bad-response')
      } catch (err) {
        expect(err).toBeInstanceOf(ApiClientError)
        const apiErr = err as ApiClientError
        expect(apiErr.code).toBe('UNKNOWN')
        expect(apiErr.status).toBe(500)
      }
    })

    it('throws ApiClientError on 403 responses', async () => {
      server.use(
        http.post('/api/forbidden', () => {
          return HttpResponse.json(
            { code: 'FORBIDDEN', message: 'Access denied' },
            { status: 403 },
          )
        }),
      )

      await expect(post('/forbidden')).rejects.toThrow(ApiClientError)
    })
  })
})
