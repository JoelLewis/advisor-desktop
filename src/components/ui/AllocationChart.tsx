import { useState } from 'react'
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
  onSliceClick?: (assetClass: string) => void
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

export function AllocationChart({ data, size = 'md', showLegend = true, className, onSliceClick }: AllocationChartProps) {
  const dimensions = { sm: 140, md: 200, lg: 260 }
  const dim = dimensions[size]
  const [activeSlice, setActiveSlice] = useState<string | null>(null)
  const isClickable = !!onSliceClick

  function handlePieClick(entry: AllocationSlice) {
    if (onSliceClick) {
      onSliceClick(entry.assetClass)
    }
  }

  function handleLegendClick(assetClass: string) {
    if (onSliceClick) {
      onSliceClick(assetClass)
    }
  }

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
            onClick={(_, index) => { const d = data[index]; if (d) handlePieClick(d) }}
            onMouseEnter={(_, index) => { const d = data[index]; if (d) setActiveSlice(d.assetClass) }}
            onMouseLeave={() => setActiveSlice(null)}
            style={isClickable ? { cursor: 'pointer' } : undefined}
          >
            {data.map((entry) => (
              <Cell
                key={entry.assetClass}
                fill={COLORS[entry.assetClass] ?? '#94A3B8'}
                opacity={activeSlice && activeSlice !== entry.assetClass ? 0.5 : 1}
                stroke={activeSlice === entry.assetClass ? 'var(--text-primary)' : undefined}
                strokeWidth={activeSlice === entry.assetClass ? 2 : 0}
              />
            ))}
          </Pie>
          <Tooltip
            content={<AllocationTooltip />}
            wrapperStyle={{ zIndex: 50 }}
            allowEscapeViewBox={{ x: false, y: false }}
          />
        </PieChart>
      </ResponsiveContainer>
      {showLegend && (
        <div className="space-y-1.5">
          {data.filter((d) => d.weight > 0).map((slice) => (
            <button
              key={slice.assetClass}
              onClick={() => handleLegendClick(slice.assetClass)}
              onMouseEnter={() => setActiveSlice(slice.assetClass)}
              onMouseLeave={() => setActiveSlice(null)}
              disabled={!isClickable}
              className={cn(
                'flex items-center gap-2 rounded px-1 -mx-1 transition-opacity',
                isClickable && 'hover:bg-surface-tertiary cursor-pointer',
                activeSlice && activeSlice !== slice.assetClass && 'opacity-50',
              )}
            >
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
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
