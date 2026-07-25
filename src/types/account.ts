import type { Currency, Percentage } from './common';
import type { CurrencyCode } from './currency';

type AccountType =
  | 'individual'
  | 'joint'
  | 'traditional_ira'
  | 'roth_ira'
  | 'sep_ira'
  | '401k'
  | 'roth_401k'
  | '529'
  | 'trust_revocable'
  | 'trust_irrevocable'
  | 'ugma_utma'
  | 'entity'
  | 'inherited_ira'
  | 'simple_ira';

type AccountStatus = 'active' | 'pending' | 'frozen' | 'closed';

type TaxTreatment = 'taxable' | 'tax_deferred' | 'tax_free' | 'trust_taxable';

type UMASleeve = {
  id: string;
  name: string;
  strategy: string;
  manager: string;
  targetAllocation: Percentage;
  actualAllocation: Percentage;
  value: Currency;
};

/**
 * D35 — `not_applicable` is the honest election for a Roth IRA or a 529: distributions are tax-free
 * and gains are never realised for tax purposes, so no lot-selection method is in force.
 */
type CostBasisMethod = 'specific_id' | 'fifo' | 'average_cost' | 'not_applicable';

type Account = {
  id: string;
  accountNumber: string;
  name: string;
  type: AccountType;
  status: AccountStatus;
  taxTreatment: TaxTreatment;
  clientId: string;
  householdId: string;
  totalValue: Currency;
  cashBalance: Currency;
  isUMA: boolean;
  sleeves?: UMASleeve[];
  modelId: string;
  custodian: string;
  openDate: string;
  lastRebalance: string | null;
  costBasisMethod: CostBasisMethod;
  baseCurrency?: CurrencyCode;
};

export type {
  AccountType,
  AccountStatus,
  TaxTreatment,
  CostBasisMethod,
  UMASleeve,
  Account,
};
