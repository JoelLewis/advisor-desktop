import type { HeldAwayAsset } from '@/types/held-away'

export const heldAwayAssets: HeldAwayAsset[] = [
  {
    id: 'ha-001', clientId: 'cli-001', householdId: 'hh-001',
    institutionName: 'Vanguard', accountType: '401(k) — Former employer',
    estimatedValue: 2_400_000, lastUpdated: '2025-12-01',
    assetClasses: [
      { assetClass: 'us_equity', percentage: 0.55 },
      { assetClass: 'intl_equity', percentage: 0.15 },
      { assetClass: 'fixed_income', percentage: 0.25 },
      { assetClass: 'cash', percentage: 0.05 },
    ],
    consolidationOpportunity: true,
  },
  {
    id: 'ha-002', clientId: 'cli-002', householdId: 'hh-001',
    institutionName: 'TIAA', accountType: '403(b) — University',
    estimatedValue: 1_500_000, lastUpdated: '2025-11-15',
    assetClasses: [
      { assetClass: 'us_equity', percentage: 0.40 },
      { assetClass: 'fixed_income', percentage: 0.50 },
      { assetClass: 'cash', percentage: 0.10 },
    ],
    consolidationOpportunity: true,
  },
  {
    id: 'ha-003', clientId: 'cli-003', householdId: 'hh-002',
    institutionName: 'Company Stock (Private)', accountType: 'Restricted stock units',
    estimatedValue: 3_200_000, lastUpdated: '2025-10-01',
    assetClasses: [{ assetClass: 'us_equity', percentage: 1.0 }],
    consolidationOpportunity: false,
  },
  {
    id: 'ha-004', clientId: 'cli-020', householdId: 'hh-002',
    institutionName: 'Real Estate Holdings', accountType: 'Commercial property',
    estimatedValue: 1_600_000, lastUpdated: '2025-09-01',
    assetClasses: [{ assetClass: 'real_estate', percentage: 1.0 }],
    consolidationOpportunity: false,
  },
  {
    id: 'ha-005', clientId: 'cli-004', householdId: 'hh-003',
    institutionName: 'Fidelity', accountType: '401(k) — Law firm',
    estimatedValue: 1_200_000, lastUpdated: '2025-11-01',
    assetClasses: [
      { assetClass: 'us_equity', percentage: 0.60 },
      { assetClass: 'fixed_income', percentage: 0.30 },
      { assetClass: 'cash', percentage: 0.10 },
    ],
    consolidationOpportunity: true,
  },
  {
    id: 'ha-006', clientId: 'cli-006', householdId: 'hh-004',
    institutionName: 'Real Estate Holdings', accountType: 'Investment properties',
    estimatedValue: 1_700_000, lastUpdated: '2025-08-01',
    assetClasses: [{ assetClass: 'real_estate', percentage: 1.0 }],
    consolidationOpportunity: false,
  },
  {
    id: 'ha-007', clientId: 'cli-009', householdId: 'hh-006',
    institutionName: 'Empower', accountType: '401(k) — Anderson Group',
    estimatedValue: 1_200_000, lastUpdated: '2025-11-30',
    assetClasses: [
      { assetClass: 'us_equity', percentage: 0.50 },
      { assetClass: 'intl_equity', percentage: 0.10 },
      { assetClass: 'fixed_income', percentage: 0.35 },
      { assetClass: 'cash', percentage: 0.05 },
    ],
    consolidationOpportunity: true,
  },
  {
    id: 'ha-008', clientId: 'cli-011', householdId: 'hh-007',
    institutionName: 'Empower', accountType: '401(k) — Hospital system',
    estimatedValue: 1_600_000, lastUpdated: '2025-12-01',
    assetClasses: [
      { assetClass: 'us_equity', percentage: 0.55 },
      { assetClass: 'intl_equity', percentage: 0.15 },
      { assetClass: 'fixed_income', percentage: 0.25 },
      { assetClass: 'cash', percentage: 0.05 },
    ],
    consolidationOpportunity: true,
  },
  {
    id: 'ha-009', clientId: 'cli-013', householdId: 'hh-008',
    institutionName: 'Company RSUs', accountType: 'Vested stock — Tech company',
    estimatedValue: 450_000, lastUpdated: '2025-11-10',
    assetClasses: [{ assetClass: 'us_equity', percentage: 1.0 }],
    consolidationOpportunity: false,
  },
  {
    id: 'ha-010', clientId: 'cli-015', householdId: 'hh-009',
    institutionName: 'Betterment', accountType: 'Robo-advisor account',
    estimatedValue: 205_000, lastUpdated: '2025-10-28',
    assetClasses: [
      { assetClass: 'us_equity', percentage: 0.60 },
      { assetClass: 'intl_equity', percentage: 0.20 },
      { assetClass: 'fixed_income', percentage: 0.15 },
      { assetClass: 'cash', percentage: 0.05 },
    ],
    consolidationOpportunity: true,
  },
]
