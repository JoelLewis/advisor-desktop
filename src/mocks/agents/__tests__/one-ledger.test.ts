import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { listSourceFiles } from '@/__tests__/guardrails/detectors'

const read = (f: string) => readFileSync(join(process.cwd(), f), 'utf8')

/** Agent files that read none of the firm's book themselves, each with the reason. Every other agent file must import the ledger. */
const NO_BOOK = new Map<string, string>([
  ['agent.ts', 'types for an agent run'], ['brief-topic.ts', 'types for the Brief topics'], ['claim-name.ts', 'wording only'],
  ['registry.ts', 'dispatch to the agents'], ['proposal-agent.ts', 'drafts through proposal-engine.ts, which is a guarded reader'],
  ['meeting-notes.ts', 'drafts from the transcript; the rebalance and risk facts reach it from meeting-agents.ts, a guarded reader'],
  ['meeting-recap.ts', 'words the filed notes'], ['prospect-profile.ts', "reads a prospect's questionnaire, not the book"],
  ['prospect-proposal-agent.ts', "works from a prospect's statements, not the book"], ['transfer-in.ts', "reads a prospect's statements, not the book"],
])
const AGENT_FILES = listSourceFiles('src/mocks/agents')
const AGENT_READERS = AGENT_FILES.filter((f) => !NO_BOOK.has(f.split('/').pop() ?? ''))
/**
 * The workspace modules that build agent output from the book. They are exempt from the fixture-read check below
 * only because proposal-engine.ts reads the fixtures it needs for asset-class and exclusion checks, which the ledger does not hold.
 */
const WORKSPACE_READERS = ['src/mocks/workspace/proposal-engine.ts', 'src/mocks/workspace/meeting-agents.ts', 'src/mocks/workspace/brief-today.ts']
const READERS = [...AGENT_READERS, ...WORKSPACE_READERS]
/** The ledger's raw parts: reading one directly would be a second account of the same book. */
const RAW = /\b(?:ledgerFills|recordedSales|bookOf)\b|\{[^}]*\borders\b[^}]*\}\s*from\s*'@\/mocks\/handlers\/oms'|(?<!\.)\.staged\b/
const LEDGER_IMPORT = /from '(?:@\/mocks\/workspace|\.)\/household-ledger'/

describe('one household ledger', () => {
  it.each(READERS)('%s reads it, and never its raw parts', (f) => {
    expect(read(f)).toMatch(LEDGER_IMPORT)
    expect(read(f)).not.toMatch(RAW)
  })
  it('names only agent files that exist', () => {
    for (const name of NO_BOOK.keys()) expect(AGENT_FILES.map((f) => f.split('/').pop()), name).toContain(name)
  })
  it.each(AGENT_FILES)('%s reads holdings through the ledger, not the position fixtures', (f) => {
    expect(read(f)).not.toMatch(/\bgetPositionsForAccount\b/)
    expect(read(f)).not.toMatch(RAW)
  })
})
