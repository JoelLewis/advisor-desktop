import { UNIT, fmtDays, fmtDrift, fmtMoney, fmtQuantity, fmtTolerance, fmtWeight } from '@/kit/measure'
import type { Status } from '@/kit/status/status'
import type { Attention, Figure, FigureUnit } from '@/types/workspace'

export type FormattedFigure = { value: string; unit: string }

const BY_UNIT: Readonly<Record<FigureUnit, { format: (v: number) => string; unit: string }>> = {
  pp: { format: fmtDrift, unit: UNIT.pp },
  '%': { format: fmtWeight, unit: UNIT.pct },
  USD: { format: fmtMoney, unit: UNIT.usd },
  sh: { format: fmtQuantity, unit: UNIT.shares },
  d: { format: fmtDays, unit: UNIT.days },
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

/** A pre-trade verdict when the claim states one; otherwise OUT for a finding that needs attention, and no code for information. */
export function findingStatus({ claim, attention }: { claim: string; attention: Attention }): FindingStatus {
  if (claim.startsWith('Blocked')) return 'BLOCK'
  if (claim.startsWith('Warning')) return 'WARN'
  return attention === 'attention' ? 'OUT' : 'none'
}
