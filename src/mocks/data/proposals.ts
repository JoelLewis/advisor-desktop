import type { ProposalTemplate, ProposalSectionType } from '@/types/proposal'

export const proposalTemplates: ProposalTemplate[] = [
  {
    id: 'tpl-001',
    name: 'Comprehensive Wealth Management',
    description: 'Full-spectrum proposal covering investment strategy, risk management, and fee structure for high-net-worth clients',
    suitableFor: 'HNW and UHNW clients with $5M+ portfolios seeking holistic wealth management',
    sections: ['cover_page', 'executive_summary', 'current_situation', 'recommended_portfolio', 'fee_schedule', 'disclosures'],
    defaultAllocation: [
      { assetClass: 'US Equity', targetWeight: 0.35, currentWeight: 0.40, rationale: 'Slight reduction to US equity exposure reduces concentration risk while maintaining growth potential through broad domestic market participation.' },
      { assetClass: "Int'l Equity", targetWeight: 0.20, currentWeight: 0.15, rationale: 'Increasing international allocation captures diversification benefits and exposure to faster-growing economies outside the US.' },
      { assetClass: 'Fixed Income', targetWeight: 0.25, currentWeight: 0.30, rationale: 'Moderate reduction in fixed income reflects the current rate environment while maintaining sufficient ballast for portfolio stability.' },
      { assetClass: 'Alternatives', targetWeight: 0.10, currentWeight: 0.08, rationale: 'Modest increase in alternatives provides uncorrelated return streams and downside protection during equity drawdowns.' },
      { assetClass: 'Real Assets', targetWeight: 0.05, currentWeight: 0.04, rationale: 'Real asset allocation provides inflation hedging through REITs and commodities exposure.' },
      { assetClass: 'Cash', targetWeight: 0.05, currentWeight: 0.03, rationale: 'Cash buffer maintained for liquidity needs and tactical rebalancing opportunities.' },
    ],
    feeTiers: [
      { minAUM: 0, maxAUM: 2_000_000, rate: 0.0100, label: '$0 – $2M' },
      { minAUM: 2_000_000, maxAUM: 5_000_000, rate: 0.0085, label: '$2M – $5M' },
      { minAUM: 5_000_000, maxAUM: 10_000_000, rate: 0.0070, label: '$5M – $10M' },
      { minAUM: 10_000_000, maxAUM: null, rate: 0.0050, label: '$10M+' },
    ],
  },
  {
    id: 'tpl-002',
    name: 'Retirement Transition',
    description: 'Income-focused proposal for clients approaching or in retirement, emphasizing stability and distribution planning',
    suitableFor: 'Pre-retirees and retirees prioritizing income generation and capital preservation',
    sections: ['cover_page', 'executive_summary', 'current_situation', 'recommended_portfolio', 'fee_schedule', 'disclosures'],
    defaultAllocation: [
      { assetClass: 'US Equity', targetWeight: 0.25, currentWeight: 0.35, rationale: 'Reducing equity exposure lowers portfolio volatility as the client transitions to distribution phase and has a shorter recovery window.' },
      { assetClass: "Int'l Equity", targetWeight: 0.10, currentWeight: 0.10, rationale: 'Maintaining current international allocation provides continued diversification without adding unnecessary complexity.' },
      { assetClass: 'Fixed Income', targetWeight: 0.40, currentWeight: 0.30, rationale: 'Significant increase in fixed income generates reliable income streams and reduces drawdown risk during the distribution phase.' },
      { assetClass: 'Real Assets', targetWeight: 0.10, currentWeight: 0.05, rationale: 'Doubling real asset exposure through REITs and TIPS provides inflation protection critical for maintaining purchasing power in retirement.' },
      { assetClass: 'Cash', targetWeight: 0.15, currentWeight: 0.20, rationale: 'Slight reduction in cash while maintaining a 2-year distribution reserve to avoid forced selling during market downturns.' },
    ],
    feeTiers: [
      { minAUM: 0, maxAUM: 1_000_000, rate: 0.0100, label: '$0 – $1M' },
      { minAUM: 1_000_000, maxAUM: 3_000_000, rate: 0.0080, label: '$1M – $3M' },
      { minAUM: 3_000_000, maxAUM: null, rate: 0.0065, label: '$3M+' },
    ],
  },
  {
    id: 'tpl-003',
    name: 'Growth Portfolio',
    description: 'Aggressive growth proposal for younger clients with long time horizons and higher risk tolerance',
    suitableFor: 'Accumulation-phase clients under 50 with 15+ year time horizons',
    sections: ['cover_page', 'executive_summary', 'current_situation', 'recommended_portfolio', 'fee_schedule', 'disclosures'],
    defaultAllocation: [
      { assetClass: 'US Equity', targetWeight: 0.45, currentWeight: 0.40, rationale: 'Increasing US equity allocation maximizes exposure to domestic large- and mid-cap growth, which historically outperforms over 15+ year horizons.' },
      { assetClass: "Int'l Equity", targetWeight: 0.25, currentWeight: 0.20, rationale: 'Higher international allocation captures valuation discounts in developed markets and structural growth in emerging economies.' },
      { assetClass: 'Emerging Markets', targetWeight: 0.10, currentWeight: 0.05, rationale: 'Dedicated emerging markets sleeve provides access to higher GDP growth rates with acceptable volatility given the long time horizon.' },
      { assetClass: 'Alternatives', targetWeight: 0.10, currentWeight: 0.10, rationale: 'Maintaining alternatives allocation through hedge fund and private equity allocations adds return potential and portfolio diversification.' },
      { assetClass: 'Fixed Income', targetWeight: 0.05, currentWeight: 0.20, rationale: 'Significant reduction in fixed income is appropriate given the long horizon; minimal bond exposure serves as a rebalancing buffer rather than an income source.' },
      { assetClass: 'Cash', targetWeight: 0.05, currentWeight: 0.05, rationale: 'Minimal cash position maintained for tactical rebalancing and emergency liquidity needs.' },
    ],
    feeTiers: [
      { minAUM: 0, maxAUM: 1_000_000, rate: 0.0095, label: '$0 – $1M' },
      { minAUM: 1_000_000, maxAUM: 5_000_000, rate: 0.0075, label: '$1M – $5M' },
      { minAUM: 5_000_000, maxAUM: null, rate: 0.0060, label: '$5M+' },
    ],
  },
]

