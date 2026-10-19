import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { listSourceFiles } from '@/__tests__/guardrails/detectors'

const read = (f: string) => readFileSync(join(process.cwd(), f), 'utf8')

/** The readers the spec names: each builds what it says about trades, fills and holdings from the household ledger. */
const READERS = [
  'src/mocks/agents/meeting-prep.ts', 'src/mocks/agents/harvest-scanner.ts', 'src/mocks/agents/drift-monitor.ts',
  'src/mocks/agents/pretrade-check.ts', 'src/mocks/agents/client-letter.ts', 'src/mocks/workspace/proposal-engine.ts',
  'src/mocks/workspace/meeting-agents.ts', 'src/mocks/workspace/brief-today.ts',
] as const
/** The ledger's raw parts: reading one directly would be a second account of the same book. */
const RAW = /\b(?:ledgerFills|recordedSales|bookOf)\b|\{[^}]*\borders\b[^}]*\}\s*from\s*'@\/mocks\/handlers\/oms'|store\(\)\.staged/
const LEDGER_IMPORT = /from '(?:@\/mocks\/workspace|\.)\/household-ledger'/

describe('one household ledger', () => {
  it.each(READERS)('%s reads it, and never its raw parts', (f) => {
    expect(read(f)).toMatch(LEDGER_IMPORT)
    expect(read(f)).not.toMatch(RAW)
  })
  it.each(listSourceFiles('src/mocks/agents'))('%s reads holdings through the ledger, not the position fixtures', (f) => {
    expect(read(f)).not.toMatch(/\bgetPositionsForAccount\b/)
    expect(read(f)).not.toMatch(RAW)
  })
})
