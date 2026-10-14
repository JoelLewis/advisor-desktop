import type { AssetClass } from '@/types/portfolio'
import type { MethodNote, RowQuote } from '@/types/reference'
import type { Account } from '@/types/account'
import type { CustomMandateRow, ModelBenchmark, ModelDetail, ModelSummary, ModelsView, ModelTarget, ModelVersionRecord } from '@/types/reference-models'
import { isModelManaged } from '@/lib/mandate'
import { accounts } from '@/mocks/data/accounts'
import { clients } from '@/mocks/data/clients'
import { FX_RATES_USD_BASE } from '@/mocks/data/currencies'
import { personById } from '@/mocks/data/people'
import { GLIDE_PATH_MODELS, MODEL_RISK_PROFILES, MODEL_VERSIONS } from '@/mocks/data/model-governance'
import { computeDriftForAccount } from '@/mocks/handlers/pms'
import { MODEL_BANDS, MODEL_DEFINITIONS } from '@/mocks/data/model-definitions'
import { isFirmViewer } from '@/mocks/workspace/visibility'
import { accountValueUSD, deriveBookAUM } from '@/lib/aum'
import { correlationAssumptionsText, portfolioVolatility } from '@/lib/risk-model'
import { RISK_PROFILE_TABLE } from '@/lib/risk-profile'
import { MOCK_NOW_ISO } from '@/lib/clock'

/**
 * The index each sleeve is measured by (R8). International equity depends on whether the model carries a
 * separate emerging-markets sleeve. The commodities sleeve holds GLD, so it is gold and measured by the LBMA
 * gold price; digital assets are measured by a broad index that covers the coins and trusts the book holds,
 * not bitcoin alone, and its return here is the modeled assumption, not the index's record.
 */
export const SLEEVE_INDEX: Readonly<Record<AssetClass, string>> = {
  us_equity: 'MSCI USA IMI', intl_equity: 'MSCI EAFE', emerging_markets: 'MSCI Emerging Markets', fixed_income: 'Bloomberg US Aggregate',
  alternatives: 'HFRX Global Hedge Fund', real_estate: 'MSCI US IMI Real Estate 25/50', commodities: 'LBMA Gold Price PM',
  cash: 'ICE BofA US 3-Month Treasury Bill', digital_assets: 'Bloomberg Galaxy Crypto Index (modeled)', private_equity: 'Cambridge Associates US Private Equity',
}
const INTL_WITH_EMERGING_INSIDE = 'MSCI ACWI ex USA IMI'
const EQUITY: ReadonlySet<string> = new Set(['us_equity', 'intl_equity', 'emerging_markets'])
/** Asset classes as prose, for a claim that reads as a sentence; the display labels abbreviate. */
const ASSET_CLASS_WORDS: Readonly<Record<AssetClass, string>> = {
  us_equity: 'US equity', intl_equity: 'international equity', emerging_markets: 'emerging markets', fixed_income: 'fixed income',
  alternatives: 'alternatives', real_estate: 'real estate', commodities: 'gold', cash: 'cash',
  digital_assets: 'digital assets', private_equity: 'private equity',
}
const ASSET_CLASS_TITLES: Readonly<Record<AssetClass, string>> = {
  us_equity: 'US Equity', intl_equity: 'International Equity', emerging_markets: 'Emerging Markets', fixed_income: 'Fixed Income',
  alternatives: 'Alternatives', real_estate: 'Real Estate', commodities: 'Gold', cash: 'Cash',
  digital_assets: 'Digital Assets', private_equity: 'Private Equity',
}
const isAssetClass = (value: string): value is AssetClass => value in SLEEVE_INDEX

function definition(modelId: string) {
  const model = MODEL_DEFINITIONS.find((m) => m.id === modelId)
  if (!model) throw new Error(`No model ${modelId}`)
  return model
}

function targetsOf(modelId: string): ModelTarget[] {
  return definition(modelId).assetClasses.filter((a) => a.targetWeight > 0).map((a) => {
    if (!isAssetClass(a.assetClass)) throw new Error(`${modelId} targets an unknown asset class ${a.assetClass}`)
    return { assetClass: a.assetClass, targetWeight: a.targetWeight }
  })
}

/** International equity is measured ex-US including emerging markets unless the blend carries its own emerging-markets sleeve. */
const indexAmong = (classes: readonly AssetClass[], assetClass: AssetClass) =>
  assetClass === 'intl_equity' && !classes.includes('emerging_markets') ? INTL_WITH_EMERGING_INSIDE : SLEEVE_INDEX[assetClass]
