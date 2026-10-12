import { DataTable } from '@/kit/data-table/DataTable'
import { Num } from '@/kit/data-table/Num'
import { StatusCode } from '@/kit/status/StatusCode'
import type { Status } from '@/kit/status/status'
import { fmtMoney, fmtQuantity, fmtResult } from '@/kit/measure'
import type { ProposedTrade } from '@/services/oms'
import type { DraftPreview } from '@/types/workspace-proposal'
import { SIDE_WORDS, legStatus } from './leg-status'

type Row = ProposedTrade & { status: Status }

/** The compact legs table of the thread embed: realised results by character, pre-trade per leg. */
export function ProposalLegsTable({ version, caption }: { version: DraftPreview; caption: string }) {
  const currency = version.preview.currency
  const rows: Row[] = version.preview.trades.map((t, i) => ({ ...t, status: legStatus(version.pretrade, i, t.symbol) }))
  return (
    <DataTable caption={caption} rows={rows} getRowId={(r) => r.symbol} noun={{ singular: 'leg', plural: 'legs' }} density="dense"
      columns={[
        { id: 'symbol', header: 'Symbol', cell: (r) => r.symbol },
        { id: 'side', header: 'Side', cell: (r) => SIDE_WORDS[r.side] },
        { id: 'qty', header: 'Qty', unit: 'sh', align: 'right', cell: (r) => <Num text={fmtQuantity(r.quantity)} /> },
        { id: 'value', header: 'Value', unit: currency, align: 'right', cell: (r) => fmtMoney(r.estimatedValue) },
        { id: 'st', header: 'ST', unit: currency, align: 'right', cell: (r) => fmtResult(r.realisedShortTerm) },
        { id: 'lt', header: 'LT', unit: currency, align: 'right', cell: (r) => fmtResult(r.realisedLongTerm) },
        { id: 'check', header: 'Pre-trade', cell: (r) => <StatusCode status={r.status} /> },
      ]} />
  )
}
