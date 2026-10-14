import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { listSourceFiles } from './detectors'

const ROOTS = ['src/workspace', 'src/app', 'src/kit', 'src/hooks', 'src/services']
const files = ROOTS.flatMap(listSourceFiles)
/** A value import (not `import type`) whose source is the mock engine; the clause holds no quote, so it cannot run on into the next import. */
const VALUE_IMPORT_FROM_MOCKS = /^import\s+(?!type\b)[^'"]*?from\s+['"](?:@\/mocks\/|(?:\.\.\/)+mocks\/)/m

describe('production UI reads the engine only through the API', () => {
  it('scans the UI, hooks and services', () => expect(files.length).toBeGreaterThan(50))
  it.each(files)('%s imports no value from src/mocks', (f) => {
    expect(readFileSync(join(process.cwd(), f), 'utf8')).not.toMatch(VALUE_IMPORT_FROM_MOCKS)
  })
})
