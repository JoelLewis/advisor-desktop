import type { Position } from '@/types/portfolio'

// ─── acc-001: Johnson Family Trust ($8.2M, mod-001 Balanced Growth) ──────────
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

// ─── acc-002: Robert Johnson Individual ($4.5M, mod-002 Growth) ─────────────
// Growth tilt with digital assets, PE, and INTC loss position (TLH candidate)
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

// ─── acc-003: Robert Johnson Traditional IRA ($3.55M, mod-003 Conservative Income) ──
// RMD planning narrative: heavy fixed income (55%), conservative for Required Minimum Distributions
const robertTraditionalIRAPositions: Position[] = [
  { id: 'pos-030', accountId: 'acc-003', symbol: 'VTI', name: 'Vanguard Total Stock Market ETF', assetClass: 'us_equity', quantity: 2600, price: 268.50, costBasis: 640_000, marketValue: 698_100, weight: 0.197, gainLoss: 58_100, gainLossPercent: 0.091 },
  { id: 'pos-031', accountId: 'acc-003', symbol: 'EFA', name: 'iShares MSCI EAFE ETF', assetClass: 'intl_equity', quantity: 2200, price: 82.30, costBasis: 175_000, marketValue: 181_060, weight: 0.051, gainLoss: 6_060, gainLossPercent: 0.035 },
  { id: 'pos-032', accountId: 'acc-003', symbol: 'AGG', name: 'iShares Core US Aggregate Bond ETF', assetClass: 'fixed_income', quantity: 7500, price: 98.50, costBasis: 750_000, marketValue: 738_750, weight: 0.208, gainLoss: -11_250, gainLossPercent: -0.015 },
  { id: 'pos-033', accountId: 'acc-003', symbol: 'BND', name: 'Vanguard Total Bond Market ETF', assetClass: 'fixed_income', quantity: 5500, price: 72.40, costBasis: 405_000, marketValue: 398_200, weight: 0.112, gainLoss: -6_800, gainLossPercent: -0.017 },
  { id: 'pos-034', accountId: 'acc-003', symbol: 'TLT', name: 'iShares 20+ Year Treasury Bond ETF', assetClass: 'fixed_income', quantity: 4200, price: 95.80, costBasis: 415_000, marketValue: 402_360, weight: 0.113, gainLoss: -12_640, gainLossPercent: -0.030 },
  { id: 'pos-035', accountId: 'acc-003', symbol: 'TIP', name: 'iShares TIPS Bond ETF', assetClass: 'fixed_income', quantity: 3700, price: 110.80, costBasis: 415_000, marketValue: 409_960, weight: 0.115, gainLoss: -5_040, gainLossPercent: -0.012 },
  { id: 'pos-036', accountId: 'acc-003', symbol: 'QAI', name: 'IQ Hedge Multi-Strategy Tracker ETF', assetClass: 'alternatives', quantity: 5000, price: 35.20, costBasis: 180_000, marketValue: 176_000, weight: 0.050, gainLoss: -4_000, gainLossPercent: -0.022 },
  { id: 'pos-037', accountId: 'acc-003', symbol: 'VNQ', name: 'Vanguard Real Estate ETF', assetClass: 'real_estate', quantity: 2000, price: 89.20, costBasis: 170_000, marketValue: 178_400, weight: 0.050, gainLoss: 8_400, gainLossPercent: 0.049 },
  { id: 'pos-038', accountId: 'acc-003', symbol: 'CASH', name: 'Money Market Fund', assetClass: 'cash', quantity: 1, price: 367_170, costBasis: 367_170, marketValue: 367_170, weight: 0.103, gainLoss: 0, gainLossPercent: 0 },
]

