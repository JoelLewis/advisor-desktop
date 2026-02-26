---
name: mock-consistency-checker
description: Use when adding or modifying mock data to validate that portfolio math, performance calculations, and domain invariants are internally consistent across all mock data files
---

# Mock Data Consistency Checker

Validates that all mock data in `src/mocks/data/` satisfies the domain invariants defined in CLAUDE.md.

## When to Run

- After creating or editing any file in `src/mocks/data/`
- After modifying MSW handlers that transform mock data
- Before committing changes that touch mock data

## Validation Rules

### 1. Portfolio Math

**Positions → Account**
```
account.totalValue == sum(position.marketValue) for each account
position.marketValue == position.quantity * position.price
position.weight == position.marketValue / account.totalValue  (tolerance: ±0.01)
position.gainLoss == position.marketValue - position.costBasis
```

**Accounts → Household**
```
household.totalAUM == sum(account.totalValue) for managed accounts in household
```

**Drift**
```
drift[assetClass] == |actualWeight - targetWeight|
actualWeight == sum(positions in assetClass) / account.totalValue
```

### 2. Performance Math

**TWR Compounding**
```
ytdReturn == product(1 + monthlyReturn[i] for i in ytdMonths) - 1
```

Verify:
- Monthly returns compound to reported period returns (1Y, 3Y, 5Y)
- Benchmark comparison within ±5% for well-managed portfolios
- Alpha == portfolioReturn - benchmarkReturn

### 3. Financial Planning

- Goal probability: 0-100 range
- Sum of goal funding allocations <= total portfolio value
- RMD calculations use correct age thresholds (73+ per SECURE 2.0)

### 4. NBA Grouping

- If 3+ clients share the same NBA action type, a batch NBA should exist
- Batch NBA title references the count accurately
- Each individual client in the batch also has the corresponding individual NBA or is referenced in the batch

### 5. Referential Integrity

- Every `clientId` in positions/documents/notes/activities references an existing client
- Every `accountId` in positions/orders/tax-lots references an existing account
- Every `householdId` references an existing household
- Account `clientId` matches a client in the same household

### 6. ID Format

- Client IDs: `client-NNN`
- Account IDs: `acc-NNN`
- Household IDs: `hh-NNN`
- Document IDs: `doc-NNN`
- Position IDs: contextual but prefixed

## Validation Procedure

1. **Read all mock data files** in `src/mocks/data/`
2. **Build reference maps**: clientId → client, accountId → account, householdId → household
3. **Check referential integrity** (rule 5) — flag orphaned references
4. **Validate portfolio math** (rule 1) — compute expected values, compare to stored values
5. **Validate performance** (rule 2) — compound monthly returns, compare to period returns
6. **Check planning data** (rule 3) — goal probabilities and funding allocations
7. **Check NBA grouping** (rule 4) — count clients per action type
8. **Report** — list all violations with file, field, expected vs actual

## Output Format

For each violation:
```
[FAIL] <rule> | <file>: <description>
  Expected: <value>
  Actual:   <value>
```

If all pass:
```
[PASS] All mock data consistency checks passed (N rules checked across M files)
```

## Tolerance

- Currency values: ±$0.01
- Percentages/weights: ±0.01 (1 basis point)
- Performance returns: ±0.001 (0.1%)
