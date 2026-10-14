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

type AccountsTableProps = { caption: string; accounts: HouseholdAccount[]; totalValue: number; totalLabel: string }

/** Managed accounts against their models: value, largest drift against the band, and what sits outside it and why. */
export function AccountsTable({ caption, accounts, totalValue, totalLabel }: AccountsTableProps) {
  const rowsTotal = accounts.reduce((s, a) => s + a.value, 0)
  return (
    <DataTable caption={caption} rows={accounts} getRowId={(a) => a.accountId} total={accounts.length}
      noun={{ singular: 'account', plural: 'accounts' }}
      columns={[
        { id: 'account', header: 'Account', cell: (a) => a.name, sortValue: (a) => a.name },
        { id: 'owner', header: 'Owner', cell: (a) => a.ownerName },
        { id: 'model', header: 'Model', wrap: true, cell: (a) => (a.mandate === 'model' ? a.modelName : 'Custom mandate · not model-managed') },
        { id: 'value', header: 'Value', unit: UNIT.usd, align: 'right', cell: (a) => <Num text={fmtMoney(a.value)} />, sortValue: (a) => a.value },
        { id: 'drift', header: 'Largest drift', unit: UNIT.pp, align: 'right', cell: (a) => (a.mandate === 'model' ? <Num text={fmtWeight(a.maxAbsDrift)} /> : null), sortValue: (a) => (a.mandate === 'model' ? a.maxAbsDrift : -1) },
        { id: 'band', header: 'Band', unit: UNIT.pp, align: 'right', cell: (a) => (a.mandate === 'model' ? fmtTolerance(a.driftTolerance) : null) },
        { id: 'status', header: 'Status', cell: (a) => (a.mandate === 'model' ? <StatusCode status={a.withinBand ? 'IN' : 'OUT'} label={a.withinBand ? 'inside its band' : 'outside its band'} /> : null) },
        { id: 'outside', header: 'Outside its band', wrap: true, cell: (a) => (a.mandate === 'model' ? outsideWords(a) : a.mandateSummary) },
      ]}
      totals={{ label: totalLabel, tiesTo: { label: 'the value the engine states', expected: totalValue, actual: rowsTotal }, cells: { value: fmtMoney(totalValue) } }} />
  )
}