// ─── acc-006: Chen Irrevocable Trust ($12M, mod-005 Ultra-HNW Multi-Strategy) ──
// Ultra-HNW batch rebalance: multi-strategy with alternatives, hedge fund proxies, intl equity
const chenTrustPositions: Position[] = [
  { id: 'pos-050', accountId: 'acc-006', symbol: 'SPY', name: 'SPDR S&P 500 ETF', assetClass: 'us_equity', quantity: 3800, price: 520.30, costBasis: 1_750_000, marketValue: 1_977_140, weight: 0.165, gainLoss: 227_140, gainLossPercent: 0.130 },
  { id: 'pos-051', accountId: 'acc-006', symbol: 'QQQ', name: 'Invesco QQQ Trust', assetClass: 'us_equity', quantity: 1200, price: 485.20, costBasis: 480_000, marketValue: 582_240, weight: 0.049, gainLoss: 102_240, gainLossPercent: 0.213 },
  { id: 'pos-052', accountId: 'acc-006', symbol: 'VTI', name: 'Vanguard Total Stock Market ETF', assetClass: 'us_equity', quantity: 5800, price: 268.50, costBasis: 1_400_000, marketValue: 1_557_300, weight: 0.130, gainLoss: 157_300, gainLossPercent: 0.112 },
  { id: 'pos-053', accountId: 'acc-006', symbol: 'EFA', name: 'iShares MSCI EAFE ETF', assetClass: 'intl_equity', quantity: 14500, price: 82.30, costBasis: 1_100_000, marketValue: 1_193_350, weight: 0.099, gainLoss: 93_350, gainLossPercent: 0.085 },
  { id: 'pos-054', accountId: 'acc-006', symbol: 'VXUS', name: 'Vanguard Total International Stock ETF', assetClass: 'intl_equity', quantity: 8500, price: 60.40, costBasis: 480_000, marketValue: 513_400, weight: 0.043, gainLoss: 33_400, gainLossPercent: 0.070 },
  { id: 'pos-055', accountId: 'acc-006', symbol: 'VWO', name: 'Vanguard FTSE Emerging Markets ETF', assetClass: 'emerging_markets', quantity: 14000, price: 44.80, costBasis: 600_000, marketValue: 627_200, weight: 0.052, gainLoss: 27_200, gainLossPercent: 0.045 },
  { id: 'pos-056', accountId: 'acc-006', symbol: 'AGG', name: 'iShares Core US Aggregate Bond ETF', assetClass: 'fixed_income', quantity: 12000, price: 98.50, costBasis: 1_200_000, marketValue: 1_182_000, weight: 0.099, gainLoss: -18_000, gainLossPercent: -0.015 },
  { id: 'pos-057', accountId: 'acc-006', symbol: 'BNDX', name: 'Vanguard Total International Bond ETF', assetClass: 'fixed_income', quantity: 12000, price: 50.80, costBasis: 620_000, marketValue: 609_600, weight: 0.051, gainLoss: -10_400, gainLossPercent: -0.017 },
  { id: 'pos-058', accountId: 'acc-006', symbol: 'LQD', name: 'iShares iBoxx $ Investment Grade Corp Bond ETF', assetClass: 'fixed_income', quantity: 5000, price: 113.40, costBasis: 575_000, marketValue: 567_000, weight: 0.047, gainLoss: -8_000, gainLossPercent: -0.014 },
  { id: 'pos-059', accountId: 'acc-006', symbol: 'BXPE', name: 'Blackstone Private Equity Fund', assetClass: 'private_equity', quantity: 5000, price: 108.50, costBasis: 500_000, marketValue: 542_500, weight: 0.045, gainLoss: 42_500, gainLossPercent: 0.085 },
  { id: 'pos-060', accountId: 'acc-006', symbol: 'QAI', name: 'IQ Hedge Multi-Strategy Tracker ETF', assetClass: 'alternatives', quantity: 30000, price: 35.20, costBasis: 1_030_000, marketValue: 1_056_000, weight: 0.088, gainLoss: 26_000, gainLossPercent: 0.025 },
  { id: 'pos-061', accountId: 'acc-006', symbol: 'VNQ', name: 'Vanguard Real Estate ETF', assetClass: 'real_estate', quantity: 6500, price: 89.20, costBasis: 540_000, marketValue: 579_800, weight: 0.048, gainLoss: 39_800, gainLossPercent: 0.074 },
  { id: 'pos-062', accountId: 'acc-006', symbol: 'CASH', name: 'Money Market Fund', assetClass: 'cash', quantity: 1, price: 1_012_470, costBasis: 1_012_470, marketValue: 1_012_470, weight: 0.084, gainLoss: 0, gainLossPercent: 0 },
]

// ─── acc-011: David Williams Individual ($2.8M, mod-002 Growth) ─────────────
// NVDA >12% concentration breach + INTC tax-loss harvesting candidate
const davidWilliamsPositions: Position[] = [
  { id: 'pos-070', accountId: 'acc-011', symbol: 'NVDA', name: 'NVIDIA Corp.', assetClass: 'us_equity', quantity: 500, price: 780.00, costBasis: 180_000, marketValue: 390_000, weight: 0.139, gainLoss: 210_000, gainLossPercent: 1.167 },
  { id: 'pos-071', accountId: 'acc-011', symbol: 'VTI', name: 'Vanguard Total Stock Market ETF', assetClass: 'us_equity', quantity: 2200, price: 268.50, costBasis: 520_000, marketValue: 590_700, weight: 0.211, gainLoss: 70_700, gainLossPercent: 0.136 },
  { id: 'pos-072', accountId: 'acc-011', symbol: 'SPY', name: 'SPDR S&P 500 ETF', assetClass: 'us_equity', quantity: 800, price: 520.30, costBasis: 380_000, marketValue: 416_240, weight: 0.149, gainLoss: 36_240, gainLossPercent: 0.095 },
  { id: 'pos-073', accountId: 'acc-011', symbol: 'INTC', name: 'Intel Corp.', assetClass: 'us_equity', quantity: 8000, price: 28.45, costBasis: 280_000, marketValue: 227_600, weight: 0.081, gainLoss: -52_400, gainLossPercent: -0.187 },
  { id: 'pos-074', accountId: 'acc-011', symbol: 'EFA', name: 'iShares MSCI EAFE ETF', assetClass: 'intl_equity', quantity: 4800, price: 82.30, costBasis: 370_000, marketValue: 395_040, weight: 0.141, gainLoss: 25_040, gainLossPercent: 0.068 },
  { id: 'pos-075', accountId: 'acc-011', symbol: 'VWO', name: 'Vanguard FTSE Emerging Markets ETF', assetClass: 'emerging_markets', quantity: 3000, price: 44.80, costBasis: 128_000, marketValue: 134_400, weight: 0.048, gainLoss: 6_400, gainLossPercent: 0.050 },
  { id: 'pos-076', accountId: 'acc-011', symbol: 'AGG', name: 'iShares Core US Aggregate Bond ETF', assetClass: 'fixed_income', quantity: 3500, price: 98.50, costBasis: 350_000, marketValue: 344_750, weight: 0.123, gainLoss: -5_250, gainLossPercent: -0.015 },
  { id: 'pos-077', accountId: 'acc-011', symbol: 'GLD', name: 'SPDR Gold Shares', assetClass: 'commodities', quantity: 350, price: 215.60, costBasis: 68_000, marketValue: 75_460, weight: 0.027, gainLoss: 7_460, gainLossPercent: 0.110 },
  { id: 'pos-078', accountId: 'acc-011', symbol: 'QAI', name: 'IQ Hedge Multi-Strategy Tracker ETF', assetClass: 'alternatives', quantity: 3000, price: 35.20, costBasis: 108_000, marketValue: 105_600, weight: 0.038, gainLoss: -2_400, gainLossPercent: -0.022 },
  { id: 'pos-079', accountId: 'acc-011', symbol: 'CASH', name: 'Money Market Fund', assetClass: 'cash', quantity: 1, price: 120_210, costBasis: 120_210, marketValue: 120_210, weight: 0.043, gainLoss: 0, gainLossPercent: 0 },
]

