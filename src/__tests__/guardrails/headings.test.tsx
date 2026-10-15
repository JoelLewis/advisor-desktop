import { describe, it, expect } from 'vitest'
import { waitFor } from '@testing-library/react'
import { routes } from '@/app/routes'
import { renderRoutes } from '@/test/render'
import { assertSingleH1, countH1, routePaths } from './headings'

const NOT_FOUND = '/no-such-page'
const LOADING = '[data-kit-ready="false"]'

describe('countH1', () => {
  const html = (markup: string) => { const el = document.createElement('div'); el.innerHTML = markup; return el }
  it.each([
    ['no h1', '<h2>x</h2>', 0],
    ['one h1', '<h1>x</h1><h2>y</h2>', 1],
    ['two h1s', '<h1>x</h1><h1>y</h1>', 2],
    ['an ARIA level-1 heading', '<h1>x</h1><div role="heading" aria-level="1">y</div>', 2],
  ])('counts %s', (_, markup, n) => expect(countH1(html(markup))).toBe(n))
  it('the guard fails on none and on two, and passes on one', () => {
    expect(() => assertSingleH1(html('<h2>x</h2>'))).toThrow('found 0')
    expect(() => assertSingleH1(html('<h1>x</h1><h1>y</h1>'))).toThrow('found 2')
    expect(() => assertSingleH1(html('<h1>x</h1>'))).not.toThrow()
  })
})

describe('routePaths', () => {
  it('walks children, includes index routes and skips splats', () => {
    expect(routePaths([{ path: '/', children: [{ index: true }, { path: 'kit' }, { path: '*' }] }])).toEqual(['/', '/kit'])
  })
  it('finds the app routes', () => expect(routePaths(routes)).toEqual(expect.arrayContaining(['/', '/kit'])))
})

describe('every route renders exactly one h1 once ready', () => {
  it.each([...routePaths(routes), NOT_FOUND])('%s', async (path) => {
    const { container } = renderRoutes(routes, path)
    await waitFor(() => {
      expect(container.querySelector(LOADING)).toBeNull()
      expect(countH1(container)).toBeGreaterThan(0)
    }, { timeout: 4000 })
    assertSingleH1(container)
  })
})
