import { useRef, useEffect } from 'react'
import * as d3 from 'd3'

type WaterfallDatum = {
  label: string
  value: number
}

type WaterfallChartProps = {
  data: WaterfallDatum[]
  width?: number
  height?: number
  showTotal?: boolean
}

export function WaterfallChart({ data, width = 720, height = 360, showTotal = true }: WaterfallChartProps) {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!svgRef.current || data.length === 0) return

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const margin = { top: 20, right: 20, bottom: 60, left: 50 }
    const w = width - margin.left - margin.right
    const h = height - margin.top - margin.bottom

    // Build waterfall structure: running cumulative total
    type WaterfallBar = { label: string; value: number; start: number; end: number; isTotal: boolean }
    const bars: WaterfallBar[] = []
    let running = 0

    for (const d of data) {
      bars.push({ label: d.label, value: d.value, start: running, end: running + d.value, isTotal: false })
      running += d.value
    }

    if (showTotal) {
      bars.push({ label: 'Total', value: running, start: 0, end: running, isTotal: true })
    }

    const yMin = d3.min(bars, (b) => Math.min(b.start, b.end)) ?? 0
    const yMax = d3.max(bars, (b) => Math.max(b.start, b.end)) ?? 0
    const padding = Math.max(Math.abs(yMax - yMin) * 0.1, 0.001)

    const x = d3.scaleBand<string>().domain(bars.map((b) => b.label)).range([0, w]).padding(0.3)
    const y = d3.scaleLinear().domain([yMin - padding, yMax + padding]).range([h, 0])

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`)

    // Zero line
    g.append('line')
      .attr('x1', 0).attr('x2', w)
      .attr('y1', y(0)).attr('y2', y(0))
      .attr('stroke', 'var(--border-secondary)')
      .attr('stroke-dasharray', '4,4')

    // Connector lines between bars
    for (let i = 0; i < bars.length - 1; i++) {
      const curr = bars[i] as WaterfallBar
      const next = bars[i + 1] as WaterfallBar
      if (!next.isTotal) {
        g.append('line')
          .attr('x1', (x(curr.label) ?? 0) + x.bandwidth())
          .attr('x2', x(next.label) ?? 0)
          .attr('y1', y(curr.end))
          .attr('y2', y(curr.end))
          .attr('stroke', 'var(--border-primary)')
          .attr('stroke-dasharray', '2,2')
      }
    }

    // Bars
    g.selectAll('.bar')
      .data(bars)
      .join('rect')
      .attr('x', (d) => x(d.label) ?? 0)
      .attr('y', (d) => y(Math.max(d.start, d.end)))
      .attr('width', x.bandwidth())
      .attr('height', (d) => Math.abs(y(d.start) - y(d.end)))
      .attr('rx', 2)
      .attr('fill', (d) => d.isTotal ? 'var(--accent-blue)' : d.value >= 0 ? 'var(--accent-green)' : 'var(--accent-red)')
      .attr('opacity', 0.85)

    // Value labels
    g.selectAll('.label')
      .data(bars)
      .join('text')
      .attr('x', (d) => (x(d.label) ?? 0) + x.bandwidth() / 2)
      .attr('y', (d) => y(Math.max(d.start, d.end)) - 6)
      .attr('text-anchor', 'middle')
      .attr('fill', 'var(--text-secondary)')
      .attr('font-size', 11)
      .attr('font-family', '"JetBrains Mono", monospace')
      .text((d) => `${d.value >= 0 ? '+' : ''}${(d.value * 100).toFixed(2)}%`)

    // Axes
    g.append('g')
      .attr('transform', `translate(0,${h})`)
      .call(d3.axisBottom(x))
      .selectAll('text')
      .attr('transform', 'rotate(-30)')
      .style('text-anchor', 'end')
      .style('font-size', '11px')
      .style('fill', 'var(--text-secondary)')

    g.append('g')
      .call(d3.axisLeft(y).ticks(6).tickFormat((d) => `${(d as number * 100).toFixed(1)}%`))
      .selectAll('text')
      .style('font-size', '11px')
      .style('fill', 'var(--text-tertiary)')

    // Remove axis lines for cleaner look
    g.selectAll('.domain').attr('stroke', 'var(--border-primary)')
    g.selectAll('.tick line').attr('stroke', 'var(--border-primary)')
  }, [data, width, height, showTotal])

  return <svg ref={svgRef} width={width} height={height} />
}
