import type { Account } from '@/types/account'
import type { MethodNote, RowQuote } from '@/types/reference'
import type { Client } from '@/types/client'
import type { AccountRiskView, BookRiskView, HouseholdRisk, RiskPosture, ToleranceStatus } from '@/types/reference-risk'
import { accounts } from '@/mocks/data/accounts'
import { clients } from '@/mocks/data/clients'
import { households } from '@/mocks/data/households'
import { concentrationFor, riskProfileFor, stressScenariosFor } from '@/mocks/handlers/pms'
import { MODEL_DEFINITIONS } from '@/mocks/data/model-definitions'
import { isFirmViewer } from '@/mocks/workspace/visibility'
import { correlationAssumptionsText, parametricVaR } from '@/lib/risk-model'
import { RISK_PROFILE_TABLE, bandFor } from '@/lib/risk-profile'
import { MOCK_NOW_ISO } from '@/lib/clock'
import { GLIDE_PATH_MODELS } from '@/mocks/data/model-governance'
import { factorRows } from './factors'
import { mandateNameOf, modelVolatility } from './models'
import { riskScoreOf } from './risk-score'

/** The account's owner, from the CRM. Every account names one. */
export function clientOf(account: Account) {
  const client = clients.find((c) => c.id === account.clientId)
  if (!client) throw new Error(`${account.id} names no client`)
  return client
}

const followsGlidePath = (account: Account) => account.mandate === 'model' && GLIDE_PATH_MODELS.has(account.modelId)

/** Status rank in the book's reading order: above, then below, then within, then glide paths. */
const STATUS_RANK: Readonly<Record<ToleranceStatus, number>> = { above: 3, below: 2, within: 1, glide_path: 0 }

/**
 * Tolerance is a band, not a point: a questionnaire score of 60 accepts the Moderate
 * Aggressive band (56–75), not "exactly 60". `beyond` is how far the account's score sits outside that
 * band; its sign is the status, and because the bands partition 0–100 in whole points this is the same
 * status a band-rank comparison gives. One key orders the book and the table's header click alike.
 */
function postureAt(score: number, client: Client, glide: boolean): RiskPosture {
  const own = bandFor(score)
  const tolerance = bandFor(client.riskProfile.score)
  const beyond = glide ? 0 : score > tolerance.ceiling ? score - tolerance.ceiling : score < tolerance.floor ? score - tolerance.floor : 0
  const status: ToleranceStatus = glide ? 'glide_path' : beyond > 0 ? 'above' : beyond < 0 ? 'below' : 'within'
  const headroom = score - tolerance.ceiling
  const within = status === 'within' ? 100 + headroom : 0
  return {
    score, band: own.label, status, beyond, headroom, sortKey: STATUS_RANK[status] * 1000 + Math.abs(beyond) + within,
    tolerance: { clientId: client.id, clientName: client.fullName, score: client.riskProfile.score, band: tolerance.label, floor: tolerance.floor, ceiling: tolerance.ceiling, assessedOn: client.riskProfile.lastAssessed },
  }
}

const postureOf = (account: Account, vol: number): RiskPosture => postureAt(riskScoreOf(vol), clientOf(account), followsGlidePath(account))

const householdNameOf = (householdId: string) => {
  const household = households.find((h) => h.id === householdId)
  if (!household) throw new Error(`No household ${householdId}`)
  return household.name
}

/**
 * Suitability is judged per household: the client's accounts in the household (a glide path aside, as it
 * is aside from the tolerance), each account's score weighted by its value, on the same scale and against
 * the same band. A spouse's accounts are measured against the spouse's own questionnaire. Undefined when
 * the client holds no measured account.
 */
export function householdRiskOf(clientId: string): HouseholdRisk | undefined {
  const client = clients.find((c) => c.id === clientId)
  if (!client) throw new Error(`No client ${clientId}`)
  const measured = accounts.filter((a) => a.clientId === clientId && !followsGlidePath(a)).map((a) => ({ id: a.id, ...riskProfileFor(a) }))
  if (measured.length === 0) return undefined
  const value = measured.reduce((s, p) => s + p.value, 0)
  const score = Math.round(measured.reduce((s, p) => s + riskScoreOf(p.vol) * p.value, 0) / value)
  return {
    clientId, clientName: client.fullName, householdName: householdNameOf(client.householdId),
    accountIds: measured.map((p) => p.id), value, posture: postureAt(score, client, false),
  }
}

