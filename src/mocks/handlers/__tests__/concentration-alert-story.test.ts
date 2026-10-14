import { describe, it, expect } from 'vitest'
import { accounts } from '@/mocks/data/accounts'
import { complianceAlerts } from '@/mocks/handlers/compliance'
import { concentrationFor } from '@/mocks/handlers/pms'

/** The watch level the Johnson Trust's concentration alert states: a single name at or above it carries an alert. */
const WATCH_LEVEL = 0.09

const trust = accounts.find((a) => a.id === 'acc-001')
if (!trust) throw new Error('no acc-001')
const singleNames = concentrationFor(trust).positions.filter((p) => p.kind === 'single_name')
const alerts = complianceAlerts.filter((a) => a.type === 'Concentration' && a.entityId === 'acc-001')
const alertedSymbol = (title: string) => {
  const symbol = /— (\S+) in /.exec(title)?.[1]
  if (!symbol) throw new Error(`a concentration alert names no symbol: ${title}`)
  return symbol
}

describe('the Johnson Trust concentration alert agrees with the book', () => {
  it('every single name at or above the watch level has its alert, and no other does', () => {
    const atOrAbove = singleNames.filter((p) => p.weight >= WATCH_LEVEL).map((p) => p.symbol).sort()
    expect(atOrAbove).toEqual(['MSFT'])
    expect(alerts.map((a) => alertedSymbol(a.title)).sort()).toEqual(atOrAbove)
  })

  it('states the watch level and the position weight the book holds', () => {
    for (const alert of alerts) {
      const position = singleNames.find((p) => p.symbol === alertedSymbol(alert.title))
      if (!position) throw new Error(`${alert.id} names a symbol the trust does not hold`)
      expect(alert.description).toContain(`at ${(position.weight * 100).toFixed(1)}% of account value`)
      expect(alert.description).toContain(`above the ${WATCH_LEVEL * 100}% watch level`)
    }
  })

  it('AAPL, the next largest single name, sits below the watch level', () => {
    const aapl = singleNames.find((p) => p.symbol === 'AAPL')
    expect(aapl?.weight).toBeLessThan(WATCH_LEVEL)
  })
})
