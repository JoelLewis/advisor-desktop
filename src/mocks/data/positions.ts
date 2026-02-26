import type { Position } from '@/types/portfolio'

// Positions for Johnson Family Trust (acc-001, $8.2M)
// Also used as representative data for other accounts via generatePositions()
const trustPositions: Position[] = [
  { id: 'pos-001', accountId: 'acc-001', symbol: 'VTI', name: 'Vanguard Total Stock Market ETF', assetClass: 'us_equity', quantity: 8500, price: 268.50, costBasis: 1_850_000, marketValue: 2_282_250, weight: 0.278, gainLoss: 432_250, gainLossPercent: 0.234 },
  { id: 'pos-002', accountId: 'acc-001', symbol: 'AAPL', name: 'Apple Inc.', assetClass: 'us_equity', quantity: 3200, price: 195.40, costBasis: 480_000, marketValue: 625_280, weight: 0.076, gainLoss: 145_280, gainLossPercent: 0.303 },
  { id: 'pos-003', accountId: 'acc-001', symbol: 'MSFT', name: 'Microsoft Corp.', assetClass: 'us_equity', quantity: 1800, price: 420.15, costBasis: 540_000, marketValue: 756_270, weight: 0.092, gainLoss: 216_270, gainLossPercent: 0.400 },
  { id: 'pos-004', accountId: 'acc-001', symbol: 'NVDA', name: 'NVIDIA Corp.', assetClass: 'us_equity', quantity: 250, price: 780.00, costBasis: 125_000, marketValue: 195_000, weight: 0.024, gainLoss: 70_000, gainLossPercent: 0.560 },
  { id: 'pos-005', accountId: 'acc-001', symbol: 'EFA', name: 'iShares MSCI EAFE ETF', assetClass: 'intl_equity', quantity: 6500, price: 82.30, costBasis: 490_000, marketValue: 534_950, weight: 0.065, gainLoss: 44_950, gainLossPercent: 0.092 },
  { id: 'pos-006', accountId: 'acc-001', symbol: 'VWO', name: 'Vanguard FTSE Emerging Markets ETF', assetClass: 'emerging_markets', quantity: 4200, price: 44.80, costBasis: 180_000, marketValue: 188_160, weight: 0.023, gainLoss: 8_160, gainLossPercent: 0.045 },
  { id: 'pos-007', accountId: 'acc-001', symbol: 'AGG', name: 'iShares Core US Aggregate Bond ETF', assetClass: 'fixed_income', quantity: 12000, price: 98.50, costBasis: 1_200_000, marketValue: 1_182_000, weight: 0.144, gainLoss: -18_000, gainLossPercent: -0.015 },
  { id: 'pos-008', accountId: 'acc-001', symbol: 'BND', name: 'Vanguard Total Bond Market ETF', assetClass: 'fixed_income', quantity: 8500, price: 72.40, costBasis: 630_000, marketValue: 615_400, weight: 0.075, gainLoss: -14_600, gainLossPercent: -0.023 },
  { id: 'pos-009', accountId: 'acc-001', symbol: 'TLT', name: 'iShares 20+ Year Treasury Bond ETF', assetClass: 'fixed_income', quantity: 5200, price: 95.80, costBasis: 520_000, marketValue: 498_160, weight: 0.061, gainLoss: -21_840, gainLossPercent: -0.042 },
  { id: 'pos-010', accountId: 'acc-001', symbol: 'GLD', name: 'SPDR Gold Shares', assetClass: 'commodities', quantity: 1500, price: 215.60, costBasis: 280_000, marketValue: 323_400, weight: 0.039, gainLoss: 43_400, gainLossPercent: 0.155 },
  { id: 'pos-011', accountId: 'acc-001', symbol: 'VNQ', name: 'Vanguard Real Estate ETF', assetClass: 'real_estate', quantity: 3800, price: 89.20, costBasis: 320_000, marketValue: 338_960, weight: 0.041, gainLoss: 18_960, gainLossPercent: 0.059 },
  { id: 'pos-012', accountId: 'acc-001', symbol: 'CASH', name: 'Money Market Fund', assetClass: 'cash', quantity: 1, price: 660_170, costBasis: 660_170, marketValue: 660_170, weight: 0.081, gainLoss: 0, gainLossPercent: 0 },
]

