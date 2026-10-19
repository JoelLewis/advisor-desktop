import { fmtEasternStamp, fmtTolerance } from '@/kit/measure'
import type { DriftStatus } from '@/types/portfolio'

/** The band and as-of that qualify a drift reading. */
export const driftMeta = ({ driftTolerance, lastCalculated }: DriftStatus) =>
  `band ${fmtTolerance(driftTolerance)} pp · as of ${fmtEasternStamp(lastCalculated)}`
