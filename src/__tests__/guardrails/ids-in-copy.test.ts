import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it, expect } from 'vitest'
import { userFacingStrings } from './retired-words'
import { listSourceFiles } from './detectors'
import { accounts } from '@/mocks/data/accounts'
import { orders } from '@/mocks/handlers/oms'
import { evaluateProposal } from '@/mocks/handlers/compliance'
import { workingMovesOf } from '@/mocks/workspace/household-ledger'
import { runPretradeCheck } from '@/mocks/agents/pretrade-check'
import { startConversation } from '@/mocks/workspace/conversations'
import { recordCoffee } from '@/mocks/workspace/prospect-steps'

/** An internal record id in parentheses, as a person would read it: "(ord-005)", "(doc-002)", "(cli-003)". */
const ID_IN_COPY = /\((?:[a-z]{2,5})-\d{3,4}\)/

const SOURCE_FILES = listSourceFiles('src').filter((f) => !f.startsWith('src/test/') && !f.startsWith('src/__tests__/') && !f.includes('/__tests__/'))

describe('no internal id reaches what people read', () => {
  it('in any string the source writes', () => {
    const hits = SOURCE_FILES.flatMap((f) => userFacingStrings(readFileSync(join(process.cwd(), f), 'utf8'), f)
      .filter((s) => ID_IN_COPY.test(s.text)).map((s) => `${f}:${s.line}: ${s.text}`))
    expect(hits).toEqual([])
  })

  it("in a working order's pre-trade note: the order is named in words, with its account", () => {
    const working = [...new Set(orders.filter((o) => o.status === 'pending' || o.status === 'submitted').map((o) => o.accountId))]
    const notes = working.flatMap((accountId) => {
      const moves = workingMovesOf(accountId)
      return evaluateProposal(accountId, moves.map((w) => ({ symbol: w.symbol, side: w.side === 'buy' ? 'sell' : 'buy', quantity: 1, estimatedValue: 100 })), moves)?.violations ?? []
    }).filter((v) => v.category === 'working_order')
    expect(notes.length).toBeGreaterThan(0)
    for (const v of notes) expect(v.message).not.toMatch(ID_IN_COPY)
    const option = notes.find((v) => v.workingOrder?.quantityUnit === 'contracts')
    expect(option?.message).toMatch(/^A working order to \w+ [\d,]+ contracts \S+/)
    expect(notes.find((v) => v.symbol === 'QQQ')?.message).toBe('A working order to buy 200 QQQ, limit 480.00 is already open in Robert Johnson · Individual (…3847); this proposal also trades QQQ.')
  })

  it("in what the agents say about every model-managed account", () => {
    const claims = accounts.flatMap((a) => runPretradeCheck({ asOf: '2026-02-25T12:00:00Z', subject: { type: 'account', id: a.id } }).map((f) => f.claim))
    expect(claims.filter((c) => ID_IN_COPY.test(c))).toEqual([])
  })

  it('in a refusal', () => {
    const refused = startConversation('user-001', { householdId: 'hh-001', title: 'Next steps', audience: { kind: 'client', clientId: 'cli-003' } })
    expect(refused).toMatchObject({ ok: false, message: 'That client is not a member of the Johnson Household.' })
    recordCoffee('user-001', 'prsp-011', 'Coffee after the introduction.')
    expect(recordCoffee('user-001', 'prsp-011', 'Again.')).toMatchObject({ ok: false, message: 'The coffee was already recorded.' })
  })
})
