import type { Currency } from './common';
import type { ClientSegment } from './client';

type HouseholdRelationship = 'primary' | 'spouse' | 'child' | 'parent' | 'other';

type HouseholdMember = {
  clientId: string;
  name: string;
  relationship: HouseholdRelationship;
  dateOfBirth: string;
};

type FamilyTreeNode = {
  member: HouseholdMember;
  children: FamilyTreeNode[];
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
};

/**
 * D1 · data-quality — the shape a household fixture is allowed to hold. `totalAUM` and `managedAUM`
 * are derived from `accounts.ts` and must never appear in a literal.
 */
type HouseholdFixture = Omit<Household, 'totalAUM' | 'managedAUM'>;

export type {
  HouseholdRelationship,
  HouseholdMember,
  FamilyTreeNode,
  Household,
  HouseholdFixture,
};
