import type { Currency, Percentage } from './common';

type GoalStatus = 'on_track' | 'at_risk' | 'off_track' | 'not_analyzed';

type GoalType = 'retirement' | 'education' | 'purchase' | 'legacy' | 'custom';

type Goal = {
  id: string;
  name: string;
  type: GoalType;
  targetAmount: Currency;
  currentFunding: Currency;
  targetDate: string;
  /** Monte Carlo probability of success (0-1) */
  probability: Percentage;
  status: GoalStatus;
  /** Factors contributing to any shortfall (e.g., "savings rate", "asset allocation", "time horizon") */
  shortfallDrivers: string[];
};

type FinancialPlan = {
  id: string;
  clientId: string;
  householdId: string;
  goals: Goal[];
  /** Aggregate probability of meeting all goals simultaneously */
  aggregateProbability: Percentage;
  lastUpdated: string;
  nextReviewDate: string;
};

export type {
  GoalStatus,
  GoalType,
  Goal,
  FinancialPlan,
};