// Robert Johnson Individual (acc-002, $4.5M) — growth tilt with digital assets & PE
const robertIndividualPositions: Position[] = [
  { id: 'pos-020', accountId: 'acc-002', symbol: 'SPY', name: 'SPDR S&P 500 ETF', assetClass: 'us_equity', quantity: 4200, price: 520.30, costBasis: 1_800_000, marketValue: 2_185_260, weight: 0.452, gainLoss: 385_260, gainLossPercent: 0.214 },
  { id: 'pos-021', accountId: 'acc-002', symbol: 'QQQ', name: 'Invesco QQQ Trust', assetClass: 'us_equity', quantity: 1800, price: 485.20, costBasis: 680_000, marketValue: 873_360, weight: 0.181, gainLoss: 193_360, gainLossPercent: 0.284 },
  { id: 'pos-022', accountId: 'acc-002', symbol: 'EFA', name: 'iShares MSCI EAFE ETF', assetClass: 'intl_equity', quantity: 4500, price: 82.30, costBasis: 350_000, marketValue: 370_350, weight: 0.077, gainLoss: 20_350, gainLossPercent: 0.058 },
  { id: 'pos-023', accountId: 'acc-002', symbol: 'INTC', name: 'Intel Corp.', assetClass: 'us_equity', quantity: 12000, price: 28.45, costBasis: 420_000, marketValue: 341_400, weight: 0.071, gainLoss: -78_600, gainLossPercent: -0.187 },
  { id: 'pos-024', accountId: 'acc-002', symbol: 'AGG', name: 'iShares Core US Aggregate Bond ETF', assetClass: 'fixed_income', quantity: 5500, price: 98.50, costBasis: 545_000, marketValue: 541_750, weight: 0.112, gainLoss: -3_250, gainLossPercent: -0.006 },
  { id: 'pos-026', accountId: 'acc-002', symbol: 'IBIT', name: 'iShares Bitcoin Trust ETF', assetClass: 'digital_assets', quantity: 3500, price: 52.80, costBasis: 140_000, marketValue: 184_800, weight: 0.038, gainLoss: 44_800, gainLossPercent: 0.320 },
  { id: 'pos-027', accountId: 'acc-002', symbol: 'ETHE', name: 'iShares Ethereum Trust ETF', assetClass: 'digital_assets', quantity: 4200, price: 18.45, costBasis: 65_000, marketValue: 77_490, weight: 0.016, gainLoss: 12_490, gainLossPercent: 0.192 },
  { id: 'pos-028', accountId: 'acc-002', symbol: 'BXPE', name: 'Blackstone Private Equity Fund', assetClass: 'private_equity', quantity: 1200, price: 108.50, costBasis: 115_000, marketValue: 130_200, weight: 0.027, gainLoss: 15_200, gainLossPercent: 0.132 },
  { id: 'pos-025', accountId: 'acc-002', symbol: 'CASH', name: 'Money Market Fund', assetClass: 'cash', quantity: 1, price: 127_390, costBasis: 127_390, marketValue: 127_390, weight: 0.026, gainLoss: 0, gainLossPercent: 0 },
]

export const allPositions: Position[] = [
  ...trustPositions,
  ...robertIndividualPositions,
]

// Generate positions for a given account (for accounts without explicit positions)
export function getPositionsForAccount(accountId: string, totalValue: number): Position[] {
  const explicit = allPositions.filter((p) => p.accountId === accountId)
  if (explicit.length > 0) return explicit

  // Generate representative positions based on account value
  const cash = totalValue * 0.02
  const equity = totalValue * 0.58
  const bonds = totalValue * 0.35
  const other = totalValue * 0.05

  return [
    { id: `gen-${accountId}-1`, accountId, symbol: 'VTI', name: 'Vanguard Total Stock Market ETF', assetClass: 'us_equity', quantity: Math.round(equity * 0.6 / 268.5), price: 268.50, costBasis: equity * 0.55, marketValue: equity * 0.6, weight: 0.348, gainLoss: equity * 0.05, gainLossPercent: 0.091 },
    { id: `gen-${accountId}-2`, accountId, symbol: 'EFA', name: 'iShares MSCI EAFE ETF', assetClass: 'intl_equity', quantity: Math.round(equity * 0.25 / 82.3), price: 82.30, costBasis: equity * 0.23, marketValue: equity * 0.25, weight: 0.145, gainLoss: equity * 0.02, gainLossPercent: 0.087 },
    { id: `gen-${accountId}-3`, accountId, symbol: 'QQQ', name: 'Invesco QQQ Trust', assetClass: 'us_equity', quantity: Math.round(equity * 0.15 / 485.2), price: 485.20, costBasis: equity * 0.12, marketValue: equity * 0.15, weight: 0.087, gainLoss: equity * 0.03, gainLossPercent: 0.250 },
    { id: `gen-${accountId}-4`, accountId, symbol: 'AGG', name: 'iShares Core US Aggregate Bond ETF', assetClass: 'fixed_income', quantity: Math.round(bonds * 0.6 / 98.5), price: 98.50, costBasis: bonds * 0.62, marketValue: bonds * 0.6, weight: 0.210, gainLoss: -bonds * 0.02, gainLossPercent: -0.032 },
    { id: `gen-${accountId}-5`, accountId, symbol: 'BND', name: 'Vanguard Total Bond Market ETF', assetClass: 'fixed_income', quantity: Math.round(bonds * 0.4 / 72.4), price: 72.40, costBasis: bonds * 0.41, marketValue: bonds * 0.4, weight: 0.140, gainLoss: -bonds * 0.01, gainLossPercent: -0.024 },
    { id: `gen-${accountId}-6`, accountId, symbol: 'GLD', name: 'SPDR Gold Shares', assetClass: 'commodities', quantity: Math.round(other / 215.6), price: 215.60, costBasis: other * 0.9, marketValue: other, weight: 0.050, gainLoss: other * 0.1, gainLossPercent: 0.111 },
    { id: `gen-${accountId}-7`, accountId, symbol: 'CASH', name: 'Money Market Fund', assetClass: 'cash', quantity: 1, price: cash, costBasis: cash, marketValue: cash, weight: 0.020, gainLoss: 0, gainLossPercent: 0 },
  ]
}
