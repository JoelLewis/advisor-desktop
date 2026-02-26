import type { ApiError } from '@/types/common'

const BASE_URL = '/api'

export class ApiClientError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
  ) {
    super(message)
    this.name = 'ApiClientError'
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({
      code: 'UNKNOWN',
      message: response.statusText,
    }))
    throw new ApiClientError(error.code, error.message, response.status)
  }
  return response.json() as Promise<T>
}

export function get<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`, window.location.origin)
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value)
    }
  }
  return fetch(url.toString()).then(handleResponse<T>)
}

export function post<T>(path: string, body?: unknown): Promise<T> {
  return fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  }).then(handleResponse<T>)
}

export function put<T>(path: string, body: unknown): Promise<T> {
  return fetch(`${BASE_URL}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then(handleResponse<T>)
}

export function del<T>(path: string): Promise<T> {
  return fetch(`${BASE_URL}${path}`, { method: 'DELETE' }).then(handleResponse<T>)
}