// ─── acc-015: Michael Martinez Individual ($4.2M, mod-002 Growth) ────────────
// INTC loss position for tax-loss harvesting opportunity
const michaelMartinezPositions: Position[] = [
  { id: 'pos-080', accountId: 'acc-015', symbol: 'VTI', name: 'Vanguard Total Stock Market ETF', assetClass: 'us_equity', quantity: 3800, price: 268.50, costBasis: 920_000, marketValue: 1_020_300, weight: 0.243, gainLoss: 100_300, gainLossPercent: 0.109 },
  { id: 'pos-081', accountId: 'acc-015', symbol: 'SPY', name: 'SPDR S&P 500 ETF', assetClass: 'us_equity', quantity: 1500, price: 520.30, costBasis: 700_000, marketValue: 780_450, weight: 0.186, gainLoss: 80_450, gainLossPercent: 0.115 },
  { id: 'pos-082', accountId: 'acc-015', symbol: 'INTC', name: 'Intel Corp.', assetClass: 'us_equity', quantity: 15000, price: 28.45, costBasis: 520_000, marketValue: 426_750, weight: 0.102, gainLoss: -93_250, gainLossPercent: -0.179 },
  { id: 'pos-083', accountId: 'acc-015', symbol: 'MSFT', name: 'Microsoft Corp.', assetClass: 'us_equity', quantity: 300, price: 420.15, costBasis: 115_000, marketValue: 126_045, weight: 0.030, gainLoss: 11_045, gainLossPercent: 0.096 },
  { id: 'pos-084', accountId: 'acc-015', symbol: 'EFA', name: 'iShares MSCI EAFE ETF', assetClass: 'intl_equity', quantity: 7000, price: 82.30, costBasis: 540_000, marketValue: 576_100, weight: 0.137, gainLoss: 36_100, gainLossPercent: 0.067 },
  { id: 'pos-085', accountId: 'acc-015', symbol: 'VWO', name: 'Vanguard FTSE Emerging Markets ETF', assetClass: 'emerging_markets', quantity: 4500, price: 44.80, costBasis: 190_000, marketValue: 201_600, weight: 0.048, gainLoss: 11_600, gainLossPercent: 0.061 },
  { id: 'pos-086', accountId: 'acc-015', symbol: 'AGG', name: 'iShares Core US Aggregate Bond ETF', assetClass: 'fixed_income', quantity: 5500, price: 98.50, costBasis: 550_000, marketValue: 541_750, weight: 0.129, gainLoss: -8_250, gainLossPercent: -0.015 },
  { id: 'pos-087', accountId: 'acc-015', symbol: 'BND', name: 'Vanguard Total Bond Market ETF', assetClass: 'fixed_income', quantity: 2500, price: 72.40, costBasis: 185_000, marketValue: 181_000, weight: 0.043, gainLoss: -4_000, gainLossPercent: -0.022 },
  { id: 'pos-088', accountId: 'acc-015', symbol: 'QAI', name: 'IQ Hedge Multi-Strategy Tracker ETF', assetClass: 'alternatives', quantity: 4500, price: 35.20, costBasis: 162_000, marketValue: 158_400, weight: 0.038, gainLoss: -3_600, gainLossPercent: -0.022 },
  { id: 'pos-089', accountId: 'acc-015', symbol: 'GLD', name: 'SPDR Gold Shares', assetClass: 'commodities', quantity: 400, price: 215.60, costBasis: 78_000, marketValue: 86_240, weight: 0.021, gainLoss: 8_240, gainLossPercent: 0.106 },
  { id: 'pos-090', accountId: 'acc-015', symbol: 'CASH', name: 'Money Market Fund', assetClass: 'cash', quantity: 1, price: 101_365, costBasis: 101_365, marketValue: 101_365, weight: 0.024, gainLoss: 0, gainLossPercent: 0 },
]

