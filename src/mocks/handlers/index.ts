import { crmHandlers } from './crm'
import { pmsHandlers } from './pms'
import { omsHandlers } from './oms'
import { custodianHandlers } from './custodian'
import { complianceHandlers } from './compliance'
import { workspaceHandlers } from './workspace'

export const handlers = [
  ...crmHandlers,
  ...pmsHandlers,
  ...omsHandlers,
  ...custodianHandlers,
  ...complianceHandlers,
  ...workspaceHandlers,
]