const indexFor = (modelId: string, assetClass: AssetClass) => indexAmong(targetsOf(modelId).map((t) => t.assetClass), assetClass)

export function modelBenchmark(modelId: string): ModelBenchmark {
  return {
    name: definition(modelId).benchmark,
    kind: GLIDE_PATH_MODELS.has(modelId) ? 'glide_path' : 'policy_blend',
    components: targetsOf(modelId).map((t) => ({ assetClass: t.assetClass, index: indexFor(modelId, t.assetClass), weight: t.targetWeight })),
  }
}

/** What an account is measured against: its model's policy benchmark, or the benchmark its custom mandate names. */
export function accountBenchmark(account: Account): ModelBenchmark {
  if (account.mandate === 'model') return modelBenchmark(account.modelId)
  const classes = account.benchmark.weights.map((w) => w.assetClass)
  return { name: account.benchmark.name, kind: 'mandate', components: account.benchmark.weights.map((w) => ({ assetClass: w.assetClass, index: indexAmong(classes, w.assetClass), weight: w.weight })) }
}

export const CUSTOM_MANDATE_NAME = 'Custom mandate'
/** The model's name, or "Custom mandate" for an account that follows none. */
export const mandateNameOf = (account: Account): string => (account.mandate === 'model' ? definition(account.modelId).name : CUSTOM_MANDATE_NAME)

export const modelVolatility = (modelId: string): number => portfolioVolatility(new Map(targetsOf(modelId).map((t) => [t.assetClass, t.targetWeight])))
export const equityShareOf = (modelId: string): number => targetsOf(modelId).filter((t) => EQUITY.has(t.assetClass)).reduce((s, t) => s + t.targetWeight, 0)

const versionsOf = (modelId: string): ModelVersionRecord[] => MODEL_VERSIONS.filter((v) => v.modelId === modelId).sort((a, b) => a.version - b.version)

function summaryOf(modelId: string): ModelSummary {
  const model = definition(modelId)
  const versions = versionsOf(modelId)
  const current = versions.filter((v) => v.status === 'approved').pop()
  if (!current) throw new Error(`${modelId} has no approved version`)
  const pending = versions.find((v) => v.status === 'pending_approval')
  const riskProfile = MODEL_RISK_PROFILES[modelId]
  const band = MODEL_BANDS[modelId]
  const riskLabel = RISK_PROFILE_TABLE.find((b) => b.profile === riskProfile)?.label
  if (!riskProfile || !band || !riskLabel) throw new Error(`${modelId} has no risk profile or drift band`)
  const own = accounts.filter(isModelManaged).filter((a) => a.modelId === modelId)
  return {
    id: model.id, name: model.name, description: model.description, riskProfile, riskLabel, benchmark: modelBenchmark(modelId), equityShare: equityShareOf(modelId),
    currentVersion: current.version, ...(pending ? { pendingVersion: { version: pending.version, effectiveDate: pending.effectiveDate } } : {}),
    assignedAccounts: own.length, totalValue: deriveBookAUM(own, FX_RATES_USD_BASE),
    driftTolerance: band.driftTolerance, rebalanceFrequency: band.rebalanceFrequency, volatility: modelVolatility(modelId),
  }
}

const METHODS: readonly MethodNote[] = [
  { label: 'Benchmarks', modeled: false, text: "Each model's policy benchmark holds every sleeve at the model's target weight, each sleeve measured by the index named for it. The education model's benchmark holds its glide path's current-stage targets, today's weights; it is not re-weighted along the path within a period." },
  { label: 'History', modeled: false, text: "The firm's record of Investment Committee decisions: each version proposed by the analyst and approved by the committee, with the weights it set. A pending version takes effect only once approved. Read-only here." },
  { label: 'Assigned value', modeled: false, text: "Accounts on each model and their value today, from the book; an account held in another currency is converted at today's exchange rate." },
  { label: 'Custom mandates', modeled: false, text: "An account held at the client's own instruction (a single market or a single asset class) follows no firm model. It is listed separately, carries no drift band and is left out of model drift; it is still measured on risk against the client's tolerance, and against the benchmark its mandate names." },
  { label: 'Volatility', modeled: true, text: `Modeled, not realized: the standard deviation of the target weights from the firm's asset-class volatility assumptions and its ${correlationAssumptionsText()}.` },
]

function clientNameOf(account: Account): string {
  const client = clients.find((c) => c.id === account.clientId)
  if (!client) throw new Error(`${account.id} names no client`)
  return client.fullName
}

