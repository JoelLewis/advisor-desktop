---
name: wealth-management-domain
description: Use when writing financial advisor domain code, mock data, or UI text. Encodes wealth management terminology, regulatory context, and domain concepts for accuracy.
---

# Wealth Management Domain Knowledge

## Account Types & Tax Treatment

| Type | Tax Treatment | Key Rules |
|---|---|---|
| Individual | Taxable | Capital gains/losses, wash sale rules |
| Joint WROS | Taxable | Rights of survivorship, step-up basis at death |
| Joint TIC | Taxable | Tenants in common, no survivorship |
| Traditional IRA | Tax-deferred | RMDs at 73+, 10% early withdrawal penalty <59.5 |
| Roth IRA | Tax-free growth | No RMDs for owner, 5-year rule, income limits |
| SEP IRA | Tax-deferred | Self-employed, employer contributions only |
| 401(k) | Tax-deferred | Employer match, loan provisions, RMDs |
| Roth 401(k) | Tax-free growth | No income limits, RMDs (changing 2024+) |
| 529 | Tax-free for education | State tax deductions, superfunding, UGMA/UTMA rules |
| Trust (Revocable) | Grantor taxed | Avoids probate, full control |
| Trust (Irrevocable) | Trust taxed | Gift/estate planning, compressed brackets |
| UGMA/UTMA | Kiddie tax rules | Custodial, irrevocable gift |
| Entity (LLC/Corp) | Entity-level | Business accounts, operating agreements |

## Portfolio Concepts

### Drift Calculation
- **Drift** = |Actual Weight − Target Weight| per asset class
- **Total drift** = sum of all asset class drifts ÷ 2 (or max single drift)
- **Drift triggers**: typically 2-5% per asset class

### Rebalancing
- **Threshold rebalancing**: trigger when drift exceeds threshold
- **Calendar rebalancing**: quarterly/semi-annual/annual
- **Tax-aware rebalancing**: consider tax lots, wash sales, gain/loss budget
- **Cash flow rebalancing**: use inflows/outflows to reduce drift

### Tax-Loss Harvesting
- Sell position at a loss to offset gains
- **Wash sale rule**: cannot buy "substantially identical" security within 30 days before/after sale
- Replace with similar (not identical) ETF to maintain exposure
- Track harvested losses across all accounts in household

### UMA (Unified Managed Account)
- Single account with multiple "sleeves" managed by different strategies
- **Overlay manager**: coordinates across sleeves for tax efficiency
- Sleeves: Core equity, Core fixed income, Tactical, Alternatives, Cash
- Tax-lot assignment to sleeves

## Financial Planning

### Monte Carlo Simulation
- 1000+ randomized return scenarios
- Probability of success = % of scenarios meeting all goals
- **Display**: ≥90% green, 70-89% yellow, <70% red, N/A gray
- Per-goal AND aggregate probability

### Goal Types
- Retirement income, Education funding, Major purchase, Legacy/estate
- Each goal: target amount, time horizon, priority, funding source
- **Shortfall drivers**: market returns, inflation, spending rate, longevity

### Required Minimum Distributions (RMDs)
- Start at age 73 (SECURE 2.0)
- Calculated from prior year-end balance ÷ life expectancy factor
- Penalty: 25% of amount not distributed (reduced from 50%)

## Compliance & Regulatory

### SEC Rule 204-2 (Books and Records)
- All client communications must be archived (WORM storage)
- AI-generated content requires compliance review flag
- 5-year retention minimum

### Fiduciary Pre-Flight Checks
Before any trade: IPS constraints, concentration limits, restricted securities, client suitability, tax impact

### FINRA Requirements
- Suitability (Rule 2111) / Reg BI (Best Interest)
- Anti-money laundering (AML) monitoring
- Customer identification program (CIP)

## Client Lifecycle

### Segmentation Tiers
- **Platinum**: $10M+ AUM, dedicated team, quarterly reviews
- **Gold**: $2M-$10M, semi-annual reviews
- **Silver**: $500K-$2M, annual reviews
- **Bronze**: <$500K, digital-first service

### Household Composition
- Primary client + spouse/partner
- Related accounts (trust, entity, custodial)
- **Held-away assets**: 401(k)s, outside accounts, real estate, business interests
- **Consolidation opportunity**: calculate fee savings + tax efficiency of bringing held-away in-house

## Fee Structures

- **Tiered**: different rate per AUM band (e.g., 1% on first $1M, 0.75% on next $2M)
- **Flat**: single rate on total AUM
- **Breakpoints**: fee reduction at AUM thresholds
- **Billing cycle**: quarterly in advance/arrears
- **Proration**: new accounts billed from inception date

## NBA (Next Best Action) Scoring

Composite score from weighted factors:
- **Urgency** (30%): time-sensitivity, regulatory deadlines, market conditions
- **Impact** (25%): AUM affected, revenue impact, risk reduction
- **Efficiency** (20%): batch opportunity, automation potential, time-to-complete
- **Relationship** (15%): client tier, relationship health, recent interactions
- **Confidence** (10%): data quality, model certainty

### NBA Categories
- Rebalancing, Tax Management, Planning, Risk, Client Service, Compliance, Growth
