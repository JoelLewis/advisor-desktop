import { crmHandlers } from './crm'
import { calendarHandlers } from './calendar'
import { nbaHandlers } from './nba'
import { pmsHandlers } from './pms'
import { omsHandlers } from './oms'
import { custodianHandlers } from './custodian'
import { planningHandlers } from './planning'
import { documentHandlers } from './documents'
import { workflowHandlers } from './workflows'
import { complianceHandlers } from './compliance'
import { reconciliationHandlers } from './reconciliation'
import { settingsHandlers } from './settings'
import { aiHandlers } from './ai'
import { prospectHandlers } from './prospects'
import { messagingHandlers } from './messaging'
import { searchHandlers } from './search'
import { onboardingHandlers } from './onboarding'
import { tradingHandlers } from './trading'
import { engageHandlers } from './engage'
import { proposalHandlers } from './proposals'
import { fxHandlers } from './fx'
import { notificationHandlers } from './notifications'
import { reportHandlers } from './reports'
import { archiveHandlers } from './archives'
import { emailTemplateHandlers } from './email-templates'
import { workspaceHandlers } from './workspace'

export const handlers = [
  ...crmHandlers,
  ...calendarHandlers,
  ...nbaHandlers,
  ...pmsHandlers,
  ...omsHandlers,
  ...custodianHandlers,
  ...planningHandlers,
  ...documentHandlers,
  ...workflowHandlers,
  ...complianceHandlers,
  ...reconciliationHandlers,
  ...settingsHandlers,
  ...aiHandlers,
  ...prospectHandlers,
  ...messagingHandlers,
  ...searchHandlers,
  ...onboardingHandlers,
  ...tradingHandlers,
  ...engageHandlers,
  ...proposalHandlers,
  ...fxHandlers,
  ...notificationHandlers,
  ...reportHandlers,
  ...archiveHandlers,
  ...emailTemplateHandlers,
  ...workspaceHandlers,
]