function customMandateRows(): CustomMandateRow[] {
  return accounts.flatMap((a) => (a.mandate === 'custom'
    ? [{ accountId: a.id, accountName: a.name, clientName: clientNameOf(a), value: accountValueUSD(a, FX_RATES_USD_BASE), mandateSummary: a.mandateSummary, benchmarkName: a.benchmark.name }]
    : []))
}

export function modelsView(viewerId: string): ModelsView | undefined {
  if (!isFirmViewer(viewerId)) return undefined
  return { asOf: MOCK_NOW_ISO, models: MODEL_DEFINITIONS.map((m) => summaryOf(m.id)), customMandates: customMandateRows(), methods: [...METHODS] }
}

export function modelDetail(viewerId: string, modelId: string): ModelDetail | undefined {
  if (!isFirmViewer(viewerId) || !MODEL_DEFINITIONS.some((m) => m.id === modelId)) return undefined
  const model = definition(modelId)
  return {
    ...summaryOf(modelId),
    asOf: MOCK_NOW_ISO,
    targets: targetsOf(modelId).map((t) => {
      const symbol = model.assetClasses.find((a) => a.assetClass === t.assetClass)?.implementationSymbol
      return { ...t, ...(symbol ? { implementationSymbol: symbol } : {}), index: indexFor(modelId, t.assetClass) }
    }),
    versions: versionsOf(modelId).map((v) => {
      const person = personById(v.proposedBy)
      if (!person) throw new Error(`${modelId} v${v.version} names no proposer`)
      return { ...v, proposedByName: person.name }
    }),
    accounts: accounts.filter(isModelManaged).filter((a) => a.modelId === modelId).map((a) => {
      const drift = computeDriftForAccount(a)
      return { accountId: a.id, accountName: a.name, clientName: clientNameOf(a), value: accountValueUSD(a, FX_RATES_USD_BASE), maxAbsDrift: drift.maxAbsDrift, withinBand: !drift.needsRebalance }
    }),
    methods: [...METHODS],
  }
}

function requireClass(assetClass: AssetClass | undefined): AssetClass {
  if (!assetClass) throw new Error('A weight change names no asset class')
  return assetClass
}

const listOfClasses = (classes: readonly string[]) =>
  classes.length <= 1 ? classes.join('') : `${classes.slice(0, -1).join(', ')} and ${classes[classes.length - 1] ?? ''}`

export function modelQuote(rowId: string): RowQuote | undefined {
  const [modelId, versionPart] = rowId.split(':')
  if (!modelId || !MODEL_DEFINITIONS.some((m) => m.id === modelId)) return undefined
  const summary = summaryOf(modelId)
  const base = { view: 'models' as const, rowId, subject: { type: 'model' as const, id: modelId }, threadTitle: `Model · ${summary.name}` }
  if (versionPart === undefined) {
    return {
      ...base,
      claim: `${summary.name} and the accounts that follow it, against the ${summary.benchmark.name}.`,
      figures: [
        { label: 'Accounts', value: summary.assignedAccounts, unit: 'count', source: 'models.assignedAccounts' },
        { label: 'Value today', value: summary.totalValue, unit: 'USD', source: 'models.totalValue' },
        { label: 'Equity share', value: summary.equityShare, unit: '%', source: 'models.equityShare' },
      ],
      citations: [{ source: `Models · ${summary.name}, current version`, asOf: MOCK_NOW_ISO }],
    }
  }
  const version = versionsOf(modelId).find((v) => `v${v.version}` === versionPart)
  if (!version) return undefined
  const weights = version.changes.filter((c) => c.type === 'weight_change' && c.assetClass && c.oldValue !== undefined && c.newValue !== undefined)
  const classes = weights.map((c) => ASSET_CLASS_WORDS[requireClass(c.assetClass)])
  const state = version.status === 'pending_approval' ? 'A pending version' : 'An approved version'
  return {
    ...base,
    claim: weights.length > 0
      ? `${state} of ${summary.name} ${version.status === 'pending_approval' ? 'changes' : 'changed'} its ${listOfClasses(classes)} targets.`
      : `${state} of ${summary.name}: ${version.changes.map((c) => c.description).join('; ')}.`,
    figures: weights.map((c) => ({ label: `${ASSET_CLASS_TITLES[requireClass(c.assetClass)]} target`, value: (c.newValue ?? 0) - (c.oldValue ?? 0), unit: 'pp' as const, source: 'models.versions.changes' })),
    citations: [{ source: `Models · Investment Committee record, ${summary.name}`, asOf: version.approvedOn ?? version.effectiveDate }],
  }
}
