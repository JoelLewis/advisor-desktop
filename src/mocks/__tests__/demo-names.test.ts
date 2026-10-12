import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { teamMembers } from '@/mocks/data/messages'
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

  it("the advisor in the team's threads is the directory's user-001, Adrian Hale", () => {
    const advisor = teamMembers.find((p) => p.id === 'user-001')!
    expect(advisor.name).toBe('Adrian Hale')
    expect(advisor.name).toBe(personById('user-001')!.name)
  })
})