// ─── acc-020: James Thompson Traditional IRA ($2.2M, mod-003 Conservative Income) ──
// RMD deadline approaching (age 68→73), conservative bond-heavy
const jamesThompsonIRAPositions: Position[] = [
  { id: 'pos-100', accountId: 'acc-020', symbol: 'VTI', name: 'Vanguard Total Stock Market ETF', assetClass: 'us_equity', quantity: 1600, price: 268.50, costBasis: 400_000, marketValue: 429_600, weight: 0.195, gainLoss: 29_600, gainLossPercent: 0.074 },
  { id: 'pos-101', accountId: 'acc-020', symbol: 'EFA', name: 'iShares MSCI EAFE ETF', assetClass: 'intl_equity', quantity: 1400, price: 82.30, costBasis: 110_000, marketValue: 115_220, weight: 0.052, gainLoss: 5_220, gainLossPercent: 0.047 },
  { id: 'pos-102', accountId: 'acc-020', symbol: 'AGG', name: 'iShares Core US Aggregate Bond ETF', assetClass: 'fixed_income', quantity: 5000, price: 98.50, costBasis: 500_000, marketValue: 492_500, weight: 0.224, gainLoss: -7_500, gainLossPercent: -0.015 },
  { id: 'pos-103', accountId: 'acc-020', symbol: 'BND', name: 'Vanguard Total Bond Market ETF', assetClass: 'fixed_income', quantity: 3000, price: 72.40, costBasis: 220_000, marketValue: 217_200, weight: 0.099, gainLoss: -2_800, gainLossPercent: -0.013 },
  { id: 'pos-104', accountId: 'acc-020', symbol: 'TLT', name: 'iShares 20+ Year Treasury Bond ETF', assetClass: 'fixed_income', quantity: 2800, price: 95.80, costBasis: 278_000, marketValue: 268_240, weight: 0.122, gainLoss: -9_760, gainLossPercent: -0.035 },
  { id: 'pos-105', accountId: 'acc-020', symbol: 'MUB', name: 'iShares National Muni Bond ETF', assetClass: 'fixed_income', quantity: 2200, price: 110.80, costBasis: 248_000, marketValue: 243_760, weight: 0.111, gainLoss: -4_240, gainLossPercent: -0.017 },
  { id: 'pos-106', accountId: 'acc-020', symbol: 'QAI', name: 'IQ Hedge Multi-Strategy Tracker ETF', assetClass: 'alternatives', quantity: 3000, price: 35.20, costBasis: 108_000, marketValue: 105_600, weight: 0.048, gainLoss: -2_400, gainLossPercent: -0.022 },
  { id: 'pos-107', accountId: 'acc-020', symbol: 'VNQ', name: 'Vanguard Real Estate ETF', assetClass: 'real_estate', quantity: 1200, price: 89.20, costBasis: 100_000, marketValue: 107_040, weight: 0.049, gainLoss: 7_040, gainLossPercent: 0.070 },
  { id: 'pos-108', accountId: 'acc-020', symbol: 'CASH', name: 'Money Market Fund', assetClass: 'cash', quantity: 1, price: 220_840, costBasis: 220_840, marketValue: 220_840, weight: 0.100, gainLoss: 0, gainLossPercent: 0 },
]

// ─── acc-029: Patel 529 Education ($600K, mod-006 Education) ────────────────
// Age-based glide path with target-date logic for education goal
const patel529Positions: Position[] = [
  { id: 'pos-120', accountId: 'acc-029', symbol: 'VTI', name: 'Vanguard Total Stock Market ETF', assetClass: 'us_equity', quantity: 700, price: 268.50, costBasis: 170_000, marketValue: 187_950, weight: 0.313, gainLoss: 17_950, gainLossPercent: 0.106 },
  { id: 'pos-121', accountId: 'acc-029', symbol: 'QQQ', name: 'Invesco QQQ Trust', assetClass: 'us_equity', quantity: 150, price: 485.20, costBasis: 65_000, marketValue: 72_780, weight: 0.121, gainLoss: 7_780, gainLossPercent: 0.120 },
  { id: 'pos-122', accountId: 'acc-029', symbol: 'EFA', name: 'iShares MSCI EAFE ETF', assetClass: 'intl_equity', quantity: 800, price: 82.30, costBasis: 62_000, marketValue: 65_840, weight: 0.110, gainLoss: 3_840, gainLossPercent: 0.062 },
  { id: 'pos-123', accountId: 'acc-029', symbol: 'AGG', name: 'iShares Core US Aggregate Bond ETF', assetClass: 'fixed_income', quantity: 1200, price: 98.50, costBasis: 120_000, marketValue: 118_200, weight: 0.197, gainLoss: -1_800, gainLossPercent: -0.015 },
  { id: 'pos-124', accountId: 'acc-029', symbol: 'BND', name: 'Vanguard Total Bond Market ETF', assetClass: 'fixed_income', quantity: 1100, price: 72.40, costBasis: 81_000, marketValue: 79_640, weight: 0.133, gainLoss: -1_360, gainLossPercent: -0.017 },
  { id: 'pos-125', accountId: 'acc-029', symbol: 'CASH', name: 'Money Market Fund', assetClass: 'cash', quantity: 1, price: 75_590, costBasis: 75_590, marketValue: 75_590, weight: 0.126, gainLoss: 0, gainLossPercent: 0 },
]

