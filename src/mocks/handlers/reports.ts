import { http, HttpResponse } from 'msw'
import type { GeneratedReport, ReportSection, ReportTemplate } from '@/types/report'

const TEMPLATE_LABELS: Record<ReportTemplate, string> = {
  portfolio_review: 'Portfolio Review',
  performance_summary: 'Performance Summary',
  tax_summary: 'Tax Summary',
  financial_plan_update: 'Financial Plan Update',
}

const SECTION_CONTENT: Record<ReportSection, { title: string; content: string }> = {
  executive_summary: {
    title: 'Executive Summary',
    content: 'Your portfolio continues to perform well, delivering strong risk-adjusted returns that exceed benchmark expectations. Total AUM grew 4.2% this period, driven by favorable equity positioning and disciplined rebalancing. We recommend maintaining the current strategic allocation with minor tactical adjustments to capitalize on emerging fixed-income opportunities.',
  },
  portfolio_overview: {
    title: 'Portfolio Overview',
    content: 'Total managed assets: **$18.75M** across 5 accounts.\n\n| Account | Value | Allocation |\n|---|---|---|\n| Family Trust | $8.2M | 43.7% |\n| Individual | $4.5M | 24.0% |\n| Traditional IRA | $3.55M | 18.9% |\n| Roth IRA | $450K | 2.4% |\n| Individual (P. Johnson) | $2.05M | 10.9% |\n\nThe portfolio maintains a balanced allocation across equity (52%), fixed income (28%), alternatives (12%), and cash (8%).',
  },
  performance_analysis: {
    title: 'Performance Analysis',
    content: 'Period returns (net of fees):\n\n| Period | Portfolio | Benchmark | Alpha |\n|---|---|---|---|\n| MTD | +1.8% | +1.5% | +0.3% |\n| QTD | +3.2% | +2.8% | +0.4% |\n| YTD | +3.2% | +2.8% | +0.4% |\n| 1 Year | +12.4% | +11.1% | +1.3% |\n| 3 Year (ann.) | +8.7% | +7.9% | +0.8% |\n\nThe portfolio outperformed across all time periods, with the strongest relative contribution from the equity sleeve (+180bps alpha YTD).',
  },
  asset_allocation: {
    title: 'Asset Allocation',
    content: 'Current allocation vs. target:\n\n| Asset Class | Target | Actual | Drift |\n|---|---|---|---|\n| US Equity | 35% | 36.2% | +1.2% |\n| Intl Equity | 15% | 15.8% | +0.8% |\n| Fixed Income | 30% | 28.1% | -1.9% |\n| Alternatives | 12% | 12.0% | 0.0% |\n| Cash | 8% | 7.9% | -0.1% |\n\nAll asset classes within acceptable drift tolerance. Slight equity overweight reflects strong market performance. No rebalancing required at this time.',
  },
  holdings_detail: {
    title: 'Holdings Detail',
    content: 'Top 10 holdings by value:\n\n| Security | Value | Weight | YTD Return |\n|---|---|---|---|\n| VTI (Vanguard Total Stock) | $3.2M | 17.1% | +4.8% |\n| VXUS (Vanguard Intl Stock) | $1.8M | 9.6% | +2.1% |\n| BND (Vanguard Total Bond) | $2.1M | 11.2% | +1.2% |\n| AAPL (Apple Inc.) | $890K | 4.7% | +8.2% |\n| MSFT (Microsoft Corp.) | $750K | 4.0% | +6.5% |\n| NVDA (NVIDIA Corp.) | $620K | 3.3% | +12.4% |\n| AGG (iShares Core Bond) | $1.4M | 7.5% | +1.0% |\n| BXPE (Blackstone PE) | $540K | 2.9% | +3.2% |\n| SPY (SPDR S&P 500) | $480K | 2.6% | +5.1% |\n| TLT (iShares 20+ Treasury) | $420K | 2.2% | +0.8% |',
  },
  transactions: {
    title: 'Transaction Summary',
    content: 'This period\'s activity:\n\n- **Buys**: 8 transactions totaling $342,000\n- **Sells**: 5 transactions totaling $215,000\n- **Dividends received**: $48,200\n- **Interest received**: $31,400\n- **Net cash flow**: +$127,000\n\nNotable transactions:\n- Added to international equity position (VXUS) on pullback\n- Harvested tax loss in individual account (sold EFA, replaced with IEFA)\n- Reinvested Q4 2025 dividends across all accounts',
  },
  tax_summary: {
    title: 'Tax Summary',
    content: 'Year-to-date tax impact:\n\n| Category | Amount |\n|---|---|\n| Realized short-term gains | $12,400 |\n| Realized long-term gains | $8,200 |\n| Tax losses harvested | ($18,600) |\n| **Net realized gain/(loss)** | **$2,000** |\n| Unrealized gains | $1,240,000 |\n| Unrealized losses | ($86,000) |\n\nTax-loss harvesting has offset $18,600 in gains this year. The portfolio has $86,000 in unrealized losses available for future harvesting.',
  },
  planning_progress: {
    title: 'Financial Planning Progress',
    content: 'Goal tracking:\n\n| Goal | Target | Current | Probability |\n|---|---|---|---|\n| Retirement (2028) | $20M | $18.75M | 87% |\n| Education Fund | $500K | $420K | 92% |\n| Legacy/Estate | $5M | $4.2M | 78% |\n\nRetirement probability improved from 84% to 87% due to strong market returns and continued savings. Education fund is on track. Estate planning goal needs attention — recommend increasing annual contributions by $15K.',
  },
  market_commentary: {
    title: 'Market Commentary',
    content: 'Markets continued to advance in early 2026, supported by resilient economic growth and moderating inflation. Key themes:\n\n- **Equities**: S&P 500 up +2.8% YTD. Tech sector leads (+5.2%) while energy lags (-1.4%)\n- **Fixed Income**: 10-year Treasury yield at 4.25%, down 15bps from year-end. Investment-grade spreads tight at +95bps\n- **International**: Eurozone recovery gaining traction. Emerging markets benefiting from weaker dollar\n- **Alternatives**: Private equity distributions improving. Hedge fund alpha positive across strategies\n\nOutlook: We maintain a cautiously optimistic stance. Key risks include geopolitical uncertainty and potential Fed policy shifts.',
  },
  recommendations: {
    title: 'Recommendations',
    content: 'Action items for the coming quarter:\n\n1. **Rebalance fixed income** — Slightly underweight vs. target. Consider adding $350K to intermediate-term bonds\n2. **Tax-loss harvest** — Monitor international equity positions for harvesting opportunities before year-end\n3. **RMD planning** — Begin planning for 2027 Required Minimum Distribution from Traditional IRA\n4. **Estate review** — Schedule meeting to discuss updating trust documents and beneficiary designations\n5. **Alternative investments** — Evaluate adding infrastructure exposure via the portfolio\'s alternatives sleeve',
  },
}

