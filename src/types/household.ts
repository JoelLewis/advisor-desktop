import type { Currency } from './common';
import type { ClientSegment } from './client';

type HouseholdRelationship = 'primary' | 'spouse' | 'child' | 'parent' | 'other';

type HouseholdMember = {
  clientId: string;
  name: string;
  relationship: HouseholdRelationship;
  dateOfBirth: string;
};

type Household = {
  id: string;
  name: string;
  members: HouseholdMember[];
  totalAUM: Currency;
  managedAUM: Currency;
  heldAwayAUM: Currency;
  accountIds: string[];
  primaryContactId: string;
  segment: ClientSegment;
  createdAt: string;
  /**
   * How the primary and spouse file, when the firm has it on record. Absent means not on file,
   * and nothing assumes a joint return: each member's accounts are netted on their own.
   */
  filingStatus?: 'married_filing_jointly' | 'married_filing_separately';
};

/**
 * The shape a household fixture is allowed to hold. `totalAUM` and `managedAUM`
 * are derived from `accounts.ts` and must never appear in a literal.
 */
type HouseholdFixture = Omit<Household, 'totalAUM' | 'managedAUM'>;

export type {
  HouseholdRelationship,
  Household,
  HouseholdFixture,
};
