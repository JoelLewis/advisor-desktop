import type { Currency } from './common';

type ClientSegment = 'platinum' | 'gold' | 'silver' | 'bronze';

type ReviewFrequency = 'monthly' | 'quarterly' | 'semi_annual' | 'annual';

type ClientTier = {
  segment: ClientSegment;
  label: string;
  /** Minimum assets under management to qualify for this tier */
  minAUM: Currency;
  reviewFrequency: ReviewFrequency;
};

type Address = {
  street1: string;
  street2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

type ContactInfo = {
  email: string;
  phone: string;
  mobilePhone?: string;
  address: Address;
  preferredContactMethod?: 'email' | 'phone' | 'mail';
};

type RiskTolerance = 'conservative' | 'moderate' | 'aggressive' | 'growth';

type RiskProfile = {
  tolerance: RiskTolerance;
  /** Risk score from 1 (most conservative) to 100 (most aggressive) */
  score: number;
  lastAssessed: string;
};

type Client = {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
  segment: ClientSegment;
  tier: ClientTier;
  advisorId: string;
  totalAUM: Currency;
  householdId: string;
  riskProfile: RiskProfile;
  contactInfo: ContactInfo;
  dateOfBirth: string;
  occupation: string;
  photo?: string;
  createdAt: string;
  updatedAt: string;
};

export type {
  ClientSegment,
  ReviewFrequency,
  ClientTier,
  Address,
  ContactInfo,
  RiskTolerance,
  RiskProfile,
  Client,
};
