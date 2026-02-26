import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import type { TooltipProps } from 'recharts'
import { cn } from '@/lib/utils'
import { ASSET_CLASS_COLORS as COLORS, ASSET_CLASS_LABELS as LABELS } from '@/lib/chart-colors'

type AllocationSlice = {
  assetClass: string
  weight: number
  value?: number
}

type AllocationChartProps = {
  data: AllocationSlice[]
  size?: 'sm' | 'md' | 'lg'
  showLegend?: boolean
  className?: string
}

function AllocationTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload || payload.length === 0) return null
  const entry = payload[0]
  if (!entry) return null
  const assetClass = entry.payload?.assetClass as string | undefined
  const weight = entry.value ?? 0
  const value = entry.payload?.value as number | undefined
  const label = assetClass ? (LABELS[assetClass] ?? assetClass) : 'Unknown'
  const color = assetClass ? (COLORS[assetClass] ?? '#94A3B8') : '#94A3B8'

  return (
    <div className="rounded-md border border-border-primary bg-white px-3 py-2 shadow-lg">
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: color }} />
        <span className="text-caption font-medium text-text-primary">{label}</span>
      </div>
      <div className="mt-1 text-caption text-text-secondary">
        <span className="font-mono font-medium">{(weight * 100).toFixed(1)}%</span>
        {value !== undefined && (
          <span className="ml-2 font-mono">
            ${value >= 1_000_000 ? `${(value / 1_000_000).toFixed(1)}M` : value >= 1_000 ? `${(value / 1_000).toFixed(0)}K` : value.toFixed(0)}
          </span>
        )}
      </div>
    </div>
  )
}

export function AllocationChart({ data, size = 'md', showLegend = true, className }: AllocationChartProps) {
  const dimensions = { sm: 140, md: 200, lg: 260 }
  const dim = dimensions[size]

  return (
    <div className={cn('flex items-center gap-6', className)}>
      <ResponsiveContainer width={dim} height={dim}>
        <PieChart>
          <Pie
            data={data}
            dataKey="weight"
            nameKey="assetClass"
            cx="50%"
            cy="50%"
            innerRadius={dim * 0.3}
            outerRadius={dim * 0.45}
            paddingAngle={1}
            strokeWidth={0}
          >
            {data.map((entry) => (
              <Cell key={entry.assetClass} fill={COLORS[entry.assetClass] ?? '#94A3B8'} />
            ))}
          </Pie>
          <Tooltip content={<AllocationTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      {showLegend && (
        <div className="space-y-1.5">
          {data.filter((d) => d.weight > 0).map((slice) => (
            <div key={slice.assetClass} className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-sm"
                style={{ backgroundColor: COLORS[slice.assetClass] ?? '#94A3B8' }}
              />
              <span className="text-caption text-text-secondary">
                {LABELS[slice.assetClass] ?? slice.assetClass}
              </span>
              <span className="font-mono text-caption font-medium text-text-primary">
                {(slice.weight * 100).toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
