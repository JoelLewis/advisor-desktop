import type { RiskQuestion, AccountRequirement } from '@/types/onboarding'

export const riskQuestions: RiskQuestion[] = [
  {
    id: 'rq-01', text: 'What is your primary investment time horizon?',
    options: [
      { label: 'Less than 3 years', score: 5 },
      { label: '3-5 years', score: 25 },
      { label: '5-10 years', score: 50 },
      { label: '10-20 years', score: 75 },
      { label: 'More than 20 years', score: 95 },
    ],
  },
  {
    id: 'rq-02', text: 'How would you react if your portfolio lost 20% of its value in one month?',
    options: [
      { label: 'Sell everything immediately', score: 5 },
      { label: 'Sell some holdings to reduce risk', score: 25 },
      { label: 'Hold and wait for recovery', score: 55 },
      { label: 'Buy more to take advantage of lower prices', score: 85 },
    ],
  },
  {
    id: 'rq-03', text: 'What is your primary investment goal?',
    options: [
      { label: 'Preserve capital — minimize losses', score: 10 },
      { label: 'Generate steady income', score: 30 },
      { label: 'Balanced growth and income', score: 55 },
      { label: 'Maximize long-term growth', score: 80 },
      { label: 'Aggressive growth — willing to accept significant risk', score: 95 },
    ],
  },
  {
    id: 'rq-04', text: 'What is your annual household income?',
    options: [
      { label: 'Under $75,000', score: 15 },
      { label: '$75,000 - $150,000', score: 35 },
      { label: '$150,000 - $300,000', score: 55 },
      { label: '$300,000 - $500,000', score: 75 },
      { label: 'Over $500,000', score: 90 },
    ],
  },
  {
    id: 'rq-05', text: 'How much investment experience do you have?',
    options: [
      { label: 'None — this is my first investment', score: 10 },
      { label: 'Limited — mostly savings and CDs', score: 25 },
      { label: 'Moderate — stocks, bonds, and mutual funds', score: 50 },
      { label: 'Extensive — including options and alternatives', score: 80 },
      { label: 'Professional — I work in financial services', score: 95 },
    ],
  },
  {
    id: 'rq-06', text: 'What percentage of your total net worth will this account represent?',
    options: [
      { label: 'More than 75%', score: 10 },
      { label: '50-75%', score: 25 },
      { label: '25-50%', score: 50 },
      { label: '10-25%', score: 70 },
      { label: 'Less than 10%', score: 90 },
    ],
  },
  {
    id: 'rq-07', text: 'How important is it for your investments to be liquid (easily converted to cash)?',
    options: [
      { label: 'Extremely important — I may need funds at any time', score: 10 },
      { label: 'Very important — within 1-2 months', score: 30 },
      { label: 'Moderately important — can wait 6+ months', score: 55 },
      { label: 'Not very important — I have other sources of liquidity', score: 80 },
    ],
  },
  {
    id: 'rq-08', text: 'Which statement best describes your comfort with investment volatility?',
    options: [
      { label: 'I prefer stable returns, even if lower', score: 10 },
      { label: 'I can tolerate small fluctuations for slightly higher returns', score: 30 },
      { label: 'I accept moderate fluctuations for better long-term returns', score: 55 },
      { label: 'I am comfortable with significant fluctuations for maximum growth', score: 85 },
    ],
  },
]

export const accountRequirements: AccountRequirement[] = [
  {
    accountType: 'individual', label: 'Individual Brokerage',
    additionalFields: [],
    requiredDocuments: ['Advisory Agreement', 'W-9', 'Form CRS', 'Privacy Notice'],
  },
  {
    accountType: 'joint', label: 'Joint Account',
    additionalFields: [
      { name: 'jointOwnerName', label: 'Joint Owner Full Name', type: 'text', required: true },
      { name: 'jointOwnerSSN', label: 'Joint Owner SSN (last 4)', type: 'text', required: true },
      { name: 'jointOwnerDOB', label: 'Joint Owner Date of Birth', type: 'date', required: true },
    ],
    requiredDocuments: ['Advisory Agreement', 'W-9', 'Form CRS', 'Privacy Notice', 'Joint Account Agreement'],
  },
  {
    accountType: 'trust', label: 'Trust Account',
    additionalFields: [
      { name: 'trustName', label: 'Trust Name', type: 'text', required: true },
      { name: 'trustEIN', label: 'Trust EIN', type: 'text', required: true },
      { name: 'trustDate', label: 'Trust Formation Date', type: 'date', required: true },
      { name: 'trusteeNames', label: 'Trustee Name(s)', type: 'text', required: true },
    ],
    requiredDocuments: ['Advisory Agreement', 'W-9', 'Form CRS', 'Privacy Notice', 'Trust Certification', 'Trust Document (first & last pages)'],
  },
  {
    accountType: 'traditional_ira', label: 'Traditional IRA',
    additionalFields: [
      { name: 'beneficiaryName', label: 'Primary Beneficiary', type: 'text', required: true },
      { name: 'beneficiaryRelation', label: 'Beneficiary Relationship', type: 'select', required: true, options: ['Spouse', 'Child', 'Other Family', 'Trust', 'Estate'] },
    ],
    requiredDocuments: ['Advisory Agreement', 'W-9', 'Form CRS', 'Privacy Notice', 'IRA Application', 'Beneficiary Designation Form'],
  },
  {
    accountType: 'roth_ira', label: 'Roth IRA',
    additionalFields: [
      { name: 'beneficiaryName', label: 'Primary Beneficiary', type: 'text', required: true },
      { name: 'beneficiaryRelation', label: 'Beneficiary Relationship', type: 'select', required: true, options: ['Spouse', 'Child', 'Other Family', 'Trust', 'Estate'] },
    ],
    requiredDocuments: ['Advisory Agreement', 'W-9', 'Form CRS', 'Privacy Notice', 'Roth IRA Application', 'Beneficiary Designation Form'],
  },
  {
    accountType: 'entity', label: 'Entity (LLC/Corp)',
    additionalFields: [
      { name: 'entityName', label: 'Entity Legal Name', type: 'text', required: true },
      { name: 'entityEIN', label: 'Entity EIN', type: 'text', required: true },
      { name: 'entityType', label: 'Entity Type', type: 'select', required: true, options: ['LLC', 'S-Corp', 'C-Corp', 'Partnership', 'Sole Proprietorship'] },
      { name: 'authorizedSigner', label: 'Authorized Signer', type: 'text', required: true },
    ],
    requiredDocuments: ['Advisory Agreement', 'W-9', 'Form CRS', 'Privacy Notice', 'Entity Resolution', 'Articles of Incorporation/Organization', 'Operating Agreement'],
  },
]
