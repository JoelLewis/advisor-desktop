import type { EmailTemplate } from '@/types/email-template'

export const emailTemplates: EmailTemplate[] = [
  {
    id: 'et-001',
    name: 'Post-Meeting Follow-Up',
    subject: 'Great speaking with you, {{client.first_name}} — Next Steps',
    body: `Dear {{client.first_name}},

Thank you for taking the time to meet with me on {{meeting.date}}. I truly value our partnership and enjoyed catching up on your financial goals.

Here's a quick recap of what we discussed and our action items:

**Portfolio Performance**
Your portfolio is currently valued at {{portfolio.total_value}}, with a year-to-date return of {{portfolio.ytd_return}} compared to the benchmark at {{portfolio.benchmark_return}}.

**Next Steps**
1. I will review the rebalancing opportunities we discussed and send you a proposal by end of next week
2. Our team will research the tax-loss harvesting candidates we identified
3. We'll schedule a follow-up call to review the updated financial plan

Please don't hesitate to reach out if you have any questions in the meantime.

Best regards,
{{advisor.name}}
{{advisor.title}}
{{advisor.firm}}`,
    category: 'email',
    version: 2,
    createdAt: '2025-10-15T09:00:00Z',
    updatedAt: '2026-01-20T14:30:00Z',
  },
  {
    id: 'et-002',
    name: 'Quarterly Review Invitation',
    subject: '{{current.quarter}} Portfolio Review — Let\'s Schedule',
    body: `Dear {{client.first_name}},

I hope this message finds you well. As we approach the end of the quarter, I'd like to schedule our periodic portfolio review.

During our meeting, we'll cover:
- Portfolio performance vs. benchmark for {{current.quarter}}
- Asset allocation and any rebalancing needs
- Progress toward your financial goals
- Any changes in your personal or financial situation

I have availability on the following dates:
- [Date Option 1]
- [Date Option 2]
- [Date Option 3]

Please let me know which works best for you, or suggest an alternative time that fits your schedule.

Looking forward to connecting,
{{advisor.name}}
{{advisor.title}}`,
    category: 'email',
    version: 1,
    createdAt: '2025-11-01T10:00:00Z',
    updatedAt: '2025-11-01T10:00:00Z',
  },
  {
    id: 'et-003',
    name: 'Meeting Prep Brief',
    subject: 'Meeting Brief: {{client.name}} — {{meeting.date}}',
    body: `# Meeting Prep Brief
**Client:** {{client.name}}
**Date:** {{meeting.date}} at {{meeting.time}}

## Portfolio Overview
- Total Value: {{portfolio.total_value}}
- YTD Return: {{portfolio.ytd_return}} (Benchmark: {{portfolio.benchmark_return}})

## Key Discussion Points
1. Performance attribution — what drove returns this period
2. Rebalancing needs based on current drift analysis
3. Goal progress check and any timeline adjustments
4. Tax planning opportunities for the remainder of the year

## Action Items from Last Meeting
- [Review and update from CRM notes]

## Preparation Checklist
- [ ] Review latest performance report
- [ ] Check for any pending compliance items
- [ ] Review recent communications
- [ ] Prepare updated financial plan projections`,
    category: 'meeting_prep',
    version: 3,
    createdAt: '2025-09-01T08:00:00Z',
    updatedAt: '2026-02-10T11:00:00Z',
  },
  {
    id: 'et-004',
    name: 'New Client Welcome',
    subject: 'Welcome to {{advisor.firm}}, {{client.first_name}}!',
    body: `Dear {{client.first_name}},

Welcome to {{advisor.firm}}! I'm delighted to have you as a client and look forward to helping you achieve your financial goals.

Here's what you can expect in the coming days:

**This Week**
- Account setup confirmation from our custodian
- Access credentials for your client portal
- A copy of your signed Investment Policy Statement

**Next 30 Days**
- Initial portfolio construction based on your risk profile and goals
- First performance report once your portfolio is fully invested
- Introduction to our client service team

**Your Team**
- {{advisor.name}}, {{advisor.title}} — your primary advisor
- Our Client Service team is available at [phone] or [email]

If you have any questions during the onboarding process, don't hesitate to reach out.

Welcome aboard,
{{advisor.name}}`,
    category: 'email',
    version: 1,
    createdAt: '2026-01-05T09:00:00Z',
    updatedAt: '2026-01-05T09:00:00Z',
  },
  {
    id: 'et-005',
    name: 'Compliance Review Summary',
    subject: 'Compliance Review Complete — {{account.name}} ({{account.number}})',
    body: `# Compliance Review Summary

**Account:** {{account.name}} ({{account.number}})
**Client:** {{client.name}}
**Review Date:** {{current.date}}
**Reviewer:** {{advisor.name}}

## Review Results
- IPS Compliance: ✅ Within guidelines
- Concentration Limits: ✅ No breaches
- Suitability: ✅ Appropriate for risk profile
- Trading Activity: ✅ Consistent with investment objectives

## Notes
[Add compliance notes here]

## Required Actions
- [ ] File review documentation
- [ ] Update compliance calendar
- [ ] Notify compliance officer if any exceptions noted`,
    category: 'compliance',
    version: 1,
    createdAt: '2026-02-01T10:00:00Z',
    updatedAt: '2026-02-01T10:00:00Z',
  },
  {
    id: 'et-006',
    name: 'Investment Proposal Cover Letter',
    subject: 'Investment Proposal for {{client.name}} — {{current.date}}',
    body: `Dear {{client.first_name}},

Please find enclosed the investment proposal we discussed during our recent meeting.

This proposal outlines our recommended approach based on your:
- Investment objectives and risk tolerance
- Time horizon and liquidity needs
- Tax situation and estate planning considerations

**Proposed Portfolio Highlights**
- Target allocation designed for long-term growth with appropriate risk management
- Estimated annual fee: [fee rate]% of assets under management
- Projected long-term return based on capital market assumptions

Please review the enclosed proposal at your convenience. I'm available to discuss any questions or modifications you'd like to make.

I look forward to your feedback.

Sincerely,
{{advisor.name}}
{{advisor.title}}
{{advisor.firm}}`,
    category: 'proposal',
    version: 2,
    createdAt: '2025-12-15T09:00:00Z',
    updatedAt: '2026-01-30T16:00:00Z',
  },
]