// ─── acc-033: Thomas Kim Individual ($780K, mod-007 Moderate Balanced) ───────
// Moderate growth, newer client with balanced allocation + small alternatives
const thomasKimPositions: Position[] = [
  { id: 'pos-130', accountId: 'acc-033', symbol: 'VTI', name: 'Vanguard Total Stock Market ETF', assetClass: 'us_equity', quantity: 750, price: 268.50, costBasis: 175_000, marketValue: 201_375, weight: 0.258, gainLoss: 26_375, gainLossPercent: 0.151 },
  { id: 'pos-131', accountId: 'acc-033', symbol: 'AAPL', name: 'Apple Inc.', assetClass: 'us_equity', quantity: 350, price: 195.40, costBasis: 60_000, marketValue: 68_390, weight: 0.088, gainLoss: 8_390, gainLossPercent: 0.140 },
  { id: 'pos-132', accountId: 'acc-033', symbol: 'EFA', name: 'iShares MSCI EAFE ETF', assetClass: 'intl_equity', quantity: 1000, price: 82.30, costBasis: 78_000, marketValue: 82_300, weight: 0.106, gainLoss: 4_300, gainLossPercent: 0.055 },
  { id: 'pos-133', accountId: 'acc-033', symbol: 'VWO', name: 'Vanguard FTSE Emerging Markets ETF', assetClass: 'emerging_markets', quantity: 800, price: 44.80, costBasis: 34_000, marketValue: 35_840, weight: 0.046, gainLoss: 1_840, gainLossPercent: 0.054 },
  { id: 'pos-134', accountId: 'acc-033', symbol: 'AGG', name: 'iShares Core US Aggregate Bond ETF', assetClass: 'fixed_income', quantity: 1700, price: 98.50, costBasis: 170_000, marketValue: 167_450, weight: 0.215, gainLoss: -2_550, gainLossPercent: -0.015 },
  { id: 'pos-135', accountId: 'acc-033', symbol: 'BND', name: 'Vanguard Total Bond Market ETF', assetClass: 'fixed_income', quantity: 1400, price: 72.40, costBasis: 103_000, marketValue: 101_360, weight: 0.130, gainLoss: -1_640, gainLossPercent: -0.016 },
  { id: 'pos-136', accountId: 'acc-033', symbol: 'QAI', name: 'IQ Hedge Multi-Strategy Tracker ETF', assetClass: 'alternatives', quantity: 1000, price: 35.20, costBasis: 36_000, marketValue: 35_200, weight: 0.045, gainLoss: -800, gainLossPercent: -0.022 },
  { id: 'pos-137', accountId: 'acc-033', symbol: 'GLD', name: 'SPDR Gold Shares', assetClass: 'commodities', quantity: 80, price: 215.60, costBasis: 15_000, marketValue: 17_248, weight: 0.022, gainLoss: 2_248, gainLossPercent: 0.150 },
  { id: 'pos-138', accountId: 'acc-033', symbol: 'VNQ', name: 'Vanguard Real Estate ETF', assetClass: 'real_estate', quantity: 280, price: 89.20, costBasis: 23_000, marketValue: 24_976, weight: 0.032, gainLoss: 1_976, gainLossPercent: 0.086 },
  { id: 'pos-139', accountId: 'acc-033', symbol: 'CASH', name: 'Money Market Fund', assetClass: 'cash', quantity: 1, price: 45_861, costBasis: 45_861, marketValue: 45_861, weight: 0.059, gainLoss: 0, gainLossPercent: 0 },
]

// ─── acc-035: Linda Garcia Traditional IRA ($520K, mod-003 Conservative Income) ──
// MASSIVE ALLOCATION MISMATCH: 61% equity for a 75-year-old on Conservative Income model (20% equity target)
// Supports nba-006 "Allocation mismatch for client age"
const lindaGarciaIRAPositions: Position[] = [
  { id: 'pos-140', accountId: 'acc-035', symbol: 'VTI', name: 'Vanguard Total Stock Market ETF', assetClass: 'us_equity', quantity: 600, price: 268.50, costBasis: 130_000, marketValue: 161_100, weight: 0.310, gainLoss: 31_100, gainLossPercent: 0.239 },
  { id: 'pos-141', accountId: 'acc-035', symbol: 'SPY', name: 'SPDR S&P 500 ETF', assetClass: 'us_equity', quantity: 300, price: 520.30, costBasis: 125_000, marketValue: 156_090, weight: 0.300, gainLoss: 31_090, gainLossPercent: 0.249 },
  { id: 'pos-142', accountId: 'acc-035', symbol: 'EFA', name: 'iShares MSCI EAFE ETF', assetClass: 'intl_equity', quantity: 300, price: 82.30, costBasis: 23_000, marketValue: 24_690, weight: 0.047, gainLoss: 1_690, gainLossPercent: 0.073 },
  { id: 'pos-143', accountId: 'acc-035', symbol: 'AGG', name: 'iShares Core US Aggregate Bond ETF', assetClass: 'fixed_income', quantity: 1000, price: 98.50, costBasis: 100_000, marketValue: 98_500, weight: 0.189, gainLoss: -1_500, gainLossPercent: -0.015 },
  { id: 'pos-144', accountId: 'acc-035', symbol: 'BND', name: 'Vanguard Total Bond Market ETF', assetClass: 'fixed_income', quantity: 500, price: 72.40, costBasis: 37_000, marketValue: 36_200, weight: 0.070, gainLoss: -800, gainLossPercent: -0.022 },
  { id: 'pos-145', accountId: 'acc-035', symbol: 'CASH', name: 'Money Market Fund', assetClass: 'cash', quantity: 1, price: 43_420, costBasis: 43_420, marketValue: 43_420, weight: 0.084, gainLoss: 0, gainLossPercent: 0 },
]

