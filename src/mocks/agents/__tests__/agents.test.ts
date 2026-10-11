import { describe, it, expect } from 'vitest'
import { accounts } from '@/mocks/data/accounts'
import { computeDriftForAccount } from '@/mocks/handlers/pms'
import { AGENT_DEFINITIONS } from '../registry'
import { MOCK_NOW_ISO } from '@/lib/clock'

const drift = AGENT_DEFINITIONS.get('drift-monitor')!
const pretrade = AGENT_DEFINITIONS.get('pretrade-check')!
const ctx = (id: string) => ({ asOf: MOCK_NOW_ISO, subject: { type: 'account' as const, id } })

describe('agents over the whole book', () => {
  it.each(accounts.map((a) => a.id))('%s: claims have no digits; every figure has a source and finite value', (id) => {
    for (const agent of [drift, pretrade]) {
      for (const f of agent.run(ctx(id))) {
        expect(f.claim).not.toMatch(/\d/)
        expect(f.citations.length).toBeGreaterThan(0)
        for (const fig of f.figures) {
          expect(Number.isFinite(fig.value)).toBe(true)
          expect(fig.source.length).toBeGreaterThan(0)
        }
      }
    }
  })
  it('drift monitor figures equal the engine drift', () => {
    const account = accounts.find((a) => a.id === 'acc-002')!
    const engine = computeDriftForAccount(account)
    const findings = drift.run(ctx('acc-002'))
    const max = findings.flatMap((f) => f.figures).find((fig) => fig.label.startsWith('Largest drift'))!
    const worst = engine.assetClassDrifts.reduce((a, b) => (Math.abs(b.drift) > Math.abs(a.drift) ? b : a))
    expect(max.value).toBe(worst.drift)
    expect(findings[0]!.attention).toBe('attention')
  })
  it('drift monitor names private equity as not tradable at market for acc-002', () => {
    const claims = drift.run(ctx('acc-002')).map((f) => f.claim).join(' ')
    expect(claims).toMatch(/Private Equity cannot be traded at market/)
  })
  it('pre-trade check never reports anything as cleared', () => {
    for (const a of accounts) for (const f of pretrade.run(ctx(a.id))) expect(f.claim.toLowerCase()).not.toContain('cleared')
  })
  it('runs are deterministic per as-of', () => {
    expect(drift.run(ctx('acc-002'))).toEqual(drift.run(ctx('acc-002')))
  })
})
