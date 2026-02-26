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

export type {
  HouseholdRelationship,
  HouseholdMember,
  FamilyTreeNode,
  Household,
};
