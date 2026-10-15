import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { listSourceFiles } from '@/__tests__/guardrails/detectors'

describe('§0.5 · records made at runtime take the event clock, never the live one', () => {
  it('no mock reads the system clock', () => {
    for (const file of listSourceFiles('src/mocks')) {
      const source = readFileSync(join(process.cwd(), file), 'utf8')
      expect(source, file).not.toMatch(/new Date\(\)/)
      expect(source, file).not.toMatch(/Date\.now\(\)/)
    }
  })
})
