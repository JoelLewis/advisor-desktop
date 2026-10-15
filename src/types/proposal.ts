import type { Currency, Percentage } from './common';

type ProposalFeeTier = {
  minAUM: Currency;
  maxAUM: Currency | null;
  rate: Percentage;
  label: string;
};

export type {
  ProposalFeeTier,
};
