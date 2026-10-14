import { UNIT, fmtDays, fmtDrift, fmtMoney, fmtPoints, fmtQuantity, fmtTolerance, fmtWeight } from '@/kit/measure'
import type { Status } from '@/kit/status/status'
import type { AgentId, Attention, Figure, FigureUnit } from '@/types/workspace'

export type FormattedFigure = { value: string; unit: string }

const BY_UNIT: Readonly<Record<FigureUnit, { format: (v: number) => string; unit: string }>> = {
  pp: { format: fmtDrift, unit: UNIT.pp },
  '%': { format: fmtWeight, unit: UNIT.pct },
  USD: { format: fmtMoney, unit: UNIT.usd },
  sh: { format: fmtQuantity, unit: UNIT.shares },
  d: { format: fmtDays, unit: UNIT.days },
  pts: { format: fmtPoints, unit: UNIT.points },
  count: { format: fmtQuantity, unit: '' },
}

/** Engine fields whose pp value is a tolerance band, read as ± rather than as a signed drift. */
const TOLERANCE_SOURCES: ReadonlySet<string> = new Set(['drift.driftTolerance'])

/** An agent figure as display text. pp and % values arrive as fractions (0.132). */
export function formatFigure(fig: Figure): FormattedFigure {
  if (fig.unit === 'pp' && TOLERANCE_SOURCES.has(fig.source)) return { value: fmtTolerance(fig.value), unit: UNIT.pp }
  const { format, unit } = BY_UNIT[fig.unit]
  return { value: format(fig.value), unit }
}

/** A finding's status code, or 'none' for an informational finding that carries no code. */
export type FindingStatus = Extract<Status, 'BLOCK' | 'WARN' | 'OUT'> | 'none'

type StatusFacts = { agentId: AgentId; claim: string; attention: Attention }

/**
 * Whether a finding marks a breach. OUT means outside a limit, as on the drift gauges; a harvest
 * opportunity needs a decision but breaches nothing, and a meeting's attention items need discussion,
 * so neither carries a code.
 */
export const marksBreach = ({ agentId, attention }: Pick<StatusFacts, 'agentId' | 'attention'>): boolean =>
  attention === 'attention' && agentId !== 'harvest-scanner' && agentId !== 'meeting-prep'

/** A pre-trade verdict when the claim states one; otherwise OUT for a breach, and no code for an opportunity or information. */
export function findingStatus(finding: StatusFacts): FindingStatus {
  if (finding.claim.startsWith('Blocked')) return 'BLOCK'
  if (finding.claim.startsWith('Warning')) return 'WARN'
  return marksBreach(finding) ? 'OUT' : 'none'
}
