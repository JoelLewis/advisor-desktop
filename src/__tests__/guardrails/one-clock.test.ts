import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { listSourceFiles, uiRoots } from './detectors'

const files = uiRoots().flatMap(listSourceFiles)
const read = (f: string) => readFileSync(join(process.cwd(), f), 'utf8')

/** One clock: people read Eastern Time; UTC lives only in the record slip, next to the fingerprint. */
describe('one clock', () => {
  it.each(files.filter((f) => f !== 'src/kit/measure.ts' && f !== 'src/kit/record-slip/RecordSlip.tsx'))('%s never formats a UTC stamp', (f) => {
    expect(read(f)).not.toMatch(/\bfmtUtcStamp\b|\bfmtTimestamp\b/)
  })
  it('the record slip is the one place UTC is shown', () => {
    expect(read('src/kit/record-slip/RecordSlip.tsx')).toMatch(/\bfmtUtcStamp\b/)
  })
})
