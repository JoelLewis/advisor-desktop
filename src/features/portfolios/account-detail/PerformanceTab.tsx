import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { DataTable } from '@/components/ui/DataTable'
import { benchmarkColumns } from './columns'
import type { PerformanceSeries, BenchmarkComparison } from '@/types/performance'

type PerformanceTabProps = {
  performance: PerformanceSeries[] | undefined
  benchmark: BenchmarkComparison[] | undefined
  id: string
}

export function PerformanceTab({ performance, benchmark, id }: PerformanceTabProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-baseline gap-2">
            <span>Growth of $100</span>
            <span className="text-caption font-normal text-text-tertiary">(TWR)</span>
          </div>
        </CardHeader>
        <CardContent>
          {performance && (
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={performance}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} tickFormatter={(v: string) => v.slice(5)} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} domain={['auto', 'auto']} />
                <RechartsTooltip contentStyle={{ background: 'var(--surface-primary)', border: '1px solid var(--border-primary)' }} />
                <Line type="monotone" dataKey="value" stroke="var(--accent-blue)" strokeWidth={2} dot={false} name="Portfolio" />
                <Line type="monotone" dataKey="benchmark" stroke="var(--text-tertiary)" strokeWidth={1.5} dot={false} strokeDasharray="4 4" name="Benchmark" />
                <Legend />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {benchmark && (
        <Card>
          <CardHeader>
            <div className="flex items-baseline gap-2">
              <span>Benchmark Comparison</span>
              <span className="text-caption font-normal text-text-tertiary">(TWR)</span>
            </div>
          </CardHeader>
          <DataTable data={benchmark} columns={benchmarkColumns} compact />
        </Card>
      )}

      <Link
        to={`/portfolios/accounts/${id}/attribution`}
        className="flex items-center gap-2 rounded-md border border-accent-blue px-4 py-2.5 text-body font-medium text-accent-blue transition-colors hover:bg-accent-blue/5"
      >
        View Brinson Attribution Analysis <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  )
}
