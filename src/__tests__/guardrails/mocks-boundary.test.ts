import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { findMocksImports, listSourceFiles } from './detectors'

/** The production UI and everything it imports that is not the engine itself. */
const ROOTS = ['src/workspace', 'src/app', 'src/kit', 'src/hooks', 'src/services', 'src/lib', 'src/types', 'src/main.tsx']
/** The one load of the engine production makes: `main.tsx` starts the MSW worker, the demo's server. */
const ALLOWED_DYNAMIC: Readonly<Record<string, readonly string[]>> = { 'src/main.tsx': ['@/mocks/browser'] }
const files = ROOTS.flatMap(listSourceFiles)

describe('production UI reads the engine only through the API', () => {
  it('scans the UI, hooks, services, lib, types and the entry', () => {
    expect(files.length).toBeGreaterThan(50)
    expect(files).toContain('src/main.tsx')
  })
  it.each(files)('%s loads no value from src/mocks', (f) => {
    expect(findMocksImports(readFileSync(join(process.cwd(), f), 'utf8'), { allowDynamic: ALLOWED_DYNAMIC[f] ?? [] })).toEqual([])
  })
})
