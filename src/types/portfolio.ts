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

type ModelAssignment = {
  id: string;
  name: string;
  benchmark: string;
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
  totalDrift: Percentage;
  assetClassDrifts: AssetClassDrift[];
  lastCalculated: string;
  needsRebalance: boolean;
};

type ConcentrationMetric = {
  positionId: string;
  symbol: string;
  name: string;
  assetClass: AssetClass;
  marketValue: Currency;
  weight: Percentage;
  limit: Percentage;
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
  ModelAssignment,
  AssetClassDrift,
  DriftStatus,
  ConcentrationMetric,
  ModelChangeType,
  ModelChangeEntry,
  ModelVersion,
  ModelGovernanceDetail,
};
