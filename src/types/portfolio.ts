import type { Currency, Percentage } from './common';

type AssetClass =
  | 'us_equity'
  | 'intl_equity'
  | 'emerging_markets'
  | 'fixed_income'
  | 'alternatives'
  | 'real_estate'
  | 'commodities'
  | 'cash'
  | 'digital_assets'
  | 'private_equity';

type HoldingPeriod = 'short' | 'long';

type TaxLot = {
  id: string;
  positionId: string;
  purchaseDate: string;
  quantity: number;
  costBasis: Currency;
  currentValue: Currency;
  gainLoss: Currency;
  holdingPeriod: HoldingPeriod;
  washSaleRestricted: boolean;
};

type Position = {
  id: string;
  accountId: string;
  symbol: string;
  name: string;
  assetClass: AssetClass;
  quantity: number;
  price: Currency;
  costBasis: Currency;
  marketValue: Currency;
  weight: Percentage;
  gainLoss: Currency;
  gainLossPercent: Percentage;
};

type HoldingGroup = {
  assetClass: AssetClass;
  targetWeight: Percentage;
  actualWeight: Percentage;
  drift: Percentage;
  positions: Position[];
};

type AssetClassTarget = {
  assetClass: AssetClass;
  targetWeight: Percentage;
};

/**
 * What `benchmark` actually is. Every model here computes its "benchmark" return from its own
 * target weights (`Σ wb·Rb,i` in the attribution) — there is no real external index return series
 * behind any of them yet. `'model_policy'` says so explicitly, so a future model that *does* carry
 * a real external index's returns can be added as `'external_index'` without the two being
 * confused for each other.
 */
type BenchmarkKind = 'model_policy' | 'external_index';

type ModelAssignment = {
  id: string;
  name: string;
  benchmark: string;
  benchmarkKind: BenchmarkKind;
  description: string;
  assetClasses: AssetClassTarget[];
};

type AssetClassDrift = {
  assetClass: AssetClass;
  target: Percentage;
  actual: Percentage;
  drift: Percentage;
};

type DriftStatus = {
  accountId: string;
  modelId: string;
  // The account's own model band — a conservative model rebalances on tighter bands than an
  // aggressive one, since equal percentage drift means unequal risk change. Read by
  // `needsRebalance` and by the rebalance wizard's threshold filter, so both agree with what
  // Model Governance displays for the same model.
  driftTolerance: Percentage;
  rebalanceFrequency: 'monthly' | 'quarterly' | 'semi_annual' | 'annual' | 'threshold_only';
  // Total portfolio drift: half-sum-of-|drift| across asset classes — the one-way turnover needed
  // to return to target. Never negative, and NOT the quantity a band gates (see maxAbsDrift).
  totalDrift: Percentage;
  // The single worst asset-class breach. This is what needsRebalance and any threshold/band
  // comparison gate on — published once here so the client never recomputes it (one fact, one
  // place) and never renders totalDrift (a different quantity) against driftTolerance.
  maxAbsDrift: Percentage;
  assetClassDrifts: AssetClassDrift[];
  lastCalculated: string;
  needsRebalance: boolean;
};

type SecurityKind = 'single_name' | 'fund' | 'cash';

type ConcentrationMetric = {
  positionId: string;
  symbol: string;
  name: string;
  assetClass: AssetClass;
  marketValue: Currency;
  weight: Percentage;
  kind: SecurityKind;
  limit: Percentage;
  limitBasis: string;
  breached: boolean;
};

// ── Model Governance ──

type ModelChangeType = 'weight_change' | 'security_add' | 'security_remove' | 'benchmark_change' | 'description_change';

type ModelChangeEntry = {
  id: string;
  type: ModelChangeType;
  description: string;
  assetClass?: AssetClass;
  oldValue?: number | string;
  newValue?: number | string;
};

type ModelVersion = {
  version: number;
  effectiveDate: string;
  author: string;
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected';
  approvedBy?: string;
  approvedDate?: string;
  changes: ModelChangeEntry[];
  assetClasses: AssetClassTarget[];
};

type ModelGovernanceDetail = {
  id: string;
  name: string;
  benchmark: string;
  benchmarkKind: BenchmarkKind;
  description: string;
  riskProfile: 'conservative' | 'moderate_conservative' | 'moderate' | 'moderate_aggressive' | 'aggressive';
  currentVersion: number;
  assignedAccounts: number;
  totalAUM: Currency;
  lastRebalanceDate: string;
  driftTolerance: Percentage;
  rebalanceFrequency: 'monthly' | 'quarterly' | 'semi_annual' | 'annual' | 'threshold_only';
  versions: ModelVersion[];
  assetClasses: AssetClassTarget[];
};

export type {
  AssetClass,
  HoldingPeriod,
  TaxLot,
  Position,
  HoldingGroup,
  AssetClassTarget,
  BenchmarkKind,
  ModelAssignment,
  AssetClassDrift,
  DriftStatus,
  SecurityKind,
  ConcentrationMetric,
  ModelChangeType,
  ModelChangeEntry,
  ModelVersion,
  ModelGovernanceDetail,
};
