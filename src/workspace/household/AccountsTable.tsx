import { DataTable } from '@/kit/data-table/DataTable'
import { Num } from '@/kit/data-table/Num'
import { StatusCode } from '@/kit/status/StatusCode'
import { UNIT, fmtDrift, fmtMoney, fmtTolerance, fmtWeight } from '@/kit/measure'
import { RESIDUAL_WORDS } from '@/workspace/proposal/residual-words'
import { assetClassLabel } from '@/workspace/asset-class-label'
import type { HouseholdAccount } from '@/types/workspace-household'

const outsideWords = (a: HouseholdAccount) => a.outside
  .map((o) => `${assetClassLabel(o.assetClass)} ${fmtDrift(o.drift)} ${UNIT.pp}${o.residual ? ` · ${RESIDUAL_WORDS[o.residual]}` : ''}`).join('; ')

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
        { id: 'model', header: 'Model', cell: (a) => a.modelName },
        { id: 'value', header: 'Value', unit: UNIT.usd, align: 'right', cell: (a) => <Num text={fmtMoney(a.value)} />, sortValue: (a) => a.value },
        { id: 'drift', header: 'Largest drift', unit: UNIT.pp, align: 'right', cell: (a) => <Num text={fmtWeight(a.maxAbsDrift)} />, sortValue: (a) => a.maxAbsDrift },
        { id: 'band', header: 'Band', unit: UNIT.pp, align: 'right', cell: (a) => fmtTolerance(a.driftTolerance) },
        { id: 'status', header: 'Status', cell: (a) => <StatusCode status={a.withinBand ? 'IN' : 'OUT'} label={a.withinBand ? 'inside its band' : 'outside its band'} /> },
        { id: 'outside', header: 'Outside its band', wrap: true, cell: (a) => outsideWords(a) },
      ]}
      totals={{ label: totalLabel, tiesTo: { label: 'the value the engine states', expected: totalValue, actual: rowsTotal }, cells: { value: fmtMoney(totalValue) } }} />
  )
}