const DEFAULT_SECTIONS: Record<ReportTemplate, ReportSection[]> = {
  portfolio_review: ['executive_summary', 'portfolio_overview', 'performance_analysis', 'asset_allocation', 'holdings_detail', 'market_commentary', 'recommendations'],
  performance_summary: ['executive_summary', 'performance_analysis', 'asset_allocation', 'market_commentary'],
  tax_summary: ['executive_summary', 'tax_summary', 'transactions', 'recommendations'],
  financial_plan_update: ['executive_summary', 'planning_progress', 'portfolio_overview', 'performance_analysis', 'recommendations'],
}

export const reportHandlers = [
  http.get('/api/reports/templates', () => {
    const templates = Object.entries(TEMPLATE_LABELS).map(([id, label]) => ({
      id,
      label,
      defaultSections: DEFAULT_SECTIONS[id as ReportTemplate],
    }))
    return HttpResponse.json(templates)
  }),

  http.post('/api/reports/generate', async ({ request }) => {
    const body = await request.json() as { template: ReportTemplate; sections: ReportSection[]; clientId?: string }
    const report: GeneratedReport = {
      id: `rpt-${Date.now()}`,
      title: `${TEMPLATE_LABELS[body.template]} — ${new Date().toLocaleDateString()}`,
      generatedAt: new Date().toISOString(),
      sections: body.sections
        .map((s) => SECTION_CONTENT[s])
        .filter(Boolean)
        .map((sc, i) => ({ ...sc, id: body.sections[i]! })),
    }
    // Simulate generation time
    await new Promise((resolve) => setTimeout(resolve, 1500))
    return HttpResponse.json(report)
  }),
]
