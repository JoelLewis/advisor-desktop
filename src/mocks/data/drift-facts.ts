import { accounts } from './accounts'
import { computeDriftForAccount, modelDisplayName } from '../handlers/pms'
import { formatRatePercent } from '@/lib/tax-rules'
import { isModelManaged } from '@/lib/mandate'

/**
 * The drift-alert activity (act-012) once said "seven portfolios … beyond the 3% threshold"
 * against per-model bands of 3%, 5% and 7%. Its figures now come from the drift engine: the
 * accounts whose own model band is breached (`needsRebalance`), each band stated with its model's name.
 */
export function driftBatchFacts() {
  const drifts = accounts
    .filter(isModelManaged)
    .map((account) => computeDriftForAccount(account))
    .filter((drift) => drift.needsRebalance)
  const bands = [...new Map(drifts.map((drift) => [drift.modelId, drift.driftTolerance])).entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([modelId, band]) => `${modelDisplayName(modelId)} ±${formatRatePercent(band)}`)
  return { accountCount: drifts.length, bands }
}
