import type { AgentId, Attention, BriefGroup, BriefItem } from '@/types/workspace'
import type { BriefTopic, TopicFinding } from '@/mocks/agents/brief-topic'

export type MeasuredFinding = TopicFinding & { id: string; agentId: AgentId }

/** The one rule: a finding needs a decision when acting on it would change a trade. */
export function briefGroupOf(topic: BriefTopic): BriefGroup {
  return topic.kind === 'out_of_band' || topic.kind === 'harvest_allowed' ? 'decide' : 'context'
}

/** The topics whose line carries its finding's first figure: the drift, the loss allowed now, the loss realized. */
const KEY_FIGURE: ReadonlySet<BriefTopic['kind']> = new Set(['out_of_band', 'harvest_allowed', 'realized_loss'])

/** The security a finding is about, where two findings can be about the same one. */
function securityOf(topic: BriefTopic): { symbol: string; name: string } | undefined {
  return topic.kind === 'harvest_allowed' || topic.kind === 'realized_loss' ? { symbol: topic.symbol, name: topic.name } : undefined
}

/** A finding's one line, in words with no digits. Grouped under its security's name, the line drops the name. */
export function briefLine({ topic, claim }: Pick<MeasuredFinding, 'topic' | 'claim'>, grouped: boolean): string {
  switch (topic.kind) {
    case 'out_of_band': return `${topic.assetClass} is outside its tolerance band`
    case 'in_band': return 'Every asset class is inside its tolerance band'
    case 'off_model': return 'Some holdings sit outside the model'
    case 'illiquid': return `${topic.assetClass} cannot be sold at market`
    case 'replacement_hold': return `${topic.held} holds the place of the ${topic.sold} shares sold at a loss`
    case 'harvest_allowed':
      if (grouped) return `${topic.remaining ? 'The remaining shares' : 'The position'} can be sold at a loss today`
      return `${topic.remaining ? `The remaining ${topic.name} shares` : topic.name} can be sold at a loss today`
    case 'realized_loss':
      return grouped ? `Sold at a loss ${topic.when}; a buyback would wash the loss` : `${topic.name} was sold at a loss ${topic.when}`
    case 'held_away': return 'Held-away accounts are outside the wash-sale checks'
    case 'not_measured': return claim.replace(/\.$/, '')
  }
}

const attentionFirst = (a: Attention, b: Attention) => Number(b === 'attention') - Number(a === 'attention')

/** A security's realized losses read newest sale first: today's before an earlier one. Other readings keep their rank. */
const earlierSale = ({ topic }: MeasuredFinding) => Number(topic.kind === 'realized_loss' && topic.when === 'recently')

/**
 * The Brief's summary: findings ranked (attention first, then the Brief's agent order), findings about one
 * security as one item under its name, each item in Needs a decision while any reading needs one.
 */
export function briefItems(findings: readonly MeasuredFinding[], agentOrder: readonly AgentId[]): { decide: BriefItem[]; context: BriefItem[] } {
  const order = (id: AgentId) => agentOrder.indexOf(id)
  const ranked = [...findings].sort((a, b) => attentionFirst(a.attention, b.attention) || order(a.agentId) - order(b.agentId))
  const placed = new Set<string>()
  const decide: BriefItem[] = []
  const context: BriefItem[] = []
  for (const finding of ranked) {
    if (placed.has(finding.id)) continue
    const security = securityOf(finding.topic)
    const members = security
      ? ranked.filter((f) => securityOf(f.topic)?.symbol === security.symbol).sort((a, b) => earlierSale(a) - earlierSale(b))
      : [finding]
    members.forEach((m) => placed.add(m.id))
    const grouped = members.length > 1
    const item: BriefItem = {
      key: grouped && security ? `security:${security.symbol}` : finding.id,
      agentId: finding.agentId,
      attention: finding.attention,
      ...(grouped && security ? { title: security.name } : {}),
      readings: members.map((m) => {
        const figure = m.figures[0]
        if (KEY_FIGURE.has(m.topic.kind) && !figure) throw new Error(`A ${m.topic.kind} finding (${m.id}) carries no key figure`)
        return { findingId: m.id, line: briefLine(m, grouped), ...(KEY_FIGURE.has(m.topic.kind) && figure ? { figure } : {}) }
      }),
    }
    ;(members.some((m) => briefGroupOf(m.topic) === 'decide') ? decide : context).push(item)
  }
  return { decide, context }
}
