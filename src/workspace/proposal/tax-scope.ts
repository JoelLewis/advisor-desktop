import { fmtResult } from '@/kit/measure'
import { CAPITAL_LOSS_SCOPE_NOTE } from '@/lib/capital-gains'
import type { RebalancePreview } from '@/services/oms'

/** What the preview's estimate nets against, read from the preview rather than assumed. */
export function taxScope({ ytdRealisedOnReturn: ytd, nettedWithAccountIds }: RebalancePreview): string {
  if (!ytd) return 'A tax-advantaged account: its sales realise nothing taxable.'
  const results = [`short-term ${fmtResult(ytd.shortTerm)}`, `long-term ${fmtResult(ytd.longTerm)}`]
  if (ytd.collectibleLongTerm !== 0) results.push(`collectibles ${fmtResult(ytd.collectibleLongTerm)}`)
  const batch = nettedWithAccountIds.length > 0 ? ', and with earlier accounts in this batch on the same return' : ''
  return `Nets this proposal's legs with the return's year-to-date realised results (${results.join(', ')} USD)${batch}. ${CAPITAL_LOSS_SCOPE_NOTE}`
}