// ─── acc-046: James Thompson Inherited IRA ($485K, mod-003 Conservative Income) ──
// Inherited IRA with RMD requirements, conservative allocation
const jamesThompsonInheritedIRAPositions: Position[] = [
  { id: 'pos-250', accountId: 'acc-046', symbol: 'AGG', name: 'iShares Core US Aggregate Bond ETF', assetClass: 'fixed_income', quantity: 1600, price: 98.50, costBasis: 160_000, marketValue: 157_600, weight: 0.325, gainLoss: -2_400, gainLossPercent: -0.015 },
  { id: 'pos-251', accountId: 'acc-046', symbol: 'BND', name: 'Vanguard Total Bond Market ETF', assetClass: 'fixed_income', quantity: 1100, price: 72.40, costBasis: 81_000, marketValue: 79_640, weight: 0.164, gainLoss: -1_360, gainLossPercent: -0.017 },
  { id: 'pos-252', accountId: 'acc-046', symbol: 'VTI', name: 'Vanguard Total Stock Market ETF', assetClass: 'us_equity', quantity: 400, price: 268.50, costBasis: 100_000, marketValue: 107_400, weight: 0.221, gainLoss: 7_400, gainLossPercent: 0.074 },
  { id: 'pos-253', accountId: 'acc-046', symbol: 'EFA', name: 'iShares MSCI EAFE ETF', assetClass: 'intl_equity', quantity: 600, price: 82.30, costBasis: 47_000, marketValue: 49_380, weight: 0.102, gainLoss: 2_380, gainLossPercent: 0.051 },
  { id: 'pos-254', accountId: 'acc-046', symbol: 'CASH', name: 'Money Market Fund', assetClass: 'cash', quantity: 1, price: 90_980, costBasis: 90_980, marketValue: 90_980, weight: 0.188, gainLoss: 0, gainLossPercent: 0 },
]

// ─── acc-047: David Williams SIMPLE IRA ($210K, mod-007 Moderate Balanced) ────
// Small employer-sponsored retirement account, moderate allocation
const davidWilliamsSIMPLEIRAPositions: Position[] = [
  { id: 'pos-260', accountId: 'acc-047', symbol: 'VTI', name: 'Vanguard Total Stock Market ETF', assetClass: 'us_equity', quantity: 300, price: 268.50, costBasis: 74_000, marketValue: 80_550, weight: 0.384, gainLoss: 6_550, gainLossPercent: 0.089 },
  { id: 'pos-261', accountId: 'acc-047', symbol: 'EFA', name: 'iShares MSCI EAFE ETF', assetClass: 'intl_equity', quantity: 350, price: 82.30, costBasis: 27_000, marketValue: 28_805, weight: 0.137, gainLoss: 1_805, gainLossPercent: 0.067 },
  { id: 'pos-262', accountId: 'acc-047', symbol: 'AGG', name: 'iShares Core US Aggregate Bond ETF', assetClass: 'fixed_income', quantity: 550, price: 98.50, costBasis: 55_000, marketValue: 54_175, weight: 0.258, gainLoss: -825, gainLossPercent: -0.015 },
  { id: 'pos-263', accountId: 'acc-047', symbol: 'BND', name: 'Vanguard Total Bond Market ETF', assetClass: 'fixed_income', quantity: 400, price: 72.40, costBasis: 29_500, marketValue: 28_960, weight: 0.138, gainLoss: -540, gainLossPercent: -0.018 },
  { id: 'pos-264', accountId: 'acc-047', symbol: 'CASH', name: 'Money Market Fund', assetClass: 'cash', quantity: 1, price: 17_510, costBasis: 17_510, marketValue: 17_510, weight: 0.083, gainLoss: 0, gainLossPercent: 0 },
]

// ── acc-041: Chen-Wong HK Equity (HK$12.5M) ──────────────────────────────────
// HK-listed equities and Asia-focused ETFs, denominated in HKD
const chenHKPositions: Position[] = [
  { id: 'pos-200', accountId: 'acc-041', symbol: '0700.HK', name: 'Tencent Holdings', assetClass: 'intl_equity', quantity: 12000, price: 380.00, costBasis: 3_800_000, marketValue: 4_560_000, weight: 0.365, gainLoss: 760_000, gainLossPercent: 0.200 },
  { id: 'pos-201', accountId: 'acc-041', symbol: '9988.HK', name: 'Alibaba Group', assetClass: 'intl_equity', quantity: 18000, price: 88.50, costBasis: 1_400_000, marketValue: 1_593_000, weight: 0.127, gainLoss: 193_000, gainLossPercent: 0.138 },
  { id: 'pos-202', accountId: 'acc-041', symbol: '0005.HK', name: 'HSBC Holdings', assetClass: 'intl_equity', quantity: 25000, price: 68.20, costBasis: 1_500_000, marketValue: 1_705_000, weight: 0.136, gainLoss: 205_000, gainLossPercent: 0.137 },
  { id: 'pos-203', accountId: 'acc-041', symbol: '2800.HK', name: 'Tracker Fund of Hong Kong', assetClass: 'intl_equity', quantity: 80000, price: 22.15, costBasis: 1_600_000, marketValue: 1_772_000, weight: 0.142, gainLoss: 172_000, gainLossPercent: 0.108 },
  { id: 'pos-204', accountId: 'acc-041', symbol: '1299.HK', name: 'AIA Group', assetClass: 'intl_equity', quantity: 15000, price: 72.80, costBasis: 1_000_000, marketValue: 1_092_000, weight: 0.087, gainLoss: 92_000, gainLossPercent: 0.092 },
  { id: 'pos-205', accountId: 'acc-041', symbol: '2388.HK', name: 'BOC Hong Kong', assetClass: 'intl_equity', quantity: 40000, price: 26.95, costBasis: 1_000_000, marketValue: 1_078_000, weight: 0.086, gainLoss: 78_000, gainLossPercent: 0.078 },
  { id: 'pos-206', accountId: 'acc-041', symbol: 'CASH', name: 'HKD Money Market', assetClass: 'cash', quantity: 1, price: 700_000, costBasis: 700_000, marketValue: 700_000, weight: 0.056, gainLoss: 0, gainLossPercent: 0 },
]

