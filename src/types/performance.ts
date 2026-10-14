import type { Percentage } from './common';
import type { AssetClass } from './portfolio';

type PerformanceSeries = {
  date: string;
  value: number;
  benchmark?: number;
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
  PerformanceSeries,
  AttributionResult,
};
