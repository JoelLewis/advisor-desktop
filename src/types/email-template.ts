export type TemplateCategory = 'email' | 'meeting_prep' | 'proposal' | 'presentation' | 'compliance'

export const TEMPLATE_CATEGORIES: { value: TemplateCategory; label: string }[] = [
  { value: 'email', label: 'Email' },
  { value: 'meeting_prep', label: 'Meeting Prep' },
  { value: 'proposal', label: 'Proposal' },
  { value: 'presentation', label: 'Presentation' },
  { value: 'compliance', label: 'Compliance' },
]

export type TemplateVariable = {
  key: string
  label: string
  sampleValue: string
}

export const TEMPLATE_VARIABLES: TemplateVariable[] = [
  { key: 'client.name', label: 'Client Name', sampleValue: 'Robert Johnson' },
  { key: 'client.first_name', label: 'Client First Name', sampleValue: 'Robert' },
  { key: 'client.email', label: 'Client Email', sampleValue: 'robert.johnson@email.com' },
  { key: 'advisor.name', label: 'Advisor Name', sampleValue: 'Sarah Mitchell' },
  { key: 'advisor.title', label: 'Advisor Title', sampleValue: 'Senior Financial Advisor' },
  { key: 'advisor.firm', label: 'Firm Name', sampleValue: 'Mitchell Wealth Advisors' },
  { key: 'portfolio.total_value', label: 'Portfolio Value', sampleValue: '$2,450,000' },
  { key: 'portfolio.ytd_return', label: 'YTD Return', sampleValue: '+8.2%' },
  { key: 'portfolio.benchmark_return', label: 'Benchmark Return', sampleValue: '+7.1%' },
  { key: 'meeting.date', label: 'Meeting Date', sampleValue: 'March 15, 2026' },
  { key: 'meeting.time', label: 'Meeting Time', sampleValue: '2:00 PM EST' },
  { key: 'account.name', label: 'Account Name', sampleValue: 'Joint Brokerage' },
  { key: 'account.number', label: 'Account Number', sampleValue: '****4892' },
  { key: 'current.date', label: 'Current Date', sampleValue: 'February 27, 2026' },
  { key: 'current.quarter', label: 'Current Quarter', sampleValue: 'Q1 2026' },
]

export type EmailTemplate = {
  id: string
  name: string
  subject: string
  body: string
  category: TemplateCategory
  version: number
  createdAt: string
  updatedAt: string
}
