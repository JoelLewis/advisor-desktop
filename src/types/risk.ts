import type { Currency, Percentage } from './common';

type RiskMetrics = {
  /** Portfolio sensitivity to the global equity market (1.0 = market). */
  beta: number;
  /** (R₁ᵧ − risk-free) ÷ σ, from the same return series the performance tab shows. */
  sharpe: number;
  /** (R₁ᵧ − risk-free) ÷ downside deviation. */
  sortino: number;
  /** Modelled trailing-3-year peak-to-trough decline. */
  maxDrawdown: Percentage;
  /** Annualised standard deviation of returns. */
  standardDeviation: Percentage;
  downsideDeviation: Percentage;
  riskFreeRate: Percentage;
  /** Estimated loss not exceeded with `var95Confidence` probability over `var95Horizon`. */
  var95: Currency;
  var95Percent: Percentage;
  var95Horizon: string;
  var95Confidence: number;
  var95Method: 'parametric' | 'historical' | 'monte_carlo';
  /** Name of the benchmark that beta and tracking error are measured against. */
  benchmark: string;
  /** One annualised active-risk statistic, not a per-horizon value. */
  trackingError: Percentage;
  asOf: string;
};

type FactorExposure = {
  factor: string;
  exposure: number;
  benchmark: number;
};

type PositionImpact = {
  positionId: string;
  symbol: string;
  name: string;
  currentValue: Currency;
  projectedValue: Currency;
  impact: Currency;
  impactPercent: Percentage;
};

type StressScenario = {
  id: string;
  name: string;
  description: string;
  portfolioImpact: Percentage;
  positionImpacts: PositionImpact[];
};

export type {
  RiskMetrics,
  FactorExposure,
  PositionImpact,
  StressScenario,
};
