import { StatusCode } from '@/kit/status/StatusCode'
import type { PreTradeCheckProposalResult } from '@/services/oms'

/** The proposal-level pre-trade check, in the engine's own words. */
export function PretradeNotes({ pretrade }: { pretrade: PreTradeCheckProposalResult }) {
  if (pretrade.violations.length === 0) return <p className="text-body text-ink-2">No pre-trade check flagged this version.</p>
  return (
    <ul aria-label="Pre-trade check" className="flex flex-col gap-1.5">
      {pretrade.violations.map((v) => (
        <li key={`${v.category}:${v.constraint}:${v.legs.join('-')}`} className="flex items-baseline gap-3 text-body">
          <StatusCode status={v.severity === 'block' ? 'BLOCK' : 'WARN'} />
          <span>{v.message}</span>
        </li>
      ))}
    </ul>
  )
}
