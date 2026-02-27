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
import { revenueHandlers } from './revenue'
import { messagingHandlers } from './messaging'
import { searchHandlers } from './search'
import { onboardingHandlers } from './onboarding'
import { practiceHandlers } from './practice'
import { tradingHandlers } from './trading'
import { engageHandlers } from './engage'
import { proposalHandlers } from './proposals'
import { fxHandlers } from './fx'
import { notificationHandlers } from './notifications'
import { billingHandlers } from './billing'
import { reportHandlers } from './reports'
import { archiveHandlers } from './archives'
import { emailTemplateHandlers } from './email-templates'

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
  ...revenueHandlers,
  ...messagingHandlers,
  ...searchHandlers,
  ...onboardingHandlers,
  ...practiceHandlers,
  ...tradingHandlers,
  ...engageHandlers,
  ...proposalHandlers,
  ...fxHandlers,
  ...notificationHandlers,
  ...billingHandlers,
  ...reportHandlers,
  ...archiveHandlers,
  ...emailTemplateHandlers,
]
