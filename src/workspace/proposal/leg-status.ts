import type { Status } from '@/kit/status/status'
import type { PreTradeCheckProposalResult, ProposalLegResult } from '@/services/oms'

const SEVERITY_STATUS: Readonly<Record<ProposalLegResult['severity'], Status>> = { block: 'BLOCK', warning: 'WARN', pass: 'CLEAR' }
export const SIDE_WORDS: Readonly<Record<'buy' | 'sell', string>> = { buy: 'Buy', sell: 'Sell' }

/** The pre-trade verdict on one leg, as the engine attributed it. A leg the check did not read is an error, never a pass. */
export function legStatus(pretrade: PreTradeCheckProposalResult, index: number, symbol: string): Status {
  const result = pretrade.legs.find((l) => l.index === index)
  if (!result || result.symbol !== symbol) throw new Error(`The pre-trade check has no result for the ${symbol} leg`)
  return SEVERITY_STATUS[result.severity]
}