const modelName = (modelId: string) => {
  const model = MODEL_DEFINITIONS.find((m) => m.id === modelId)
  if (!model) throw new Error(`No model ${modelId}`)
  return model.name
}

const pct = (vol: number, digits: number) => (vol * 100).toFixed(digits)

/** Each band's model, its σ and the score it anchors, and the steepest step (most points per unit of σ) between adjacent bands' models — all read from the engine. */
function scaleText(): string {
  const anchors = RISK_PROFILE_TABLE.map((b) => ({ label: b.label, name: modelName(b.modelId), vol: modelVolatility(b.modelId), score: riskScoreOf(modelVolatility(b.modelId)) }))
  const steps = anchors.slice(1).map((hi, i) => {
    const lo = anchors[i]
    if (!lo) throw new Error('A risk-band step has no lower band')
    return { lo, hi, dVol: hi.vol - lo.vol, dScore: hi.score - lo.score }
  })
  const steepest = steps.reduce((a, b) => (b.dScore / b.dVol > a.dScore / a.dVol ? b : a))
  const list = anchors.map((a) => `${a.label}, ${a.name}, σ ${pct(a.vol, 1)}% at ${a.score}`).join('; ')
  const points = pct(steepest.dVol, 2)
  return `The scale's anchors are each band's model: ${list}. The steepest step, from ${steepest.lo.name} to ${steepest.hi.name}, spans ${steepest.dScore} points across ${points} ${points === '1.00' ? 'percentage point' : 'percentage points'} of σ, so a small change in holdings there can move the score several points.`
}

const methods = (): MethodNote[] => [
  { label: 'Volatility and beta', modeled: true, text: `Modeled, not realized: σ from the firm's asset-class volatility assumptions and its ${correlationAssumptionsText()}. Beta is measured against US equity and derived from the same assumptions, not set beside them: each class's correlation with US equity times its σ over US equity's σ. Weights are today's holdings.` },
  { label: 'Value at risk', modeled: true, text: 'Parametric and normal, one month, 95%: value × 1.645 × σ × √(1/12). A modeled loss the account would not exceed in nineteen months of twenty, not a realized one.' },
  { label: 'Tracking error', modeled: true, text: "Modeled, not realized: ex-ante, the standard deviation of the account's weights minus its benchmark's (the model's targets, or a custom mandate's own benchmark), through the same volatility and correlation assumptions." },
  { label: 'Factor exposures', modeled: true, text: "Each asset class carries a loading on each factor, a model assumption rather than an estimate from returns; the market loading is the class's beta. An account's exposure is its weights times the loadings; its benchmark's is the model's targets times the loadings." },
  { label: 'Concentration', modeled: false, text: 'The Herfindahl-Hirschman index of position weights (0 to 10,000) and its effective number of positions; limits are the IPS limits for a single issuer, a pooled vehicle and cash.' },
  { label: 'Stress tests', modeled: true, text: "Each scenario's asset-class returns replayed on today's holdings." },
  { label: 'Risk score and tolerance', modeled: true, text: `Modeled, not realized: the account's σ placed on the questionnaire's 0 to 100 scale through the model each band of the firm's risk-profile table names. Tolerance is the band the client's questionnaire score falls in, not the score itself: an account is above or below when its score falls outside that band, by the points shown, and the book is read above first, then below, each by how far outside; accounts within are ordered by how close they sit to the top of the band. ${scaleText()}` },
  { label: 'Screening, not suitability', modeled: false, text: "An account's status is a screening signal, not a suitability finding: suitability is judged per household. Each client's household score is the value-weighted average of the scores of that client's accounts in the household, glide paths aside, on the same scale and against the same band; a spouse's accounts are measured against the spouse's own questionnaire. Asset location can rightly hold an IRA more conservatively and a taxable account more aggressively, so an account outside the band whose household is within it is marked asset location." },
  { label: 'Glide paths', modeled: false, text: "A 529 on the education model follows its beneficiary's time horizon, not the owner's questionnaire, so it carries the status glide path and no comparison with the owner's tolerance; it is listed last." },
]

