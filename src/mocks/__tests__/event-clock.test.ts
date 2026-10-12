import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { nextEventTime, nextRecordNumber } from '@/mocks/handlers/event-clock'
import { submitTrade } from '@/services/oms'
import { MOCK_NOW_ISO } from '@/lib/clock'

/** Every non-test source file under `dir`. */
function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return name === '__tests__' ? [] : sourceFiles(path)
    return /\.tsx?$/.test(name) ? [path] : []
  })
}

describe('§0.5 · records made at runtime take the event clock, never the live one', () => {
  it('no mock reads the system clock', () => {
    for (const file of sourceFiles(resolve(process.cwd(), 'src/mocks'))) {
      const source = readFileSync(file, 'utf8')
      expect(source, file).not.toMatch(/new Date\(\)/)
      expect(source, file).not.toMatch(/Date\.now\(\)/)
    }
  })

  it('successive records get distinct, increasing times after the frozen now', () => {
    const first = nextEventTime()
    const second = nextEventTime()
    expect(Date.parse(first)).toBeGreaterThan(Date.parse(MOCK_NOW_ISO))
    expect(Date.parse(second) - Date.parse(first)).toBe(60_000)
    expect(nextRecordNumber()).toBeLessThan(nextRecordNumber())
  })

  it('an order submitted now is stamped by the event clock', async () => {
    const order = await submitTrade({ accountId: 'acc-002', symbol: 'SPY', side: 'buy', quantity: 1, orderType: 'market' })
    expect(Date.parse(order.submittedAt)).toBeGreaterThan(Date.parse(MOCK_NOW_ISO))
    expect(order.submittedAt.startsWith('2026-02-25T')).toBe(true)
    expect(order.id).toMatch(/^ord-\d+$/)
  })
})

describe('generated ids never meet a seed id', () => {
  it('a custom prompt created first leaves seed cp-1 in place', async () => {
    const created = await fetch('/api/settings/ai/prompts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'n', text: 't', category: 'general' }),
    }).then((r) => r.json() as Promise<{ id: string }>)
    const all = await fetch('/api/settings/ai/prompts').then((r) => r.json() as Promise<{ id: string }[]>)
    expect(created.id).not.toBe('cp-1')
    expect(all.map((p) => p.id)).toContain('cp-1')
  })
})
