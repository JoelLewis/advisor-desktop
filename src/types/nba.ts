import type { Currency } from './common';

type NBACategory =
  | 'rebalancing'
  | 'tax_management'
  | 'planning'
  | 'risk'
  | 'client_service'
  | 'compliance'
  | 'growth';

type NBAPriority = 'critical' | 'high' | 'medium' | 'low';

type NBAScoring = {
  /** Time-sensitivity of the action (0-100) */
  urgency: number;
  /** Estimated financial or relationship impact (0-100) */
  impact: number;
  /** Operational effort — higher means easier to execute (0-100) */
  efficiency: number;
  /** Client relationship strengthening potential (0-100) */
  relationship: number;
  /** AI confidence in the recommendation (0-100) */
  confidence: number;
  /** Weighted composite score (0-100) */
  composite: number;
};

type TriggerSignal = {
  source: string;
  condition: string;
  value: string;
  detectedAt: string;
};

type NBAClient = {
  id: string;
  name: string;
};

type NBAGroup = {
  id: string;
  title: string;
  category: NBACategory;
  clientIds: string[];
  count: number;
};

type NBAActionRoute = {
  path?: string;
  params?: Record<string, string>;
  openAI?: boolean;
  aiMessage?: string;
};

type BatchActionRequest = {
  groupId: string;
  nbaIds: string[];
  action: 'rebalance' | 'create_tasks' | 'contact';
};

type BatchActionResult = {
  groupId: string;
  processed: number;
  failed: number;
  message: string;
};

type NBAEscalationLevel = 'none' | 'advisor' | 'supervisor' | 'cco';

type NBAComplianceInfo = {
  /** Whether this NBA can be dismissed without supervisor override */
  nonDismissible: boolean;
  /** Current escalation level */
  escalationLevel: NBAEscalationLevel;
  /** Deadline for compliance action (hard deadline) */
  deadline?: string;
  /** Whether supervisor has overridden to allow dismiss */
  supervisorOverride?: boolean;
  /** Audit trail of actions taken on this NBA */
  auditTrail: NBAComplianceAuditEntry[];
};

type NBAComplianceAuditEntry = {
  action: 'created' | 'viewed' | 'escalated' | 'snoozed' | 'dismissed' | 'completed' | 'override_requested' | 'override_granted';
  timestamp: string;
  actor: string;
  note?: string;
};

type NBA = {
  id: string;
  title: string;
  description: string;
  category: NBACategory;
  priority: NBAPriority;
  scoring: NBAScoring;
  clients: NBAClient[];
  groupId?: string;
  trigger: TriggerSignal;
  suggestedAction: string;
  estimatedImpact: Currency;
  createdAt: string;
  expiresAt?: string;
  dismissed: boolean;
  snoozedUntil?: string;
  actionRoute?: NBAActionRoute;
  complianceInfo?: NBAComplianceInfo;
};

type NBAActionTemplate = {
  talkingPoints: string[];
  emailDraft: {
    subject: string;
    body: string;
  };
  analysisSummary: string;
  generatedAt: string;
};

type NBAEffectivenessMetrics = {
  totalActions: number;
  acceptanceRate: number;
  avgTimeToAction: number; // hours
  completionRate: number;
  complianceCompletionRate: number;
  estimatedRevenueImpact: number;
  byCategory: NBAEffectivenessByCategory[];
  trend: NBAEffectivenessTrend[];
};

type NBAEffectivenessByCategory = {
  category: NBACategory;
  total: number;
  accepted: number;
  dismissed: number;
  snoozed: number;
  avgTimeToAction: number;
  revenueImpact: number;
};

type NBAEffectivenessTrend = {
  month: string;
  generated: number;
  accepted: number;
  dismissed: number;
  completionRate: number;
  revenueImpact: number;
};

export type {
  NBACategory,
  NBAPriority,
  NBAScoring,
  TriggerSignal,
  NBAClient,
  NBAGroup,
  NBAActionRoute,
  NBAActionTemplate,
  NBAEscalationLevel,
  NBAComplianceInfo,
  NBAComplianceAuditEntry,
  BatchActionRequest,
  BatchActionResult,
  NBAEffectivenessMetrics,
  NBAEffectivenessByCategory,
  NBAEffectivenessTrend,
  NBA,
};
