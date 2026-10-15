import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { personById } from '@/mocks/data/people'

/** Every non-test source file under `dir`. */
function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return name === '__tests__' ? [] : sourceFiles(path)
    return /\.tsx?$/.test(name) ? [path] : []
  })
}

describe('§0.3 · demo people are invented, never real', () => {
  it('no demo data names the author', () => {
    for (const file of sourceFiles(resolve(process.cwd(), 'src/mocks'))) {
      expect(readFileSync(file, 'utf8'), file).not.toMatch(/joel/i)
    }
  })

  it("the advisor is the directory's user-001, Adrian Hale", () => {
    expect(personById('user-001')!.name).toBe('Adrian Hale')
  })
})
