import type { Currency, Percentage } from './common';

type RiskMetrics = {
  /** Portfolio sensitivity to market movements (1.0 = market neutral) */
  beta: number;
  /** Risk-adjusted return: (return - risk-free rate) / std deviation */
  sharpe: number;
  /** Downside risk-adjusted return: (return - risk-free rate) / downside deviation */
  sortino: number;
  /** Largest peak-to-trough decline as a percentage */
  maxDrawdown: Percentage;
  /** Annualized standard deviation of returns */
  standardDeviation: Percentage;
  /** 95th percentile Value at Risk — maximum expected loss over a given period at 95% confidence */
  var95: Currency;
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
