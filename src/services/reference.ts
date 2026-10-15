import { get, post } from './api-client'
import type { BindingAct } from '@/types/workspace'
import type { ReferenceView, TakeResult } from '@/types/reference'
import type { BillingView } from '@/types/reference-billing'
import type { PracticeView } from '@/types/reference-practice'
import type { ReconciliationView, ResolveBreakRequest } from '@/types/reference-reconciliation'
import type { AccountRiskView, BookRiskView } from '@/types/reference-risk'
import type { AttributionPeriod, AttributionView } from '@/types/reference-attribution'
import type { ModelDetail, ModelsView } from '@/types/reference-models'
import type { BlotterFilters, BlotterView } from '@/types/reference-blotter'

const as = (viewer: string) => ({ 'X-Viewer': viewer })
const at = (path: string) => `/workspace/reference${path}`

export const getBilling = (viewer: string) => get<BillingView>(at('/billing'), undefined, as(viewer))
export const getPractice = (viewer: string) => get<PracticeView>(at('/practice'), undefined, as(viewer))
export const getReconciliation = (viewer: string) => get<ReconciliationView>(at('/reconciliation'), undefined, as(viewer))
export const getBookRisk = (viewer: string) => get<BookRiskView>(at('/risk'), undefined, as(viewer))
export const getAccountRisk = (viewer: string, accountId: string) => get<AccountRiskView>(at(`/risk/${encodeURIComponent(accountId)}`), undefined, as(viewer))
export const getReferenceAttribution = (viewer: string, accountId: string, period: AttributionPeriod) =>
  get<AttributionView>(at(`/attribution/${encodeURIComponent(accountId)}`), { period }, as(viewer))
export const getReferenceModels = (viewer: string) => get<ModelsView>(at('/models'), undefined, as(viewer))
export const getReferenceModel = (viewer: string, modelId: string) => get<ModelDetail>(at(`/models/${encodeURIComponent(modelId)}`), undefined, as(viewer))
export const getBlotter = (viewer: string, filters: BlotterFilters) =>
  get<BlotterView>(at('/blotter'), Object.fromEntries(Object.entries(filters).filter((e): e is [string, string] => typeof e[1] === 'string')), as(viewer))
export const resolveBreak = (viewer: string, request: ResolveBreakRequest) =>
  post<BindingAct>('/workspace/acts', { kind: 'resolve_break', ...request }, as(viewer))
export const takeToTeamThread = (viewer: string, view: ReferenceView, rowId: string) =>
  post<TakeResult>('/workspace/reference/take', { view, rowId }, as(viewer))
