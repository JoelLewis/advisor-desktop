import { describe, it, expect } from 'vitest'
import type { BriefTopic } from '@/mocks/agents/brief-topic'
import { briefMessages } from '../brief'
import { briefGroupOf, briefLine } from '../brief-groups'
import { approvedStoryV3, release } from './story-fixture'
import { remeasureBrief } from '../brief-remeasure'
import { store } from '@/mocks/data/workspace-store'

const summaryOf = (messages = briefMessages()) => {
  const s = messages.find((m) => m.kind === 'brief_summary')
  if (s?.kind !== 'brief_summary') throw new Error('The Brief has a summary')
  return s
}
const lines = (items: ReturnType<typeof summaryOf>['decide']) => items.map((i) => ({ title: i.title, lines: i.readings.map((r) => r.line) }))

describe('the Brief groups its findings', () => {
  it.each<[BriefTopic, 'decide' | 'context']>([
    [{ kind: 'out_of_band', assetClass: 'US Equity' }, 'decide'],
    [{ kind: 'harvest_allowed', symbol: 'INTC', name: 'Intel Corp.', remaining: true }, 'decide'],
    [{ kind: 'in_band' }, 'context'],
    [{ kind: 'off_model' }, 'context'],
    [{ kind: 'illiquid', assetClass: 'Private Equity' }, 'context'],
    [{ kind: 'replacement_hold', held: 'VanEck Semiconductor ETF', sold: 'Intel Corp.' }, 'context'],
    [{ kind: 'realized_loss', symbol: 'INTC', name: 'Intel Corp.', when: 'recently' }, 'context'],
    [{ kind: 'held_away' }, 'context'],
    [{ kind: 'model_above_tolerance', accountId: 'acc-002', model: 'Growth', clientName: 'Robert Johnson', tolerance: 'Moderate', household: 'within' }, 'decide'],
    [{ kind: 'not_measured' }, 'context'],
  ])('%o is %s', (topic, group) => expect(briefGroupOf(topic)).toBe(group))

  it.each<[BriefTopic, boolean, string]>([
    [{ kind: 'harvest_allowed', symbol: 'AGG', name: 'iShares Core US Aggregate Bond ETF', remaining: false }, true, 'The position can be sold at a loss today'],
    [{ kind: 'harvest_allowed', symbol: 'INTC', name: 'Intel Corp.', remaining: true }, false, 'The remaining Intel Corp. shares can be sold at a loss today'],
    [{ kind: 'realized_loss', symbol: 'INTC', name: 'Intel Corp.', when: 'today' }, false, 'Intel Corp. was sold at a loss today'],
    [{ kind: 'not_measured' }, false, 'No position in this account can be sold at a loss today'],
  ])('%o, grouped %s, reads %j', (topic, grouped, line) =>
    expect(briefLine({ topic, claim: 'No position in this account can be sold at a loss today.' }, grouped)).toBe(line))

  it('in the morning: four decisions, Intel as one item with two readings, four lines of context', () => {
    const { decide, context } = summaryOf()
    expect(lines(decide)).toEqual([
      { title: undefined, lines: ['US Equity is outside its tolerance band'] },
      { title: undefined, lines: ["Growth sits above Robert Johnson's Moderate tolerance for this account; the household as a whole is within it"] },
      { title: 'Intel Corp.', lines: ['The remaining shares can be sold at a loss today', 'Sold at a loss recently; a buyback would wash the loss'] },
      { title: undefined, lines: ['iShares Core US Aggregate Bond ETF can be sold at a loss today'] },
    ])
    expect(lines(context)).toEqual([
      { title: undefined, lines: ['Some holdings sit outside the model'] },
      { title: undefined, lines: ['Private Equity cannot be sold at market'] },
      { title: undefined, lines: ['VanEck Semiconductor ETF holds the place of the Intel Corp. shares sold at a loss'] },
      { title: undefined, lines: ['Held-away accounts are outside the wash-sale checks'] },
    ])
  })

  it("the morning's Needs a decision: the drift, then Growth above Robert's tolerance with the household within it, then Intel", () => {
    const { decide } = summaryOf()
    expect(decide.map((i) => i.title ?? i.readings[0]!.line).slice(0, 3)).toEqual([
      'US Equity is outside its tolerance band', "Growth sits above Robert Johnson's Moderate tolerance for this account; the household as a whole is within it", 'Intel Corp.',
    ])
    expect(decide[1]).toMatchObject({ agentId: 'drift-monitor', attention: 'attention', awaitsApprovalOf: 'acc-002' })
    expect(decide.filter((i) => i.awaitsApprovalOf !== undefined)).toHaveLength(1)
  })

  it('carries each decision its key figure, and no line a digit', () => {
    const { decide, context } = summaryOf()
    expect(decide.flatMap((i) => i.readings.map((r) => r.figure?.label))).toEqual([
      'Largest drift · US Equity', 'Growth risk score', 'Loss allowed now · INTC', 'Loss realized · INTC', 'Loss allowed now · AGG',
    ])
    for (const r of [...decide, ...context].flatMap((i) => i.readings)) expect(r.line).not.toMatch(/\d/)
    expect(context.flatMap((i) => i.readings).every((r) => r.figure === undefined)).toBe(true)
  })

  it('names every finding once, and the cards are the ones the readings point to', () => {
    const messages = briefMessages()
    const { decide, context } = summaryOf(messages)
    const read = [...decide, ...context].flatMap((i) => i.readings.map((r) => r.findingId))
    const cards = messages.filter((m) => m.kind === 'agent_finding').map((m) => m.id)
    expect([...read].sort()).toEqual([...cards].sort())
  })

  it('serves no topic: the tag never leaves the engine', () => {
    for (const m of briefMessages()) expect(m).not.toHaveProperty('topic')
  })

  it('after the story fills: no decision about Intel; Intel moves to Context with its two realized losses', () => {
    release(approvedStoryV3())
    remeasureBrief()
    const { decide, context } = summaryOf(store().messages.filter((m) => m.threadId === 'th-brief'))
    expect(decide.some((i) => i.title === 'Intel Corp.')).toBe(false)
    expect(lines(decide)[0]).toEqual({ title: undefined, lines: ['US Equity is outside its tolerance band'] })
    expect(lines(context).find((i) => i.title === 'Intel Corp.')).toEqual({
      title: 'Intel Corp.', lines: ['Sold at a loss today; a buyback would wash the loss', 'Sold at a loss recently; a buyback would wash the loss'],
    })
  })
})
