import type { Percentage } from './common';
import type { AssetClass } from './portfolio';

type ReturnPeriod = 'mtd' | 'qtd' | 'ytd' | '1y' | '3y' | '5y' | '10y' | 'inception';

type PerformanceSeries = {
  date: string;
  value: number;
  benchmark?: number;
};

type BenchmarkComparison = {
  period: ReturnPeriod;
  portfolioReturn: Percentage;
  benchmarkReturn: Percentage;
  /**
   * C6 · performance-reporting — plain active (excess) return, portfolio − benchmark. This was
   * named `alpha`, which means the risk-adjusted excess return over CAPM, not this figure.
   * Tracking error is one annualised statistic and now lives on `RiskMetrics`, not per period.
   */
  activeReturn: Percentage;
};

type AttributionResult = {
  assetClass: AssetClass;
  /** Return contribution from asset allocation decisions */
  allocation: Percentage;
  /** Return contribution from security selection within the asset class */
  selection: Percentage;
  /** Cross-term interaction effect */
  interaction: Percentage;
  /** Total attribution (allocation + selection + interaction) */
  total: Percentage;
};

export type {
  ReturnPeriod,
  PerformanceSeries,
  BenchmarkComparison,
  AttributionResult,
};
