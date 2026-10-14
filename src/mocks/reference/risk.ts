import type { Account } from '@/types/account'
import type { MethodNote, RowQuote } from '@/types/reference'
import type { AccountRiskView, BookRiskView, RiskPosture, ToleranceStatus } from '@/types/reference-risk'
import { accounts } from '@/mocks/data/accounts'
import { clients } from '@/mocks/data/clients'
import { households } from '@/mocks/data/households'
import { concentrationFor, riskProfileFor, stressScenariosFor } from '@/mocks/handlers/pms'
import { MODEL_DEFINITIONS } from '@/mocks/data/model-definitions'
import { isFirmViewer } from '@/mocks/workspace/visibility'
import { correlationAssumptionsText, parametricVaR } from '@/lib/risk-model'
import { RISK_PROFILE_TABLE, bandFor, type RiskProfile } from '@/lib/risk-profile'
import { MOCK_NOW_ISO } from '@/lib/clock'
import { factorRows } from './factors'
import { mandateNameOf, modelVolatility } from './models'
import { riskScoreOf } from './risk-score'

export { riskScoreOf }

const rank = (profile: RiskProfile) => RISK_PROFILE_TABLE.findIndex((b) => b.profile === profile)

function clientOf(account: Account) {
  const client = clients.find((c) => c.id === account.clientId)
  if (!client) throw new Error(`${account.id} names no client`)
  return client
}

function postureOf(account: Account, vol: number): RiskPosture {
  const client = clientOf(account)
  const score = riskScoreOf(vol)
  const own = bandFor(score)
  const tolerance = bandFor(client.riskProfile.score)
  const step = rank(own.profile) - rank(tolerance.profile)
  const status: ToleranceStatus = step > 0 ? 'above' : step < 0 ? 'below' : 'within'
  return {
    score, band: own.label, status, gap: score - client.riskProfile.score,
    tolerance: { clientId: client.id, clientName: client.fullName, score: client.riskProfile.score, band: tolerance.label, assessedOn: client.riskProfile.lastAssessed },
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
  return `The scale's anchors are each band's model: ${list}. The steepest step, from ${steepest.lo.name} to ${steepest.hi.name}, spans ${steepest.dScore} points across ${pct(steepest.dVol, 2)} percentage point of σ, so a small change in holdings there can move the score several points.`
}

const methods = (): MethodNote[] => [
  { label: 'Volatility and beta', modeled: true, text: `Modeled, not realized: σ from the firm's asset-class volatility assumptions and its ${correlationAssumptionsText()}. Beta is each class's assumed sensitivity to the global equity market. Weights are today's holdings.` },
  { label: 'Value at risk', modeled: true, text: 'Parametric and normal, one month, 95%: value × 1.645 × σ × √(1/12). A modeled loss the account would not exceed in nineteen months of twenty, not a realized one.' },
  { label: 'Factor exposures', modeled: true, text: "Each asset class carries a loading on each factor, a model assumption rather than an estimate from returns; the market loading is the class's beta. An account's exposure is its weights times the loadings; its benchmark's is the model's targets times the loadings." },
  { label: 'Concentration', modeled: false, text: 'The Herfindahl-Hirschman index of position weights (0 to 10,000) and its effective number of positions; limits are the IPS limits for a single issuer, a pooled vehicle and cash.' },
  { label: 'Stress tests', modeled: true, text: "Each scenario's asset-class returns replayed on today's holdings." },
  { label: 'Risk score and tolerance', modeled: false, text: `The account's σ placed on the questionnaire's 0 to 100 scale through the model each band of the firm's risk-profile table names; tolerance is the client's questionnaire score and its band. Above or below means the two fall in different bands. ${scaleText()}` },
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
  const rows = accounts.map((a) => {
    const p = riskProfileFor(a)
    const household = households.find((h) => h.id === a.householdId)
    if (!household) throw new Error(`${a.id} names no household`)
    return {
      accountId: a.id, accountName: a.name, householdName: household.name, clientName: clientOf(a).fullName, mandateName: mandateNameOf(a),
      value: p.value, volatility: p.vol, var95: Math.round(parametricVaR(p.value, p.vol)), posture: postureOf(a, p.vol),
    }
  }).sort((a, b) => b.posture.gap - a.posture.gap || a.accountId.localeCompare(b.accountId))
  return { asOf: MOCK_NOW_ISO, rows, aboveTolerance: rows.filter((r) => r.posture.status === 'above').length, methods: methods() }
}

const STATUS_WORDS: Readonly<Record<ToleranceStatus, string>> = { above: 'above', within: 'within', below: 'below' }

export function riskQuote(accountId: string): RowQuote | undefined {
  const account = accounts.find((a) => a.id === accountId)
  if (!account) return undefined
  const v = accountRisk(account)
  return {
    view: 'risk', rowId: account.id, subject: { type: 'account', id: account.id }, threadTitle: `Risk · ${account.name}`,
    claim: `${account.name} sits ${STATUS_WORDS[v.posture.status]} ${v.posture.tolerance.clientName}'s risk tolerance.`,
    figures: [
      { label: 'Risk score', value: v.posture.score, unit: 'pts', source: 'risk.posture.score' },
      { label: 'Tolerance score', value: v.posture.tolerance.score, unit: 'pts', source: 'clients.riskProfile.score' },
      { label: 'Volatility', value: v.volatility, unit: '%', source: 'risk.volatility' },
      { label: 'VaR, one month, 95%', value: v.var95.value, unit: 'USD', source: 'risk.var95.value' },
    ],
    citations: [{ source: `Risk · modeled, not realized; questionnaire of ${v.posture.tolerance.assessedOn}`, asOf: MOCK_NOW_ISO }],
  }
}
