import { DataTable } from '@/kit/data-table/DataTable'
import { Num } from '@/kit/data-table/Num'
import { StatusCode } from '@/kit/status/StatusCode'
import { UNIT, fmtDrift, fmtMoney, fmtTolerance, fmtWeight } from '@/kit/measure'
import { RESIDUAL_WORDS } from '@/workspace/proposal/residual-words'
import { assetClassLabel } from '@/workspace/asset-class-label'
import type { HouseholdAccount } from '@/types/workspace-household'

type ModelRow = Extract<HouseholdAccount, { mandate: 'model' }>
const outsideWords = (a: ModelRow) => a.outside
  .map((o) => `${assetClassLabel(o.assetClass)} ${fmtDrift(o.drift)}\u00a0${UNIT.pp}${o.residual ? ` · ${RESIDUAL_WORDS[o.residual]}` : ''}`).join('; ')

/** `tiesTo`: what the total is on record for, by scope: "the household total", "Robert Johnson's accounts". */
type AccountsTableProps = { caption: string; accounts: HouseholdAccount[]; totalValue: number; totalLabel: string; tiesTo: string }

/**
 * Managed accounts against their models: largest drift against the band, value, and what sits outside it and why. Owner and
 * model sit under the account's name, and the band and what sits outside it with its status, so every column fits beside the context column at 1024px.
 */
export function AccountsTable({ caption, accounts, totalValue, totalLabel, tiesTo }: AccountsTableProps) {
  const rowsTotal = accounts.reduce((s, a) => s + a.valueUsd, 0)
  return (
    <DataTable caption={caption} rows={accounts} getRowId={(a) => a.accountId} total={accounts.length}
      noun={{ singular: 'account', plural: 'accounts' }}
      columns={[
        { id: 'account', header: 'Account', wrap: true, cell: (a) => (
          <span className="flex flex-col items-start">
            <span>{a.currency === 'USD' ? a.name : `${a.name} · ${a.currency} account`}</span>
            <span className="text-label text-ink-3">{`${a.ownerName} · ${a.mandate === 'model' ? a.modelName : 'Custom mandate · not model-managed'}`}</span>
          </span>
        ), sortValue: (a) => a.name },
        { id: 'drift', header: 'Largest drift', unit: UNIT.pp, align: 'right', cell: (a) => (a.mandate === 'model' ? <Num text={fmtWeight(a.maxAbsDrift)} /> : null), sortValue: (a) => (a.mandate === 'model' ? a.maxAbsDrift : -1) },
        { id: 'status', header: 'Status, band, outside it', wrap: true, cell: (a) => (a.mandate === 'model' ? (
          <span className="flex flex-col items-start gap-1">
            <span className="inline-flex items-baseline gap-2">
              <StatusCode status={a.withinBand ? 'IN' : 'OUT'} label={a.withinBand ? 'inside its band' : 'outside its band'} />
              <span className="tabular">{`${fmtTolerance(a.driftTolerance)}\u00a0${UNIT.pp}`}</span>
            </span>
            {a.outside.length > 0 ? <span className="tabular text-label text-ink-3">{outsideWords(a)}</span> : null}
          </span>
        ) : <span className="text-label text-ink-3">{a.mandateSummary}</span>) },
        { id: 'value', header: 'Value', unit: UNIT.usd, align: 'right', cell: (a) => <Num text={fmtMoney(a.valueUsd)} />, sortValue: (a) => a.valueUsd },
      ]}
      totals={{ label: totalLabel, tiesTo: { label: `${tiesTo}, ${fmtMoney(totalValue)} ${UNIT.usd}`, expected: totalValue, actual: rowsTotal }, cells: { value: fmtMoney(totalValue) } }} />
  )
}