function accountRisk(account: Account): AccountRiskView {
  const p = riskProfileFor(account)
  const var95 = Math.round(parametricVaR(p.value, p.vol))
  const concentration = concentrationFor(account)
  return {
    asOf: MOCK_NOW_ISO, accountId: account.id, accountName: account.name, clientName: clientOf(account).fullName,
    modelId: p.modelId, mandateName: mandateNameOf(account), benchmarkName: p.benchmarkName, value: p.value,
    volatility: p.vol, beta: p.beta,
    var95: { value: var95, percent: var95 / p.value, horizon: 'one month', confidence: 0.95, method: 'parametric normal' },
    trackingError: p.te,
    posture: postureOf(account, p.vol),
    factors: factorRows(p.weights, p.benchWeights),
    concentration: {
      hhi: concentration.summary.herfindahlIndex, effectiveN: concentration.summary.effectiveN, breaches: concentration.summary.breachCount,
      top: concentration.positions.slice(0, 5).map((c) => ({ symbol: c.symbol, name: c.name, weight: c.weight, limit: c.limit, kind: c.kind, breached: c.breached })),
    },
    stress: stressScenariosFor(account).map((s) => ({ id: s.id, name: s.name, description: s.description, impact: s.portfolioImpact, impactValue: s.portfolioImpact * p.value })),
    methods: methods(),
  }
}

export function accountRiskView(viewerId: string, accountId: string): AccountRiskView | undefined {
  const account = accounts.find((a) => a.id === accountId)
  return account && isFirmViewer(viewerId) ? accountRisk(account) : undefined
}

export function bookRiskView(viewerId: string): BookRiskView | undefined {
  if (!isFirmViewer(viewerId)) return undefined
  const householdRows = clients.flatMap((c) => householdRiskOf(c.id) ?? [])
    .sort((a, b) => b.posture.sortKey - a.posture.sortKey || a.clientId.localeCompare(b.clientId))
  const householdWithin = new Set(householdRows.filter((h) => h.posture.status === 'within').map((h) => h.clientId))
  const rows = accounts.map((a) => {
    const p = riskProfileFor(a)
    const posture = postureOf(a, p.vol)
    const outside = posture.status === 'above' || posture.status === 'below'
    return {
      accountId: a.id, accountName: a.name, householdName: householdNameOf(a.householdId), clientName: clientOf(a).fullName, mandateName: mandateNameOf(a),
      value: p.value, volatility: p.vol, var95: Math.round(parametricVaR(p.value, p.vol)), posture,
      assetLocation: outside && householdWithin.has(a.clientId),
    }
  }).sort((a, b) => b.posture.sortKey - a.posture.sortKey || a.accountId.localeCompare(b.accountId))
  const count = (status: ToleranceStatus) => rows.filter((r) => r.posture.status === status).length
  return {
    asOf: MOCK_NOW_ISO, households: householdRows, householdsOutside: householdRows.length - householdWithin.size,
    rows, aboveTolerance: count('above'), belowTolerance: count('below'), methods: methods(),
  }
}

const STATUS_WORDS: Readonly<Record<Exclude<ToleranceStatus, 'glide_path'>, string>> = { above: 'above', within: 'within', below: 'below' }
const quoteClaim = (accountName: string, posture: RiskPosture) => posture.status === 'glide_path'
  ? `${accountName} follows a glide path to its beneficiary's horizon and is not measured against ${posture.tolerance.clientName}'s questionnaire.`
  : `${accountName} sits ${STATUS_WORDS[posture.status]} ${posture.tolerance.clientName}'s risk tolerance.`

export function riskQuote(accountId: string): RowQuote | undefined {
  const account = accounts.find((a) => a.id === accountId)
  if (!account) return undefined
  const v = accountRisk(account)
  return {
    view: 'risk', rowId: account.id, subject: { type: 'account', id: account.id }, threadTitle: `Risk · ${account.name}`,
    claim: quoteClaim(account.name, v.posture),
    figures: [
      { label: 'Risk score', value: v.posture.score, unit: 'pts', source: 'risk.posture.score' },
      { label: 'Tolerance score', value: v.posture.tolerance.score, unit: 'pts', source: 'clients.riskProfile.score' },
      { label: 'Volatility', value: v.volatility, unit: '%', source: 'risk.volatility' },
      { label: 'VaR, one month, 95%', value: v.var95.value, unit: 'USD', source: 'risk.var95.value' },
    ],
    citations: [{ source: `Risk · modeled, not realized; questionnaire of ${v.posture.tolerance.assessedOn}`, asOf: MOCK_NOW_ISO }],
  }
}
