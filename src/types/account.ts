import type { Currency, Percentage } from './common';
import type { CurrencyCode } from './currency';
import type { AssetClass } from './portfolio';

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
 * and gains are never realized for tax purposes, so no lot-selection method is in force.
 */
type CostBasisMethod = 'specific_id' | 'fifo' | 'average_cost' | 'not_applicable';

type AccountBase = {
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
  custodian: string;
  openDate: string;
  lastRebalance: string | null;
  costBasisMethod: CostBasisMethod;
  baseCurrency?: CurrencyCode;
};

/** Follows one of the firm's models: measured for drift against it and rebalanced to it. */
type ModelMandate = { mandate: 'model'; modelId: string; transition?: AccountTransition };

/**
 * A model-managed account that has not yet arrived on its model: assets transferred in kind are moved onto
 * the model in tax-aware stages, so the account is shown outside its band until they have. Firm-only.
 */
type AccountTransition = {
  kind: 'in_kind_transfer';
  /** The trading day the assets arrived. */
  since: string;
  note: string;
};

/**
 * Not model-managed: the client's own instructions for the account (a single market, a single asset
 * class). There is no model to drift from, so no drift band; the account is still measured on risk
 * against the client's tolerance, and against the benchmark its mandate names.
 */
type CustomMandate = {
  mandate: 'custom';
  /** One line, e.g. "Hong Kong-listed equities, held at the client's instruction". */
  mandateSummary: string;
  benchmark: { name: string; weights: readonly { assetClass: AssetClass; weight: number }[] };
};

type ModelManagedAccount = AccountBase & ModelMandate;
type CustomMandateAccount = AccountBase & CustomMandate;
type Account = ModelManagedAccount | CustomMandateAccount;

export type {
  AccountType,
  AccountStatus,
  TaxTreatment,
  CostBasisMethod,
  AccountTransition,
  UMASleeve,
  Account,
  ModelManagedAccount,
  CustomMandateAccount,
};