export const SECTION_LABELS: Record<ProposalSectionType, string> = {
  cover_page: 'Cover Page',
  executive_summary: 'Executive Summary',
  current_situation: 'Current Situation',
  recommended_portfolio: 'Recommended Portfolio',
  fee_schedule: 'Fee Schedule',
  disclosures: 'Disclosures',
}

export function generateSectionContent(
  sectionType: ProposalSectionType,
  clientName: string,
  templateId: string,
): string {
  const template = proposalTemplates.find((t) => t.id === templateId)
  const templateName = template?.name ?? 'Investment Proposal'
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

  switch (sectionType) {
    case 'cover_page':
      return [
        `# ${templateName}`,
        '',
        `## Prepared for ${clientName}`,
        '',
        `**Date:** ${today}`,
        '',
        '**Prepared by:** Sarah Mitchell, CFP, CFA',
        '',
        '**Senior Wealth Advisor**',
        '',
        '---',
        '',
        '**iDeal Wealth Management**',
        '',
        '200 Park Avenue, Suite 3200',
        'New York, NY 10166',
        '',
        'Tel: (212) 555-0142',
        'Email: sarah.mitchell@idealwm.com',
        '',
        '---',
        '',
        '*This proposal is confidential and intended solely for the named recipient. It contains proprietary investment recommendations tailored to your specific financial situation, objectives, and risk tolerance. Please do not distribute without prior written consent from iDeal Wealth Management.*',
      ].join('\n')

    case 'executive_summary':
      return [
        '## Executive Summary',
        '',
        `Dear ${clientName},`,
        '',
        `Thank you for the opportunity to present this ${templateName.toLowerCase()} proposal. After a thorough review of your current financial position, investment objectives, and risk tolerance, we have developed a customized strategy designed to align your portfolio with your long-term goals while managing risk within your stated parameters.`,
        '',
        `Our analysis identified several opportunities to improve your portfolio's risk-adjusted return profile. The recommended changes involve strategic reallocation across asset classes, with an emphasis on diversification, tax efficiency, and cost optimization. We project these adjustments will improve your portfolio's expected annual return by approximately 40-80 basis points while maintaining a comparable level of risk.`,
        '',
        'The proposed fee structure reflects our commitment to transparent, value-aligned pricing. Our advisory fees are competitive within the industry and decrease at higher asset levels, ensuring that as your wealth grows, the cost of management becomes proportionally lower. All fees are clearly disclosed with no hidden charges or transaction-based commissions.',
        '',
        'We recommend implementing these changes through a phased transition plan over 4-6 weeks to minimize market impact and manage tax consequences. Our team will monitor the portfolio continuously and provide quarterly performance reviews against agreed-upon benchmarks.',
      ].join('\n')

    case 'current_situation':
      return [
        '## Current Situation Analysis',
        '',
        `### Portfolio Overview for ${clientName}`,
        '',
        'Our comprehensive review of your existing investment portfolio has identified the following key observations:',
        '',
        '**Current Allocation:**',
        '',
        '| Asset Class | Current Weight | Benchmark |',
        '|---|---|---|',
        '| US Equity | 40% | 35% |',
        '| International Equity | 15% | 20% |',
        '| Fixed Income | 30% | 25% |',
        '| Alternatives | 8% | 10% |',
        '| Real Assets | 4% | 5% |',
        '| Cash & Equivalents | 3% | 5% |',
        '',
        '**Identified Issues:**',
        '',
        '1. **Domestic concentration risk** — Your US equity allocation exceeds the target benchmark by 5 percentage points, creating geographic concentration that increases vulnerability to domestic economic downturns.',
        '',
        '2. **International underweight** — At 15%, your international equity exposure falls below the recommended 20%, missing diversification benefits from developed and emerging market economies with different economic cycles.',
        '',
        '3. **Fixed income overweight** — The current 30% fixed income allocation exceeds the target, which may be reducing long-term return potential given your time horizon and risk capacity.',
        '',
        '4. **Insufficient inflation hedge** — Real assets at 4% and alternatives at 8% are both below target, leaving the portfolio exposed to purchasing power erosion in higher-inflation environments.',
        '',
        '5. **Low cash buffer** — The 3% cash position is below the recommended 5%, which may force liquidation of invested positions if unexpected liquidity needs arise.',
      ].join('\n')

    case 'recommended_portfolio': {
      const allocations = template?.defaultAllocation ?? []
      const allocationRows = allocations.map(
        (a) =>
          `| ${a.assetClass} | ${(a.currentWeight * 100).toFixed(0)}% | ${(a.targetWeight * 100).toFixed(0)}% | ${a.currentWeight < a.targetWeight ? '+' : ''}${((a.targetWeight - a.currentWeight) * 100).toFixed(0)}% |`,
      )

      return [
        '## Recommended Portfolio',
        '',
        '### Strategic Asset Allocation',
        '',
        'The following allocation is designed to optimize your risk-adjusted returns based on your investment objectives, time horizon, and risk tolerance score:',
        '',
        '| Asset Class | Current | Proposed | Change |',
        '|---|---|---|---|',
        ...allocationRows,
        '',
        '### Implementation Rationale',
        '',
        ...allocations.map((a) => `**${a.assetClass}:** ${a.rationale}`),
        '',
        '### Transition Plan',
        '',
        'We recommend a phased implementation approach over 4-6 weeks:',
        '',
        '1. **Week 1-2:** Reduce overweight positions in US Equity and Fixed Income through systematic selling, prioritizing lots with favorable tax treatment.',
        '',
        '2. **Week 2-3:** Deploy proceeds into underweight asset classes, starting with International Equity and Alternatives using limit orders to manage execution costs.',
        '',
        '3. **Week 3-4:** Fine-tune Real Assets and Cash positions. Establish new positions in target vehicles identified through our due diligence process.',
        '',
        '4. **Week 4-6:** Final rebalancing to target weights. Confirm all positions are within acceptable drift bands (typically +/-2% per asset class).',
        '',
        'Tax impact of the transition has been estimated and will be reviewed with you prior to execution. Where possible, we will harvest losses to offset gains generated during the reallocation.',
      ].join('\n')
    }

    case 'fee_schedule': {
      const tiers = template?.feeTiers ?? []
      const tierRows = tiers.map((t) => {
        const max = t.maxAUM !== null ? `$${(t.maxAUM / 1_000_000).toFixed(0)}M` : '—'
        const min = `$${(t.minAUM / 1_000_000).toFixed(0)}M`
        return `| ${min} | ${max} | ${(t.rate * 100).toFixed(2)}% |`
      })

      return [
        '## Fee Schedule',
        '',
        '### Advisory Fee Structure',
        '',
        'Our fees are calculated as a percentage of assets under management (AUM) and are billed quarterly in arrears based on the average daily account balance:',
        '',
        '| AUM From | AUM To | Annual Rate |',
        '|---|---|---|',
        ...tierRows,
        '',
        '### Annual Cost Estimate',
        '',
        'Based on your current portfolio value, the estimated annual advisory fee is detailed in the table above. For a $5,000,000 portfolio, the blended annual fee would be approximately $40,250 (0.805% blended rate).',
        '',
        '### Fee Comparison',
        '',
        'Our fees are competitive with industry benchmarks:',
        '',
        '- **Industry average (RIA):** 1.00% – 1.25% for portfolios under $1M',
        '- **Wirehouse average:** 1.25% – 1.50% including platform fees',
        '- **iDeal Wealth Management:** Our tiered structure ensures fees decrease as your assets grow',
        '',
        '### What Is Included',
        '',
        '- Comprehensive financial planning and investment management',
        '- Quarterly portfolio reviews and performance reporting',
        '- Tax-loss harvesting and tax-efficient rebalancing',
        '- Access to institutional share classes and alternative investments',
        '- Dedicated advisor and client service team',
        '- No additional trading commissions or transaction fees',
        '',
        '*Fees do not include underlying fund expense ratios, which average 0.08% – 0.25% for the recommended vehicle lineup. Custodial fees are separate and charged directly by the custodian.*',
      ].join('\n')
    }

    case 'disclosures':
      return [
        '## Important Disclosures',
        '',
        '### Investment Risk Disclosure',
        '',
        'Investing involves risk, including the potential loss of principal. Past performance is not indicative of future results. The investment return and principal value of an investment will fluctuate so that shares, when redeemed, may be worth more or less than their original cost. There is no guarantee that any investment strategy will achieve its objectives.',
        '',
        '### Asset Class Specific Risks',
        '',
        '- **Equity investments** are subject to market risk, sector risk, and company-specific risk. International equities carry additional risks including currency fluctuation, political instability, and differences in accounting standards.',
        '- **Fixed income investments** are subject to interest rate risk, credit risk, and inflation risk. Bond prices generally decline when interest rates rise.',
        '- **Alternative investments** may involve leverage, limited liquidity, lack of transparency, and higher fees. They are generally suitable only for qualified investors.',
        '- **Real assets** including REITs and commodities are subject to sector-specific risks and may exhibit higher volatility than traditional investments.',
        '',
        '### Regulatory Disclosures',
        '',
        'iDeal Wealth Management is a registered investment advisor with the Securities and Exchange Commission (SEC). Registration does not imply a certain level of skill or training. A copy of our current Form ADV Part 2A (Firm Brochure) and Part 2B (Brochure Supplement) is available upon request or at [adviserinfo.sec.gov](https://adviserinfo.sec.gov).',
        '',
        'This proposal does not constitute an offer to sell or a solicitation of an offer to buy any securities. The information contained herein is for informational purposes only and should not be construed as legal, tax, or accounting advice. Clients are encouraged to consult with their own tax and legal advisors.',
        '',
        '### Conflicts of Interest',
        '',
        'As a fiduciary, we are obligated to act in your best interest. We do not receive commissions or compensation from third-party product providers. Our sole source of compensation is the advisory fee described in this proposal. Any potential conflicts of interest are disclosed in our Form ADV Part 2A.',
        '',
        '### Performance Reporting',
        '',
        'Portfolio performance is calculated using the time-weighted rate of return (TWR) methodology, net of advisory fees. Benchmark comparisons use the most appropriate index for each asset class and are provided for reference only. Actual results may differ from projected returns due to market conditions, timing of contributions and withdrawals, and other factors.',
        '',
        `*This document was generated on ${today} and reflects information available at that time. Investment recommendations are subject to change based on market conditions and changes in your financial situation.*`,
      ].join('\n')

    default:
      return ''
  }
}

