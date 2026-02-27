import type { Currency, Percentage } from './common';

type ProposalStatus =
  | 'draft'
  | 'review'
  | 'compliance_check'
  | 'finalized';

type ProposalSectionType =
  | 'cover_page'
  | 'executive_summary'
  | 'current_situation'
  | 'recommended_portfolio'
  | 'fee_schedule'
  | 'disclosures';

type ProposalSectionStatus =
  | 'pending'
  | 'generating'
  | 'generated'
  | 'edited'
  | 'error';

type ProposalSection = {
  id: string;
  type: ProposalSectionType;
  label: string;
  content: string;
  originalContent: string;
  status: ProposalSectionStatus;
  generatedAt: string | null;
  editedAt: string | null;
};

type AllocationRecommendation = {
  assetClass: string;
  targetWeight: Percentage;
  currentWeight: Percentage;
  rationale: string;
};

type ProposalFeeTier = {
  minAUM: Currency;
  maxAUM: Currency | null;
  rate: Percentage;
  label: string;
};

type ProposalTemplate = {
  id: string;
  name: string;
  description: string;
  suitableFor: string;
  sections: ProposalSectionType[];
  defaultAllocation: AllocationRecommendation[];
  feeTiers: ProposalFeeTier[];
};

type ProposalClientData = {
  clientId: string;
  clientName: string;
  email: string;
  phone: string;
  householdAUM: Currency;
  riskScore: number;
  riskTolerance: string;
  investmentObjective: string;
  timeHorizon: string;
  currentAllocation: { assetClass: string; weight: Percentage }[];
};

type ComplianceCheckStatus = 'pass' | 'warning' | 'fail';

type ProposalComplianceCheck = {
  id: string;
  rule: string;
  description: string;
  status: ComplianceCheckStatus;
  message: string;
  severity: 'critical' | 'moderate' | 'informational';
};

type ProposalDraft = {
  id: string;
  templateId: string;
  templateName: string;
  clientId: string;
  clientData: ProposalClientData;
  status: ProposalStatus;
  sections: ProposalSection[];
  allocation: AllocationRecommendation[];
  feeTiers: ProposalFeeTier[];
  complianceChecks: ProposalComplianceCheck[];
  createdAt: string;
  updatedAt: string;
  finalizedAt: string | null;
};

export type {
  ProposalStatus,
  ProposalSectionType,
  ProposalSectionStatus,
  ProposalSection,
  AllocationRecommendation,
  ProposalFeeTier,
  ProposalTemplate,
  ProposalClientData,
  ComplianceCheckStatus,
  ProposalComplianceCheck,
  ProposalDraft,
};
