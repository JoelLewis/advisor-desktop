---
name: demo-data-generator
description: Use when generating mock data for AdvisorAI Desktop. Provides patterns for internally-consistent financial data, realistic naming, and proper domain values.
---

# Demo Data Generation Patterns

## Data Volume Targets

- 20 client profiles across 12 households
- 40+ accounts (mix of taxable, IRA, Roth, Trust, 401k, 529, entity)
- 500+ positions across all accounts
- 50+ NBAs (Next Best Actions)
- 2 weeks of calendar events
- 30+ activity items
- 10+ workflow items with process tracking

## Consistency Rules (CRITICAL)

### Portfolio Math
- `account.totalValue = sum(positions.marketValue)` for each account
- `household.totalAUM = sum(accounts.totalValue)` for managed accounts
- `position.marketValue = position.quantity * position.price`
- `position.weight = position.marketValue / account.totalValue`
- `position.gainLoss = position.marketValue - position.costBasis`
- `drift[assetClass] = |actualWeight - targetWeight|`

### Performance Math
- TWR compounds: `(1 + r1) * (1 + r2) * ... - 1`
- YTD return must be consistent with monthly returns
- 1Y, 3Y, 5Y, 10Y returns must be plausible for the strategy
- Benchmark comparison: within ±3% for well-managed portfolios
- Alpha = portfolio return - benchmark return

### Financial Planning
- Goal probability: 0-100%, displayed as percentage
- Sum of goal funding allocations should not exceed total portfolio
- Retirement: typically largest goal, 60-95% probability range
- Education: 2-8 year horizons, $50K-$400K targets

## Realistic Value Ranges

### AUM by Tier
- Platinum: $10M-$50M household AUM
- Gold: $2M-$10M
- Silver: $500K-$2M
- Bronze: $100K-$500K

### Account Sizes (typical)
- Individual/Joint brokerage: $500K-$5M
- Traditional IRA: $200K-$3M
- Roth IRA: $50K-$500K
- Trust: $1M-$20M
- 401(k) held-away: $200K-$2M
- 529: $20K-$200K

### Position Sizes
- Core holdings (ETFs): 5-25% of account
- Individual stocks: 1-8% of account
- Fixed income: 2-15% of account
- Alternatives: 2-10% of account
- Cash: 1-5% of account

## Naming Patterns

### Client Names (diverse, realistic)
Use a mix of ethnicities and name patterns:
- Robert & Patricia Johnson, Margaret Chen, David & Sarah Williams
- Michael & Jennifer Martinez, James Thompson, Richard & Susan Anderson
- The Patel Family Trust, The O'Brien Family, etc.

### Account Number Formats
- Brokerage: `XXX-XXXXXX` (e.g., `BRK-847291`)
- IRA: `IRA-XXXXXX` (e.g., `IRA-339201`)
- Trust: `TRU-XXXXXX`
- 401k: `K01-XXXXXX`
- 529: `529-XXXXXX`

### Security Names
Use real ticker symbols and names for realism:
- ETFs: SPY, IVV, VTI, QQQ, AGG, BND, VWO, EFA, TLT, GLD, VNQ
- Stocks: AAPL, MSFT, GOOGL, AMZN, NVDA, JPM, JNJ, PG, V, UNH
- Bonds: Various Treasury, Corporate, Municipal descriptions
- Alternatives: PIMCO, Blackrock, Vanguard fund names

## NBA Generation

### Categories & Examples
- **Rebalancing**: "Portfolio drift exceeds 3% threshold" — batch when ≥3 clients
- **Tax Management**: "Tax-loss harvesting opportunity in [security]", "Wash sale risk"
- **Planning**: "RMD deadline approaching", "Goal probability dropped below 80%"
- **Risk**: "Concentration >10% in single stock", "Duration mismatch"
- **Client Service**: "Birthday in 7 days", "Annual review due", "Life event detected"
- **Compliance**: "IPS review overdue", "Large transaction alert"
- **Growth**: "Consolidation opportunity — $500K held away", "Referral follow-up"

### Grouping Logic
- If ≥3 clients need same action type → create group NBA
- Group title: "Batch Rebalance — 7 portfolios exceeding drift threshold"
- Each client shown as chip, expandable to see individual details

### Priority Assignment
- **Critical** (red): regulatory deadline, compliance breach, >5% drift
- **High** (orange): tax deadline, significant opportunity, client event
- **Medium** (yellow): routine rebalancing, review due, optimization
- **Low** (gray): informational, nice-to-have, low-impact

## Workflow Data

### Account Opening Pipeline (10 steps)
1. Application Received → 2. Identity Verification → 3. Compliance Review →
4. Account Approved → 5. Funding Instructions Sent → 6. Initial Deposit Received →
7. Model Assignment → 8. Initial Investment → 9. Paperwork Filed → 10. Welcome Package

Each step: status (completed/current/pending), timestamp, responsible party, SLA (hours)

### NIGO (Not In Good Order) Examples
- Missing signature on page 3
- Expired ID — need current government-issued ID
- Beneficiary designation incomplete
- Address mismatch between application and ID

## Time-Series Data

### Performance History
Generate monthly returns that:
- Show realistic volatility (equity: ±2-5%/month, bonds: ±0.5-1.5%/month)
- Include a drawdown period (demonstrates risk management value)
- Have slight positive bias long-term (4-8% annualized equity, 2-4% bonds)
- Correlate with benchmark but with tracking error

### Activity Timeline
Mix of:
- System events (trade executed, rebalance completed, document signed)
- Client events (meeting held, email sent, call logged)
- AI events (NBA generated, insight created, document drafted)
- Compliance events (review completed, alert resolved)
