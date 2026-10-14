import { describe, it, expect } from 'vitest'
import { accountAttributionHref, billingHref, blotterHref, modelHref, referenceRowHref } from '@/workspace/full-views/reference-href'

describe('reference hrefs', () => {
  it('carry the thread they were opened from, and keep date filters apart from it', () => {
    expect(billingHref('hh-001', 'th-johnson-meeting')).toBe('/billing?household=hh-001&from=th-johnson-meeting')
    expect(blotterHref({ accountId: 'acc-002', since: '2026-02-25' }, 'th-johnson-review')).toBe('/blotter?accountId=acc-002&since=2026-02-25&from=th-johnson-review')
    expect(blotterHref()).toBe('/blotter')
    expect(accountAttributionHref('acc-002', undefined, '1y')).toBe('/accounts/acc-002/attribution?period=1y')
  })

  it('send a quoted row back to its view', () => {
    expect(referenceRowHref('attribution', 'acc-002:qtd:us_equity', 'th-x')).toBe('/accounts/acc-002/attribution?period=qtd&from=th-x')
    expect(referenceRowHref('models', 'mod-005:v3', 'th-x')).toBe(modelHref('mod-005', 'th-x'))
    expect(referenceRowHref('risk', 'acc-045', 'th-x')).toBe('/accounts/acc-045/risk?from=th-x')
    expect(referenceRowHref('reconciliation', 'brk-002', 'th-x')).toBe('/reconciliation?from=th-x')
    expect(referenceRowHref('blotter', 'ord-001', 'th-x', { type: 'account', id: 'acc-002' })).toBe('/blotter?accountId=acc-002&from=th-x')
    expect(referenceRowHref('blotter', 'ord-001', 'th-x')).toBe('/blotter?from=th-x')
  })
})
