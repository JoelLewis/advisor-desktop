import type { ReactNode } from 'react'
import { fmtTimestamp } from '@/kit/measure'
import { Reading } from '@/kit/reading/Reading'
import { SourceChips } from '@/kit/source-chips/SourceChips'
import { StatusCode } from '@/kit/status/StatusCode'
import { Tag } from '@/kit/tag/Tag'
import type { AgentProfile, Message } from '@/types/workspace'
import { findingStatus, formatFigure } from './figure-format'

/** A finding as posted, or as carried into another thread (a `CarriedFinding` fits). */
type AgentFinding = Pick<Extract<Message, { kind: 'agent_finding' }>, 'at' | 'claim' | 'figures' | 'citations' | 'attention'>

type AgentFindingViewProps = { finding: AgentFinding; agent: AgentProfile; anchorId?: string; footer?: ReactNode }

export function AgentFindingView({ finding, agent, anchorId, footer }: AgentFindingViewProps) {
  const status = findingStatus({ ...finding, agentId: agent.id })
  return (
    <article id={anchorId} tabIndex={anchorId ? -1 : undefined} aria-label={`${agent.name}: ${finding.claim}`} className="flex min-w-0 flex-col gap-3 border-l-2 border-ink pl-4">
      <div className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-body font-semibold">{agent.name}</span>
          <span className="text-label uppercase text-ink-3">Agent</span>
          <span className="tabular ml-auto text-label text-ink-3">{fmtTimestamp(finding.at)}</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Tag wrap>{`may ${agent.scope.may.join(' · ')}`}</Tag>
          <Tag wrap>{`may not ${agent.scope.mayNot.join(' · ')}`}</Tag>
        </div>
      </div>
      <p className="flex items-baseline gap-3 text-copy">
        {status === 'none' ? null : <StatusCode status={status} />}
        <span>{finding.claim}</span>
      </p>
      {finding.figures.length > 0 ? (
        <div className="flex flex-wrap gap-x-10 gap-y-3">
          {finding.figures.map((fig, i) => {
            const { value, unit } = formatFigure(fig)
            return <Reading key={`${i}:${fig.label}`} label={fig.label} value={value} unit={unit} />
          })}
        </div>
      ) : null}
      <SourceChips sources={finding.citations.map((c) => ({ label: c.source, asOf: c.asOf }))} />
      {footer}
    </article>
  )
}
