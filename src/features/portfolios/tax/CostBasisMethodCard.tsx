/* eslint-disable react-refresh/only-export-components -- exports component + cost basis constants */
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'
import type { CurrencyCode } from '@/types/currency'
import type { Account } from '@/types/account'

import { COST_BASIS_METHODS, type CostBasisMethod } from '@/lib/cost-basis'

export { COST_BASIS_METHODS, type CostBasisMethod }

export const COST_BASIS_DESCRIPTIONS: Record<CostBasisMethod, string> = {
  FIFO: 'First In, First Out — sells oldest lots first',
  LIFO: 'Last In, First Out — sells newest lots first',
  HIFO: 'Highest In, First Out — sells highest cost lots first (minimizes gains)',
  AvgCost: 'Average Cost — uses average cost basis across all lots',
}

type MethodImpactRow = {
  method: CostBasisMethod
  realizedGain: number
  shortTermGain: number
  longTermGain: number
}

type CostBasisMethodCardProps = {
  account: Pick<Account, 'costBasisMethod'>
  costBasisMethod: CostBasisMethod
  setCostBasisMethod: (method: CostBasisMethod) => void
  methodImpact: MethodImpactRow[] | null
  formatWithConversion: (value: number, currency: CurrencyCode, opts?: { compact?: boolean }) => string
  baseCurrency: CurrencyCode
}

export function CostBasisMethodCard({
  account,
  costBasisMethod,
  setCostBasisMethod,
  methodImpact,
  formatWithConversion,
  baseCurrency,
}: CostBasisMethodCardProps) {
  // Average cost is only an available election for accounts the custodian actually offers it
  // on (mutual funds and DRIP-eligible shares) — not every brokerage account.
  const availableMethods = COST_BASIS_METHODS.filter(
    (m) => m !== 'AvgCost' || account.costBasisMethod === 'average_cost',
  )
  const visibleImpact = methodImpact?.filter((row) => availableMethods.includes(row.method)) ?? null

  return (
    <Card>
      <CardHeader>Cost Basis Method</CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <select
            value={costBasisMethod}
            onChange={(e) => setCostBasisMethod(e.target.value as CostBasisMethod)}
            className="rounded-md border border-border-secondary bg-surface-primary px-3 py-1.5 text-body text-text-primary focus:border-accent-blue focus:outline-hidden"
          >
            {availableMethods.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <span className="text-caption text-text-secondary">
            {COST_BASIS_DESCRIPTIONS[costBasisMethod]}
          </span>
        </div>
        <p className="text-[11px] text-text-tertiary">
          HIFO and LIFO are standing lot-selection instructions under specific identification.
          Average cost is available only for mutual funds and DRIP-eligible shares.
        </p>

        {/* Impact comparison table */}
        {visibleImpact && (
          <div className="overflow-x-auto">
            <table className="w-full text-caption">
              <thead>
                <tr className="border-b border-border-primary text-text-tertiary">
                  <th className="px-3 py-2 text-left font-medium">Method</th>
                  <th className="px-3 py-2 text-right font-medium">Realized Gain/Loss</th>
                  <th className="px-3 py-2 text-right font-medium">Short-Term</th>
                  <th className="px-3 py-2 text-right font-medium">Long-Term</th>
                </tr>
              </thead>
              <tbody>
                {visibleImpact.map((row) => (
                  <tr
                    key={row.method}
                    className={cn(
                      'border-b border-border-primary transition-colors',
                      row.method === costBasisMethod
                        ? 'bg-accent-blue/5 font-medium'
                        : 'hover:bg-surface-tertiary',
                    )}
                  >
                    <td className="px-3 py-2 text-text-primary">
                      {row.method}
                      {row.method === costBasisMethod && (
                        <Badge variant="blue" className="ml-2 text-[9px]">Active</Badge>
                      )}
                    </td>
                    <td className={cn('px-3 py-2 text-right font-mono', row.realizedGain >= 0 ? 'text-accent-green' : 'text-accent-red')}>
                      {formatWithConversion(row.realizedGain, baseCurrency, { compact: true })}
                    </td>
                    <td className={cn('px-3 py-2 text-right font-mono', row.shortTermGain >= 0 ? 'text-accent-green' : 'text-accent-red')}>
                      {formatWithConversion(row.shortTermGain, baseCurrency, { compact: true })}
                    </td>
                    <td className={cn('px-3 py-2 text-right font-mono', row.longTermGain >= 0 ? 'text-accent-green' : 'text-accent-red')}>
                      {formatWithConversion(row.longTermGain, baseCurrency, { compact: true })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-[11px] text-text-tertiary">
              Impact simulated on hypothetical 10% position reduction across all holdings.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
