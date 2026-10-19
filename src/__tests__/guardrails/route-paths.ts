import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { matchRoutes } from 'react-router-dom'
import { routes } from '@/app/routes'
import { listSourceFiles } from './detectors'

/** Where in-app paths are written: the UI, and the engine and data a screen shows. Services hold API paths only (Task 2's guard). */
const LINK_ROOTS: readonly string[] = ['src/app', 'src/workspace', 'src/kit', 'src/hooks', 'src/lib', 'src/mocks']
/** A quoted or template literal that begins with "/" and a lowercase letter, or is "/" itself. */
const QUOTED_PATH = /(['"`])(\/(?:[a-z][^'"`\s]*)?)\1/g
/** What an interpolated segment becomes: any value matches a `:param`. */
const STANDIN = 'x'
const MARK = '\u0001'

/** Each balanced `${...}`, nested templates included, becomes one mark, so quotes inside an interpolation cannot end a literal. */
function collapseInterpolations(source: string): string {
  let out = ''
  for (let i = 0; i < source.length; i++) {
    if (source[i] !== '$' || source[i + 1] !== '{') { out += source[i]; continue }
    let depth = 0
    i++
    do {
      if (source[i] === '{') depth++
      else if (source[i] === '}') depth--
      i++
    } while (depth > 0 && i < source.length)
    i--
    out += MARK
  }
  return out
}

const isApiPath = (path: string) => path === '/api' || path.startsWith('/api/')

export type FoundPath = { file: string; path: string; interpolated: boolean }

/**
 * Every path literal in `source`: interpolations replaced by a stand-in, query and hash dropped, API paths left out.
 * Limits: string concatenation (`'/x/' + id`) and `navigate(variable)` are not read, and a path written inside an
 * interpolation (`${a ? '/x' : '/y'}`) is collapsed with it and not read either; hrefs go through the href helpers.
 */
export function pathLiterals(source: string): { path: string; interpolated: boolean }[] {
  return [...collapseInterpolations(source).matchAll(QUOTED_PATH)].flatMap((m) => {
    const raw = m[2] ?? ''
    const path = raw.replace(new RegExp(`${MARK}+`, 'g'), STANDIN).replace(/[?#].*$/, '')
    return isApiPath(path) ? [] : [{ path, interpolated: raw.includes(MARK) }]
  })
}

export function inAppPaths(): FoundPath[] {
  return LINK_ROOTS.flatMap(listSourceFiles).flatMap((file) =>
    pathLiterals(readFileSync(join(process.cwd(), file), 'utf8')).map((p) => ({ file, ...p })))
}

/** The route pattern `path` takes in the router, or undefined when only the catch-all would take it. */
export function routePatternOf(path: string): string | undefined {
  const matches = matchRoutes(routes, path)
  const leaf = matches?.[matches.length - 1]
  if (!matches || !leaf || leaf.route.path === '*') return undefined
  const segments = matches.flatMap((m) => (m.route.path && m.route.path !== '/' ? [m.route.path] : []))
  return `/${segments.join('/')}`
}
