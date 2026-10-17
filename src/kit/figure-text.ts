import { UNIT, fmtDays, fmtDrift, fmtMoney, fmtPoints, fmtQuantity, fmtTolerance, fmtWeight, fmtYear } from '@/kit/measure'
import type { Figure, FigureUnit } from '@/types/workspace'

export type FormattedFigure = { value: string; unit: string }

const BY_UNIT: Readonly<Record<FigureUnit, { format: (v: number) => string; unit: string }>> = {
  pp: { format: fmtDrift, unit: UNIT.pp },
  '%': { format: fmtWeight, unit: UNIT.pct },
  USD: { format: fmtMoney, unit: UNIT.usd },
  sh: { format: fmtQuantity, unit: UNIT.shares },
  contracts: { format: fmtQuantity, unit: UNIT.contracts },
  par: { format: fmtMoney, unit: `${UNIT.usd} ${UNIT.par}` },
  d: { format: fmtDays, unit: UNIT.days },
  pts: { format: fmtPoints, unit: UNIT.points },
  count: { format: fmtQuantity, unit: '' },
  year: { format: fmtYear, unit: '' },
}

/** Engine fields whose pp value is a tolerance band, read as ± rather than as a signed drift. */
const TOLERANCE_SOURCES: ReadonlySet<string> = new Set(['drift.driftTolerance'])

/** An agent figure as display text. pp and % values arrive as fractions (0.132). */
export function formatFigure(fig: Figure): FormattedFigure {
  if (fig.unit === 'pp' && TOLERANCE_SOURCES.has(fig.source)) return { value: fmtTolerance(fig.value), unit: UNIT.pp }
  const { format, unit } = BY_UNIT[fig.unit]
  return { value: format(fig.value), unit }
}

/** A figure as it reads inside a sentence: its value and unit, formatted by the kit. The only digits a claim may carry. */
export function figureText(fig: Figure): string {
  const { value, unit } = formatFigure(fig)
  return unit ? `${value} ${unit}` : value
}