// ── acc-042: Chen-Wong SG Growth (S$2.8M) ─────────────────────────────────────
// Singapore-listed ETFs and equities, denominated in SGD
const chenSGPositions: Position[] = [
  { id: 'pos-210', accountId: 'acc-042', symbol: 'ES3.SI', name: 'SPDR Straits Times Index ETF', assetClass: 'intl_equity', quantity: 150000, price: 3.52, costBasis: 480_000, marketValue: 528_000, weight: 0.189, gainLoss: 48_000, gainLossPercent: 0.100 },
  { id: 'pos-211', accountId: 'acc-042', symbol: 'D05.SI', name: 'DBS Group Holdings', assetClass: 'intl_equity', quantity: 12000, price: 39.80, costBasis: 420_000, marketValue: 477_600, weight: 0.171, gainLoss: 57_600, gainLossPercent: 0.137 },
  { id: 'pos-212', accountId: 'acc-042', symbol: 'O39.SI', name: 'OCBC Bank', assetClass: 'intl_equity', quantity: 25000, price: 14.85, costBasis: 340_000, marketValue: 371_250, weight: 0.133, gainLoss: 31_250, gainLossPercent: 0.092 },
  { id: 'pos-213', accountId: 'acc-042', symbol: 'A17U.SI', name: 'CapitaLand Ascendas REIT', assetClass: 'real_estate', quantity: 100000, price: 2.92, costBasis: 275_000, marketValue: 292_000, weight: 0.104, gainLoss: 17_000, gainLossPercent: 0.062 },
  { id: 'pos-214', accountId: 'acc-042', symbol: 'CLR.SI', name: 'Nikko AM Singapore STI ETF', assetClass: 'intl_equity', quantity: 80000, price: 3.95, costBasis: 290_000, marketValue: 316_000, weight: 0.113, gainLoss: 26_000, gainLossPercent: 0.090 },
  { id: 'pos-215', accountId: 'acc-042', symbol: 'MBH.SI', name: 'ABF Singapore Bond Index Fund', assetClass: 'fixed_income', quantity: 200000, price: 1.18, costBasis: 230_000, marketValue: 236_000, weight: 0.084, gainLoss: 6_000, gainLossPercent: 0.026 },
  { id: 'pos-216', accountId: 'acc-042', symbol: 'CASH', name: 'SGD Money Market', assetClass: 'cash', quantity: 1, price: 579_150, costBasis: 579_150, marketValue: 579_150, weight: 0.207, gainLoss: 0, gainLossPercent: 0 },
]

// ── acc-043: Mueller EUR Balanced (€3.2M) ─────────────────────────────────────
// European equities and bonds, denominated in EUR
const muellerEURPositions: Position[] = [
  { id: 'pos-220', accountId: 'acc-043', symbol: 'SIE.DE', name: 'Siemens AG', assetClass: 'intl_equity', quantity: 3500, price: 185.40, costBasis: 580_000, marketValue: 648_900, weight: 0.203, gainLoss: 68_900, gainLossPercent: 0.119 },
  { id: 'pos-221', accountId: 'acc-043', symbol: 'ASML.AS', name: 'ASML Holding NV', assetClass: 'intl_equity', quantity: 800, price: 690.50, costBasis: 480_000, marketValue: 552_400, weight: 0.173, gainLoss: 72_400, gainLossPercent: 0.151 },
  { id: 'pos-222', accountId: 'acc-043', symbol: 'MC.PA', name: 'LVMH Moet Hennessy', assetClass: 'intl_equity', quantity: 500, price: 720.00, costBasis: 320_000, marketValue: 360_000, weight: 0.113, gainLoss: 40_000, gainLossPercent: 0.125 },
  { id: 'pos-223', accountId: 'acc-043', symbol: 'CSBGU0.SW', name: 'iShares Core Euro Govt Bond ETF', assetClass: 'fixed_income', quantity: 4200, price: 125.50, costBasis: 535_000, marketValue: 527_100, weight: 0.165, gainLoss: -7_900, gainLossPercent: -0.015 },
  { id: 'pos-224', accountId: 'acc-043', symbol: 'IEAC.AS', name: 'iShares Core EUR Corp Bond ETF', assetClass: 'fixed_income', quantity: 3000, price: 108.20, costBasis: 330_000, marketValue: 324_600, weight: 0.101, gainLoss: -5_400, gainLossPercent: -0.016 },
  { id: 'pos-225', accountId: 'acc-043', symbol: 'VWRL.AS', name: 'Vanguard FTSE All-World ETF', assetClass: 'intl_equity', quantity: 3200, price: 108.80, costBasis: 320_000, marketValue: 348_160, weight: 0.109, gainLoss: 28_160, gainLossPercent: 0.088 },
  { id: 'pos-226', accountId: 'acc-043', symbol: 'CASH', name: 'EUR Money Market', assetClass: 'cash', quantity: 1, price: 438_840, costBasis: 438_840, marketValue: 438_840, weight: 0.137, gainLoss: 0, gainLossPercent: 0 },
]

