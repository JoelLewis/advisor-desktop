import { HttpResponse } from 'msw'

export function notFound(): HttpResponse<null> {
  return new HttpResponse(null, { status: 404 })
}

export function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}
