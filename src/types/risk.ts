import type { Currency, Percentage } from './common';

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
  StressScenario,
};
