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

/**
 * The attribution endpoint's envelope.
 *
 * The effects mean nothing without the model that produced them: Brinson-Fachler measures the
 * allocation effect against the benchmark's *total* return, Brinson-Hood-Beebower against the
 * sector's own return, and the two disagree class by class. A reader cannot tell which is in use
 * from the numbers alone, so the response names it, along with the linking, the benchmark and the
 * fee basis.
 */
type AttributionResponse = {
  model: 'Brinson-Fachler';
  /** Single period, arithmetic. Sub-period geometric linking (Carino et al.) is not modelled. */
  linking: 'single-period arithmetic';
  period: string;
  benchmark: string;
  basis: 'gross of fees';
  asOf: string;
  rows: AttributionResult[];
  totals: {
    allocation: Percentage;
    selection: Percentage;
    interaction: Percentage;
    total: Percentage;
  };
  /** Rp − Rb over the period. Equals `totals.total` by construction. */
  activeReturn: Percentage;
};

export type {
  ReturnPeriod,
  PerformanceSeries,
  BenchmarkComparison,
  AttributionResult,
  AttributionResponse,
};
