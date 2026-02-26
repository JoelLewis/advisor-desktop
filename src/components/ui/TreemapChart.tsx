import { useRef, useEffect } from 'react'
import * as d3 from 'd3'

type TreemapDatum = {
  id: string
  label: string
  sublabel?: string
  value: number
  weight: number
  breached?: boolean
}

type TreemapChartProps = {
  data: TreemapDatum[]
  width?: number
  height?: number
  onNodeClick?: (id: string) => void
}

const ASSET_COLORS: Record<string, string> = {
  us_equity: '#2563EB',
  intl_equity: '#7C3AED',
  emerging_markets: '#DB2777',
  fixed_income: '#059669',
  alternatives: '#D97706',
  real_estate: '#0891B2',
  commodities: '#65A30D',
  cash: '#94A3B8',
  digital_assets: '#F59E0B',
  private_equity: '#0E7490',
}

type TreeNode = d3.HierarchyRectangularNode<TreemapDatum>

export function TreemapChart({ data, width = 720, height = 440, onNodeClick }: TreemapChartProps) {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!svgRef.current || data.length === 0) return

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    // Build hierarchy — root wraps data as children
    const hierarchyData = { children: data } as unknown as TreemapDatum
    const root = d3.hierarchy<TreemapDatum>(hierarchyData, (d) => (d as unknown as { children?: TreemapDatum[] }).children)
      .sum((d) => d.value ?? 0)
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))

    d3.treemap<TreemapDatum>()
      .size([width, height])
      .paddingInner(2)
      .paddingOuter(2)
      .round(true)(root)

    // After treemap layout, leaves have x0/y0/x1/y1
    const leaves = root.leaves() as TreeNode[]

    const nodes = svg.selectAll<SVGGElement, TreeNode>('g')
      .data(leaves)
      .join('g')
      .attr('transform', (d) => `translate(${d.x0},${d.y0})`)
      .style('cursor', onNodeClick ? 'pointer' : 'default')
      .on('click', (_event, d) => {
        if (onNodeClick && d.data.id) onNodeClick(d.data.id)
      })

    // Background rect
    nodes.append('rect')
      .attr('width', (d) => d.x1 - d.x0)
      .attr('height', (d) => d.y1 - d.y0)
      .attr('rx', 4)
      .attr('fill', (d) => ASSET_COLORS[d.data.sublabel ?? ''] ?? '#94A3B8')
      .attr('opacity', (d) => d.data.breached ? 1 : 0.75)
      .attr('stroke', (d) => d.data.breached ? 'var(--accent-red)' : 'transparent')
      .attr('stroke-width', 2)

    // Symbol label
    nodes.append('text')
      .attr('x', 8)
      .attr('y', 20)
      .attr('fill', '#fff')
      .attr('font-size', (d) => {
        const w = d.x1 - d.x0
        return w > 80 ? 13 : w > 50 ? 11 : 9
      })
      .attr('font-weight', 600)
      .attr('font-family', '"JetBrains Mono", monospace')
      .text((d) => (d.x1 - d.x0) > 40 ? d.data.label : '')

    // Weight label
    nodes.append('text')
      .attr('x', 8)
      .attr('y', 36)
      .attr('fill', 'rgba(255,255,255,0.8)')
      .attr('font-size', 11)
      .attr('font-family', '"JetBrains Mono", monospace')
      .text((d) => {
        const w = d.x1 - d.x0
        const h = d.y1 - d.y0
        return w > 60 && h > 44 ? `${(d.data.weight * 100).toFixed(1)}%` : ''
      })

    // Breach indicator
    nodes.filter((d) => d.data.breached === true)
      .append('text')
      .attr('x', (d) => d.x1 - d.x0 - 8)
      .attr('y', 18)
      .attr('text-anchor', 'end')
      .attr('fill', '#fff')
      .attr('font-size', 14)
      .text('\u26A0')
  }, [data, width, height, onNodeClick])

  return <svg ref={svgRef} width={width} height={height} />
}
