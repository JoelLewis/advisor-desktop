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
  /**
   * The last day of the latest open loss-sale window of this account's wash-sale taxpayer
   * (`openWashSaleWindowsFor`: the couple, IRAs and Roths included) on this lot's symbol, or `null`
   * when there is none. It restricts **buying the symbol back** (IRC §1091), not selling this lot:
   * selling a lot at a loss is the harvest itself.
   */
  repurchaseBlockedUntil: string | null;
  /**
   * How many of this lot's shares would have their loss taken by §1091 if it were sold today:
   * replacement shares the same taxpayer bought in the last 30 days, matched one for one to loss
   * shares (Treas. Reg. §1.1091-1(c)), so only that proportion of the loss is affected. Both 0 for
   * a lot at a gain or with nothing to match.
   */
  saleWash: SaleWash;
};

type SaleWash = {
  /** Matched to a replacement in a taxable account: that part of the loss moves into the replacement's basis (§1091(d)). */
  deferredShares: number;
  /** Matched to a replacement in an IRA, Roth or other tax-advantaged account: that part of the loss is permanently disallowed (Rev. Rul. 2008-5). */
  disallowedShares: number;
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

/**
 * A position as it is stored, before a weight exists.
 *
 * `weight` is `marketValue / account.totalValue` and nothing else, so storing it beside
 * `marketValue` stores the same fact twice. It was stored, hand-typed to three decimals, and the
 * two disagreed on 135 of 350 served positions — by up to 0.0500pp, $6,000 on acc-006's AGG line.
 * A seed carries the facts that cannot be derived; `getPositionsForAccount` divides.
 */
type PositionSeed = Omit<Position, 'weight'>;

/**
 * What `benchmark` actually is. Every model here computes its "benchmark" return from its own
 * target weights (`Σ wb·Rb,i` in the attribution) — there is no real external index return series
 * behind any of them yet. `'model_policy'` says so explicitly, so a future model that *does* carry
 * a real external index's returns can be added as `'external_index'` without the two being
 * confused for each other.
 */
type BenchmarkKind = 'model_policy' | 'external_index';

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

export type {
  AssetClass,
  TaxLot,
  Position,
  PositionSeed,
  BenchmarkKind,
  DriftStatus,
};