export const complianceRules: {
  id: string
  rule: string
  description: string
  severity: 'critical' | 'moderate' | 'informational'
}[] = [
  {
    id: 'cr-001',
    rule: 'Suitability Assessment',
    description: 'Proposed allocation must align with the client\'s documented risk tolerance score and investment objectives. An aggressive growth portfolio is unsuitable for a conservative-rated client.',
    severity: 'critical',
  },
  {
    id: 'cr-002',
    rule: 'Concentration Limits',
    description: 'No single security position may exceed 10% of the total portfolio value. Sector and geographic concentration must remain within IPS-defined limits.',
    severity: 'moderate',
  },
  {
    id: 'cr-003',
    rule: 'Fee Reasonableness',
    description: 'Proposed advisory fees must fall within industry norms for the asset level and services provided. Total all-in costs (advisory + fund expenses) should not exceed 1.50% for standard portfolios.',
    severity: 'moderate',
  },
  {
    id: 'cr-004',
    rule: 'Required Disclosures',
    description: 'All mandatory disclosure sections must be present and current, including investment risks, conflicts of interest, regulatory registration, and fee transparency statements.',
    severity: 'critical',
  },
  {
    id: 'cr-005',
    rule: 'IPS Consistency',
    description: 'The recommended portfolio must be consistent with the client\'s Investment Policy Statement, including asset class constraints, liquidity requirements, and return objectives.',
    severity: 'moderate',
  },
  {
    id: 'cr-006',
    rule: 'Regulatory Filing Currency',
    description: 'Form ADV Part 2 reference must be current (updated within the last 12 months). Stale regulatory references may indicate outdated firm disclosures.',
    severity: 'informational',
  },
]
