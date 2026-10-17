import { useId } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { DataTable } from '@/kit/data-table/DataTable'
import { Num } from '@/kit/data-table/Num'
import { StatusCode } from '@/kit/status/StatusCode'
import type { Status } from '@/kit/status/status'
import { fmtMoney, fmtQuantity } from '@/kit/measure'
import { useAccount } from '@/hooks/use-accounts'
import { accountFullViewHref } from '@/workspace/full-views/full-view-href'
import { preTradeCheckProposal, previewRebalance, type ProposalLegResult, type ProposedTrade } from '@/services/oms'
import { useViewer } from '@/workspace/viewer/use-viewer'
import { accountIdOf, type EmbedProps } from './embed-props'
import { LINK_TARGET } from '@/kit/link-target'

const SEVERITY_STATUS: Readonly<Record<ProposalLegResult['severity'], Status>> = { block: 'BLOCK', warning: 'WARN', pass: 'CLEAR' }
const SIDE: Readonly<Record<ProposedTrade['side'], string>> = { buy: 'Buy', sell: 'Sell' }

type Leg = ProposedTrade & { index: number; status: Status }

async function loadCheckedPreview(viewer: string, accountId: string) {
  const previews = await previewRebalance(viewer, { accountIds: [accountId], taxAware: true })
  const preview = previews.find((p) => p.accountId === accountId)
  if (!preview) throw new Error(`No rebalance preview is available for ${accountId}`)
  const check = await preTradeCheckProposal(viewer, {
    accountId,
    trades: preview.trades.map(({ symbol, side, quantity, estimatedValue }) => ({ symbol, side, quantity, estimatedValue })),
  })
  const legs: Leg[] = preview.trades.map((trade, index) => {
    const result = check.legs.find((l) => l.index === index)
    if (!result || result.symbol !== trade.symbol) throw new Error(`The pre-trade check has no result for leg ${index + 1} (${trade.symbol})`)
    return { ...trade, index, status: SEVERITY_STATUS[result.severity] }
  })
  return { preview, legs }
}

export function RebalanceEmbed({ subject, threadId }: EmbedProps) {
  const accountId = accountIdOf(subject, 'rebalance preview')
  const titleId = useId()
  const account = useAccount(accountId)
  const { viewerId } = useViewer()
  // Under ['workspace'] so workspace writes refresh it too; keyed on the viewer, whom the engine checks.
  const checked = useQuery({ queryKey: ['workspace', 'rebalance-embed', viewerId, accountId], queryFn: () => loadCheckedPreview(viewerId, accountId) })
  if (checked.isPending || account.isPending) return <p role="status" className="text-body text-ink-3">Loading the rebalance preview…</p>
  if (checked.isError) return <p role="alert" className="text-body">{checked.error.message}</p>
  if (account.isError) return <p role="alert" className="text-body">{account.error.message}</p>
  const { preview, legs } = checked.data
  const gross = legs.reduce((s, l) => s + l.estimatedValue, 0)
  return (
    <section aria-labelledby={titleId} className="flex min-w-0 flex-col gap-3 border border-rule-2 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-rule pb-2">
        <h2 id={titleId} className="text-label uppercase text-ink-2">{`Rebalance preview · ${account.data.name}`}</h2>
        <span className="text-label text-ink-3">{preview.taxable ? 'tax-aware · not yet approved' : 'tax-advantaged · not yet approved'}</span>
      </div>
      <DataTable caption={`Rebalance legs · ${account.data.name}`} rows={legs} getRowId={(l) => `${l.index}:${l.symbol}`}
        noun={{ singular: 'leg', plural: 'legs' }}
        columns={[
          { id: 'symbol', header: 'Symbol', cell: (l) => l.symbol },
          { id: 'side', header: 'Side', cell: (l) => SIDE[l.side] },
          { id: 'qty', header: 'Qty', unit: 'sh', align: 'right', cell: (l) => <Num text={fmtQuantity(l.quantity)} /> },
          { id: 'value', header: 'Value', unit: preview.currency, align: 'right', cell: (l) => fmtMoney(l.estimatedValue) },
          { id: 'check', header: 'Pre-trade', cell: (l) => <StatusCode status={l.status} /> },
        ]}
        totals={{ label: 'Gross traded', cells: { value: fmtMoney(gross) } }} />
      <Link to={accountFullViewHref(accountId, threadId)} className={`${LINK_TARGET} self-start text-body underline decoration-rule-2 underline-offset-4 hover:decoration-ink`}>Open account</Link>
    </section>
  )
}
