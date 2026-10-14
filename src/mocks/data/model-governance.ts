import type { ModelVersionRecord } from '@/types/reference-models'
import type { RiskProfile } from '@/lib/risk-profile'

/**
 * Seeded Investment Committee history (R9). Every version was proposed by the analyst, Mike Chen
 * (`user-003`), and approved by the committee. Dates are NYSE trading days; the one pending version
 * takes effect after today. Phase 7a moved four dates off weekends and holidays (2025-01-01, 2025-06-01,
 * 2025-09-01 and 2025-11-01), gave mod-005 v2 its missing US equity change and replaced its "private
 * equity sleeve (BXPE)" line, which the model never held, with the QAI sleeve it does.
 */
const MIKE = 'user-003'
const IC = 'Investment Committee' as const
const initial = (id: string) => [{ id, type: 'description_change' as const, description: 'Initial model creation' }]

export const MODEL_VERSIONS: readonly ModelVersionRecord[] = [
  { modelId: 'mod-001', version: 1, status: 'approved', proposedBy: MIKE, approvedBy: IC, approvedOn: '2024-12-18', effectiveDate: '2025-01-02', changes: initial('chg-005'), targets: [
    { assetClass: 'us_equity', targetWeight: 0.38 }, { assetClass: 'intl_equity', targetWeight: 0.12 }, { assetClass: 'emerging_markets', targetWeight: 0.05 }, { assetClass: 'fixed_income', targetWeight: 0.28 },
    { assetClass: 'alternatives', targetWeight: 0.05 }, { assetClass: 'real_estate', targetWeight: 0.03 }, { assetClass: 'commodities', targetWeight: 0.02 }, { assetClass: 'cash', targetWeight: 0.07 },
  ] },
  { modelId: 'mod-001', version: 2, status: 'approved', proposedBy: MIKE, approvedBy: IC, approvedOn: '2025-06-27', effectiveDate: '2025-07-01', changes: [
    { id: 'chg-003', type: 'weight_change', description: 'Increased US equity from 38% to 40%', assetClass: 'us_equity', oldValue: 0.38, newValue: 0.40 },
    { id: 'chg-004', type: 'weight_change', description: 'Reduced cash from 7% to 5%', assetClass: 'cash', oldValue: 0.07, newValue: 0.05 },
  ], targets: [
    { assetClass: 'us_equity', targetWeight: 0.40 }, { assetClass: 'intl_equity', targetWeight: 0.12 }, { assetClass: 'emerging_markets', targetWeight: 0.05 }, { assetClass: 'fixed_income', targetWeight: 0.28 },
    { assetClass: 'alternatives', targetWeight: 0.05 }, { assetClass: 'real_estate', targetWeight: 0.03 }, { assetClass: 'commodities', targetWeight: 0.02 }, { assetClass: 'cash', targetWeight: 0.05 },
  ] },
  { modelId: 'mod-001', version: 3, status: 'approved', proposedBy: MIKE, approvedBy: IC, approvedOn: '2026-01-14', effectiveDate: '2026-01-15', changes: [
    { id: 'chg-001', type: 'weight_change', description: 'Reduced emerging markets from 5% to 3%', assetClass: 'emerging_markets', oldValue: 0.05, newValue: 0.03 },
    { id: 'chg-002', type: 'weight_change', description: 'Increased fixed income from 28% to 30%', assetClass: 'fixed_income', oldValue: 0.28, newValue: 0.30 },
  ], targets: [
    { assetClass: 'us_equity', targetWeight: 0.40 }, { assetClass: 'intl_equity', targetWeight: 0.12 }, { assetClass: 'emerging_markets', targetWeight: 0.03 }, { assetClass: 'fixed_income', targetWeight: 0.30 },
    { assetClass: 'alternatives', targetWeight: 0.05 }, { assetClass: 'real_estate', targetWeight: 0.03 }, { assetClass: 'commodities', targetWeight: 0.02 }, { assetClass: 'cash', targetWeight: 0.05 },
  ] },
  { modelId: 'mod-002', version: 1, status: 'approved', proposedBy: MIKE, approvedBy: IC, approvedOn: '2024-12-18', effectiveDate: '2025-01-02', changes: initial('chg-008'), targets: [
    { assetClass: 'us_equity', targetWeight: 0.58 }, { assetClass: 'intl_equity', targetWeight: 0.12 }, { assetClass: 'emerging_markets', targetWeight: 0.05 }, { assetClass: 'fixed_income', targetWeight: 0.15 },
    { assetClass: 'alternatives', targetWeight: 0.05 }, { assetClass: 'commodities', targetWeight: 0.02 }, { assetClass: 'cash', targetWeight: 0.03 },
  ] },
  { modelId: 'mod-002', version: 2, status: 'approved', proposedBy: MIKE, approvedBy: IC, approvedOn: '2025-09-25', effectiveDate: '2025-10-01', changes: [
    { id: 'chg-006', type: 'weight_change', description: 'Increased international equity from 12% to 15%', assetClass: 'intl_equity', oldValue: 0.12, newValue: 0.15 },
    { id: 'chg-007', type: 'weight_change', description: 'Reduced US equity from 58% to 55%', assetClass: 'us_equity', oldValue: 0.58, newValue: 0.55 },
  ], targets: [
    { assetClass: 'us_equity', targetWeight: 0.55 }, { assetClass: 'intl_equity', targetWeight: 0.15 }, { assetClass: 'emerging_markets', targetWeight: 0.05 }, { assetClass: 'fixed_income', targetWeight: 0.15 },
    { assetClass: 'alternatives', targetWeight: 0.05 }, { assetClass: 'commodities', targetWeight: 0.02 }, { assetClass: 'cash', targetWeight: 0.03 },
  ] },
  { modelId: 'mod-003', version: 1, status: 'approved', proposedBy: MIKE, approvedBy: IC, approvedOn: '2024-12-18', effectiveDate: '2025-01-02', changes: initial('chg-011'), targets: [
    { assetClass: 'us_equity', targetWeight: 0.25 }, { assetClass: 'intl_equity', targetWeight: 0.05 }, { assetClass: 'fixed_income', targetWeight: 0.50 },
    { assetClass: 'alternatives', targetWeight: 0.05 }, { assetClass: 'real_estate', targetWeight: 0.05 }, { assetClass: 'cash', targetWeight: 0.10 },
  ] },
  { modelId: 'mod-003', version: 2, status: 'approved', proposedBy: MIKE, approvedBy: IC, approvedOn: '2025-08-27', effectiveDate: '2025-09-02', changes: [
    { id: 'chg-009', type: 'weight_change', description: 'Increased fixed income from 50% to 55%', assetClass: 'fixed_income', oldValue: 0.50, newValue: 0.55 },
    { id: 'chg-010', type: 'weight_change', description: 'Reduced US equity from 25% to 20%', assetClass: 'us_equity', oldValue: 0.25, newValue: 0.20 },
  ], targets: [
    { assetClass: 'us_equity', targetWeight: 0.20 }, { assetClass: 'intl_equity', targetWeight: 0.05 }, { assetClass: 'fixed_income', targetWeight: 0.55 },
    { assetClass: 'alternatives', targetWeight: 0.05 }, { assetClass: 'real_estate', targetWeight: 0.05 }, { assetClass: 'cash', targetWeight: 0.10 },
  ] },
  { modelId: 'mod-004', version: 1, status: 'approved', proposedBy: MIKE, approvedBy: IC, approvedOn: '2024-12-18', effectiveDate: '2025-01-02', changes: initial('chg-012'), targets: [
    { assetClass: 'us_equity', targetWeight: 0.50 }, { assetClass: 'intl_equity', targetWeight: 0.20 }, { assetClass: 'emerging_markets', targetWeight: 0.10 },
    { assetClass: 'fixed_income', targetWeight: 0.10 }, { assetClass: 'alternatives', targetWeight: 0.05 }, { assetClass: 'cash', targetWeight: 0.05 },
  ] },
  { modelId: 'mod-005', version: 1, status: 'approved', proposedBy: MIKE, approvedBy: IC, approvedOn: '2024-12-18', effectiveDate: '2025-01-02', changes: initial('chg-017'), targets: [
    { assetClass: 'us_equity', targetWeight: 0.40 }, { assetClass: 'intl_equity', targetWeight: 0.15 }, { assetClass: 'emerging_markets', targetWeight: 0.05 }, { assetClass: 'fixed_income', targetWeight: 0.20 },
    { assetClass: 'alternatives', targetWeight: 0.10 }, { assetClass: 'real_estate', targetWeight: 0.05 }, { assetClass: 'cash', targetWeight: 0.05 },
  ] },
  { modelId: 'mod-005', version: 2, status: 'approved', proposedBy: MIKE, approvedBy: IC, approvedOn: '2025-05-28', effectiveDate: '2025-06-02', changes: [
    { id: 'chg-015', type: 'security_add', description: 'Added a hedge-fund replication sleeve (QAI) to alternatives', assetClass: 'alternatives' },
    { id: 'chg-016', type: 'weight_change', description: 'Increased alternatives from 10% to 15%', assetClass: 'alternatives', oldValue: 0.10, newValue: 0.15 },
    { id: 'chg-022', type: 'weight_change', description: 'Reduced US equity from 40% to 35%', assetClass: 'us_equity', oldValue: 0.40, newValue: 0.35 },
  ], targets: [
    { assetClass: 'us_equity', targetWeight: 0.35 }, { assetClass: 'intl_equity', targetWeight: 0.15 }, { assetClass: 'emerging_markets', targetWeight: 0.05 }, { assetClass: 'fixed_income', targetWeight: 0.20 },
    { assetClass: 'alternatives', targetWeight: 0.15 }, { assetClass: 'real_estate', targetWeight: 0.05 }, { assetClass: 'cash', targetWeight: 0.05 },
  ] },
  { modelId: 'mod-005', version: 3, status: 'pending_approval', proposedBy: MIKE, effectiveDate: '2026-04-01', changes: [
    { id: 'chg-013', type: 'weight_change', description: 'Proposed increase in alternatives from 15% to 18%', assetClass: 'alternatives', oldValue: 0.15, newValue: 0.18 },
    { id: 'chg-014', type: 'weight_change', description: 'Proposed reduction in fixed income from 20% to 17%', assetClass: 'fixed_income', oldValue: 0.20, newValue: 0.17 },
  ], targets: [
    { assetClass: 'us_equity', targetWeight: 0.35 }, { assetClass: 'intl_equity', targetWeight: 0.15 }, { assetClass: 'emerging_markets', targetWeight: 0.05 }, { assetClass: 'fixed_income', targetWeight: 0.17 },
    { assetClass: 'alternatives', targetWeight: 0.18 }, { assetClass: 'real_estate', targetWeight: 0.05 }, { assetClass: 'cash', targetWeight: 0.05 },
  ] },
  { modelId: 'mod-006', version: 1, status: 'approved', proposedBy: MIKE, approvedBy: IC, approvedOn: '2024-12-18', effectiveDate: '2025-01-02', changes: initial('chg-018'), targets: [
    { assetClass: 'us_equity', targetWeight: 0.45 }, { assetClass: 'intl_equity', targetWeight: 0.10 }, { assetClass: 'fixed_income', targetWeight: 0.35 }, { assetClass: 'cash', targetWeight: 0.10 },
  ] },
  { modelId: 'mod-007', version: 1, status: 'approved', proposedBy: MIKE, approvedBy: IC, approvedOn: '2024-12-18', effectiveDate: '2025-01-02', changes: initial('chg-021'), targets: [
    { assetClass: 'us_equity', targetWeight: 0.40 }, { assetClass: 'intl_equity', targetWeight: 0.10 }, { assetClass: 'emerging_markets', targetWeight: 0.05 }, { assetClass: 'fixed_income', targetWeight: 0.30 },
    { assetClass: 'alternatives', targetWeight: 0.05 }, { assetClass: 'real_estate', targetWeight: 0.03 }, { assetClass: 'commodities', targetWeight: 0.02 }, { assetClass: 'cash', targetWeight: 0.05 },
  ] },
  { modelId: 'mod-007', version: 2, status: 'approved', proposedBy: MIKE, approvedBy: IC, approvedOn: '2025-10-28', effectiveDate: '2025-11-03', changes: [
    { id: 'chg-019', type: 'weight_change', description: 'Increased fixed income from 30% to 35%', assetClass: 'fixed_income', oldValue: 0.30, newValue: 0.35 },
    { id: 'chg-020', type: 'weight_change', description: 'Reduced US equity from 40% to 35%', assetClass: 'us_equity', oldValue: 0.40, newValue: 0.35 },
  ], targets: [
    { assetClass: 'us_equity', targetWeight: 0.35 }, { assetClass: 'intl_equity', targetWeight: 0.10 }, { assetClass: 'emerging_markets', targetWeight: 0.05 }, { assetClass: 'fixed_income', targetWeight: 0.35 },
    { assetClass: 'alternatives', targetWeight: 0.05 }, { assetClass: 'real_estate', targetWeight: 0.03 }, { assetClass: 'commodities', targetWeight: 0.02 }, { assetClass: 'cash', targetWeight: 0.05 },
  ] },
]

/**
 * Each model's risk profile; the firm's risk-profile table names five of them for its bands. The rest are
 * labelled by the band their modeled volatility scores in (Phase 7a: mod-005 was Moderate Aggressive, but scores Moderate).
 */
export const MODEL_RISK_PROFILES: Readonly<Record<string, RiskProfile>> = {
  'mod-001': 'moderate', 'mod-002': 'moderate_aggressive', 'mod-003': 'conservative', 'mod-004': 'aggressive',
  'mod-005': 'moderate', 'mod-006': 'moderate', 'mod-007': 'moderate_conservative',
}

/** The education model's benchmark is its glide path at the current stage (R8). */
export const GLIDE_PATH_MODELS: ReadonlySet<string> = new Set(['mod-006'])
