import type { Document } from '@/types/document'

export const documents: Document[] = [
  // ── Johnson Household ──
  { id: 'doc-001', name: 'Johnson Family Trust — IPS', type: 'ips', clientId: 'cli-001', accountId: 'acc-001', fileUrl: '/docs/johnson-ips.pdf', signatureStatus: 'signed', createdAt: '2025-11-15T10:00:00Z', updatedAt: '2025-11-15T10:00:00Z', createdBy: 'Sarah Mitchell', aiGenerated: false },
  { id: 'doc-002', name: 'Q4 2025 Performance Report', type: 'statement', clientId: 'cli-001', fileUrl: '/docs/johnson-q4.pdf', signatureStatus: 'not_required', createdAt: '2026-01-15T09:00:00Z', updatedAt: '2026-01-15T09:00:00Z', createdBy: 'System', aiGenerated: false },
  { id: 'doc-003', name: 'Tax Loss Harvesting Proposal', type: 'proposal', clientId: 'cli-001', accountId: 'acc-002', fileUrl: '/docs/johnson-tlh.pdf', signatureStatus: 'pending', createdAt: '2026-02-20T14:00:00Z', updatedAt: '2026-02-20T14:00:00Z', createdBy: 'AI Assistant', aiGenerated: true },
  { id: 'doc-004', name: 'Patricia Johnson — Roth IRA Agreement', type: 'agreement', clientId: 'cli-002', accountId: 'acc-004', fileUrl: '/docs/pjohnson-roth.pdf', signatureStatus: 'signed', createdAt: '2018-02-10T10:00:00Z', updatedAt: '2018-02-10T10:00:00Z', createdBy: 'Sarah Mitchell', aiGenerated: false },

  // ── Chen-Wong Household ──
  { id: 'doc-005', name: 'Chen Family Trust — IPS', type: 'ips', clientId: 'cli-003', accountId: 'acc-006', fileUrl: '/docs/chen-ips.pdf', signatureStatus: 'signed', createdAt: '2025-12-01T10:00:00Z', updatedAt: '2025-12-01T10:00:00Z', createdBy: 'Sarah Mitchell', aiGenerated: false },
  { id: 'doc-006', name: 'Quarterly Performance Update', type: 'statement', clientId: 'cli-003', fileUrl: '/docs/chen-q4.pdf', signatureStatus: 'not_required', createdAt: '2026-01-15T09:00:00Z', updatedAt: '2026-01-15T09:00:00Z', createdBy: 'System', aiGenerated: false },
  { id: 'doc-007', name: 'Estate Planning Correspondence', type: 'correspondence', clientId: 'cli-003', fileUrl: '/docs/chen-estate.pdf', signatureStatus: 'not_required', createdAt: '2026-02-10T11:00:00Z', updatedAt: '2026-02-10T11:00:00Z', createdBy: 'Sarah Mitchell', aiGenerated: false },
  { id: 'doc-008', name: 'Elizabeth Wong — Account Opening', type: 'agreement', clientId: 'cli-020', accountId: 'acc-009', fileUrl: '/docs/wong-agreement.pdf', signatureStatus: 'signed', createdAt: '2019-08-01T10:00:00Z', updatedAt: '2019-08-01T10:00:00Z', createdBy: 'Sarah Mitchell', aiGenerated: false },

  // ── Williams Household ──
  { id: 'doc-009', name: 'David Williams — IPS', type: 'ips', clientId: 'cli-004', fileUrl: '/docs/williams-ips.pdf', signatureStatus: 'signed', createdAt: '2025-09-20T10:00:00Z', updatedAt: '2025-09-20T10:00:00Z', createdBy: 'Sarah Mitchell', aiGenerated: false },
  { id: 'doc-010', name: '401(k) Rollover Proposal', type: 'proposal', clientId: 'cli-004', fileUrl: '/docs/williams-rollover.pdf', signatureStatus: 'pending', createdAt: '2026-02-21T10:30:00Z', updatedAt: '2026-02-21T10:30:00Z', createdBy: 'AI Assistant', aiGenerated: true },
  { id: 'doc-011', name: '529 Plan Beneficiary Designation', type: 'agreement', clientId: 'cli-004', accountId: 'acc-014', fileUrl: '/docs/williams-529.pdf', signatureStatus: 'signed', createdAt: '2020-06-01T10:00:00Z', updatedAt: '2020-06-01T10:00:00Z', createdBy: 'Sarah Mitchell', aiGenerated: false },

  // ── Martinez Household ──
  { id: 'doc-012', name: 'Michael Martinez — IPS', type: 'ips', clientId: 'cli-006', fileUrl: '/docs/martinez-ips.pdf', signatureStatus: 'signed', createdAt: '2025-11-05T10:00:00Z', updatedAt: '2025-11-05T10:00:00Z', createdBy: 'Sarah Mitchell', aiGenerated: false },
  { id: 'doc-013', name: '2025 Tax Report', type: 'tax_report', clientId: 'cli-006', fileUrl: '/docs/martinez-tax.pdf', signatureStatus: 'not_required', createdAt: '2026-02-01T09:00:00Z', updatedAt: '2026-02-01T09:00:00Z', createdBy: 'System', aiGenerated: false },

  // ── Thompson Household ──
  { id: 'doc-014', name: 'James Thompson — IPS', type: 'ips', clientId: 'cli-008', fileUrl: '/docs/thompson-ips.pdf', signatureStatus: 'signed', createdAt: '2025-10-10T10:00:00Z', updatedAt: '2025-10-10T10:00:00Z', createdBy: 'Sarah Mitchell', aiGenerated: false },
  { id: 'doc-015', name: 'RMD Strategy Memo', type: 'meeting_notes', clientId: 'cli-008', fileUrl: '/docs/thompson-rmd.pdf', signatureStatus: 'not_required', createdAt: '2026-02-24T09:15:00Z', updatedAt: '2026-02-24T09:15:00Z', createdBy: 'AI Assistant', aiGenerated: true },

  // ── Anderson Household ──
  { id: 'doc-016', name: 'Richard Anderson — IPS', type: 'ips', clientId: 'cli-009', fileUrl: '/docs/anderson-ips.pdf', signatureStatus: 'signed', createdAt: '2025-11-20T10:00:00Z', updatedAt: '2025-11-20T10:00:00Z', createdBy: 'Sarah Mitchell', aiGenerated: false },

  // ── Patel Household ──
  { id: 'doc-017', name: 'Raj Patel — IPS', type: 'ips', clientId: 'cli-011', fileUrl: '/docs/patel-ips.pdf', signatureStatus: 'signed', createdAt: '2025-11-01T10:00:00Z', updatedAt: '2025-11-01T10:00:00Z', createdBy: 'Sarah Mitchell', aiGenerated: false },
  { id: 'doc-018', name: 'Beneficiary Update Form', type: 'agreement', clientId: 'cli-011', fileUrl: '/docs/patel-bene.pdf', signatureStatus: 'signed', createdAt: '2026-02-24T14:22:00Z', updatedAt: '2026-02-24T14:22:00Z', createdBy: 'Raj Patel', aiGenerated: false },
  { id: 'doc-019', name: 'New Baby Financial Plan Update', type: 'proposal', clientId: 'cli-011', fileUrl: '/docs/patel-baby.pdf', signatureStatus: 'pending', createdAt: '2026-02-23T16:00:00Z', updatedAt: '2026-02-23T16:00:00Z', createdBy: 'AI Assistant', aiGenerated: true },

  // ── O'Brien Household ──
  { id: 'doc-020', name: "Brian O'Brien — Account Agreement", type: 'agreement', clientId: 'cli-013', accountId: 'acc-030', fileUrl: '/docs/obrien-agreement.pdf', signatureStatus: 'signed', createdAt: '2022-02-01T10:00:00Z', updatedAt: '2022-02-01T10:00:00Z', createdBy: 'Sarah Mitchell', aiGenerated: false },

  // ── Foster Household ──
  { id: 'doc-021', name: 'William Foster — Account Application', type: 'agreement', clientId: 'cli-017', fileUrl: '/docs/foster-app.pdf', signatureStatus: 'pending', createdAt: '2026-02-22T11:00:00Z', updatedAt: '2026-02-22T11:00:00Z', createdBy: 'William Foster', aiGenerated: false },
  { id: 'doc-022', name: 'Compliance Review — Foster Suitability', type: 'compliance', clientId: 'cli-017', fileUrl: '/docs/foster-compliance.pdf', signatureStatus: 'not_required', createdAt: '2026-02-22T14:00:00Z', updatedAt: '2026-02-22T14:00:00Z', createdBy: 'System', aiGenerated: false },
]