// ── acc-044: Mueller CHF Conservative (CHF 1.5M) ──────────────────────────────
// Swiss bonds and blue-chip equities, denominated in CHF
const muellerCHFPositions: Position[] = [
  { id: 'pos-230', accountId: 'acc-044', symbol: 'NESN.SW', name: 'Nestle SA', assetClass: 'intl_equity', quantity: 2500, price: 98.50, costBasis: 230_000, marketValue: 246_250, weight: 0.164, gainLoss: 16_250, gainLossPercent: 0.071 },
  { id: 'pos-231', accountId: 'acc-044', symbol: 'NOVN.SW', name: 'Novartis AG', assetClass: 'intl_equity', quantity: 1800, price: 95.20, costBasis: 155_000, marketValue: 171_360, weight: 0.114, gainLoss: 16_360, gainLossPercent: 0.106 },
  { id: 'pos-232', accountId: 'acc-044', symbol: 'ROG.SW', name: 'Roche Holding AG', assetClass: 'intl_equity', quantity: 600, price: 278.50, costBasis: 150_000, marketValue: 167_100, weight: 0.111, gainLoss: 17_100, gainLossPercent: 0.114 },
  { id: 'pos-233', accountId: 'acc-044', symbol: 'CSBGC0.SW', name: 'iShares Core CHF Corp Bond ETF', assetClass: 'fixed_income', quantity: 3500, price: 102.80, costBasis: 365_000, marketValue: 359_800, weight: 0.240, gainLoss: -5_200, gainLossPercent: -0.014 },
  { id: 'pos-234', accountId: 'acc-044', symbol: 'SRFCHA.SW', name: 'UBS ETF SBI Domestic Govt Bond', assetClass: 'fixed_income', quantity: 2000, price: 110.50, costBasis: 225_000, marketValue: 221_000, weight: 0.147, gainLoss: -4_000, gainLossPercent: -0.018 },
  { id: 'pos-235', accountId: 'acc-044', symbol: 'CASH', name: 'CHF Money Market', assetClass: 'cash', quantity: 1, price: 334_490, costBasis: 334_490, marketValue: 334_490, weight: 0.223, gainLoss: 0, gainLossPercent: 0 },
]

// ── acc-045: Patel Digital Assets ($425K) ─────────────────────────────────────
// Crypto portfolio in USD-denominated Coinbase account
const patelCryptoPositions: Position[] = [
  { id: 'pos-240', accountId: 'acc-045', symbol: 'BTC', name: 'Bitcoin', assetClass: 'digital_assets', quantity: 2.15, price: 87_450, costBasis: 145_000, marketValue: 188_018, weight: 0.442, gainLoss: 43_018, gainLossPercent: 0.297 },
  { id: 'pos-241', accountId: 'acc-045', symbol: 'ETH', name: 'Ethereum', assetClass: 'digital_assets', quantity: 22.5, price: 3_280, costBasis: 62_000, marketValue: 73_800, weight: 0.174, gainLoss: 11_800, gainLossPercent: 0.190 },
  { id: 'pos-242', accountId: 'acc-045', symbol: 'SOL', name: 'Solana', assetClass: 'digital_assets', quantity: 180, price: 142.50, costBasis: 30_000, marketValue: 25_650, weight: 0.060, gainLoss: -4_350, gainLossPercent: -0.145 },
  { id: 'pos-243', accountId: 'acc-045', symbol: 'AVAX', name: 'Avalanche', assetClass: 'digital_assets', quantity: 800, price: 41.67, costBasis: 28_000, marketValue: 33_336, weight: 0.078, gainLoss: 5_336, gainLossPercent: 0.191 },
  { id: 'pos-244', accountId: 'acc-045', symbol: 'LINK', name: 'Chainlink', assetClass: 'digital_assets', quantity: 1500, price: 20.41, costBasis: 25_000, marketValue: 30_615, weight: 0.072, gainLoss: 5_615, gainLossPercent: 0.225 },
  { id: 'pos-245', accountId: 'acc-045', symbol: 'DOT', name: 'Polkadot', assetClass: 'digital_assets', quantity: 2200, price: 8.40, costBasis: 22_000, marketValue: 18_480, weight: 0.043, gainLoss: -3_520, gainLossPercent: -0.160 },
  { id: 'pos-246', accountId: 'acc-045', symbol: 'USDC', name: 'USD Coin', assetClass: 'digital_assets', quantity: 15231, price: 1.00, costBasis: 15_231, marketValue: 15_231, weight: 0.036, gainLoss: 0, gainLossPercent: 0 },
  { id: 'pos-247', accountId: 'acc-045', symbol: 'CASH', name: 'USD Cash', assetClass: 'cash', quantity: 1, price: 8_500, costBasis: 8_500, marketValue: 8_500, weight: 0.020, gainLoss: 0, gainLossPercent: 0 },
]

// ─── Aggregate & Export ─────────────────────────────────────────────────────
export const allPositions: Position[] = [
  ...trustPositions,
  ...robertIndividualPositions,
  ...robertTraditionalIRAPositions,
  ...chenTrustPositions,
  ...davidWilliamsPositions,
  ...michaelMartinezPositions,
  ...jamesThompsonIRAPositions,
  ...patel529Positions,
  ...thomasKimPositions,
  ...lindaGarciaIRAPositions,
  ...jamesThompsonInheritedIRAPositions,
  ...davidWilliamsSIMPLEIRAPositions,
  ...chenHKPositions,
  ...chenSGPositions,
  ...muellerEURPositions,
  ...muellerCHFPositions,
  ...patelCryptoPositions,
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
