import type { NBA, NBAClient, TriggerSignal } from '@/types/nba'
import { accounts } from './accounts'
import { clients } from './clients'
import { getPositionsForAccount } from './positions'
import { realisedSales } from './realised-sales'
import { computeDriftForAccount, modelDisplayName } from '../handlers/pms'
import { householdFixtures } from './households'
import { generateTaxLotsWithSaleRisk } from '../handlers/custodian'
import { estimateTaxOnReturns, taxReturnFor } from '../handlers/tax-return'
import { formatRatePercent, lossAllowedNow } from '@/lib/tax-rules'
import { capitalLossUse, ORDINARY_INCOME_OFFSET_LIMIT, ORDINARY_INCOME_OFFSET_LIMIT_SEPARATE, taxEstimateDirection, type TaxedLeg } from '@/lib/capital-gains'
import type { Account } from '@/types/account'
import { isTaxableAccount } from '@/lib/tax-treatment'
import { formatCalendarDate } from '@/lib/utils'
import { MOCK_TODAY_ISO } from '@/lib/clock'
import { convertToBase } from '@/lib/currency'
import { ASSET_CLASS_LABELS } from '@/lib/labels'
import { FX_RATES_USD_BASE } from './currencies'

const dollars = (amount: number) => `$${Math.round(Math.abs(amount)).toLocaleString('en-US')}`
const percent = (fraction: number) => `${(fraction * 100).toFixed(1)}%`
const clientName = (clientId: string) => clients.find((c) => c.id === clientId)?.fullName ?? clientId

/**
 * §0.7 · nba-001 used to say "seven portfolios … beyond the 3% threshold" against per-model bands
 * of 3%, 5% and 7%. Its figures now come from the drift engine: the accounts whose own model band
 * is breached (`needsRebalance`), each band stated with its model's name.
 */
export function driftBatchFacts() {
  const drifted = accounts
    .map((account) => accountDriftFacts(account))
    .filter(({ drift }) => drift.needsRebalance)
  const clientIds = [...new Set(drifted.map(({ account }) => account.clientId))]
  const bands = [...new Map(drifted.map(({ drift }) => [drift.modelId, drift.driftTolerance])).entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([modelId, band]) => `${modelDisplayName(modelId)} ±${formatRatePercent(band)}`)
  const breaches = drifted.map(({ drift }) => drift.maxAbsDrift)
  return {
    accountCount: drifted.length,
    modelIds: drifted.map(({ drift }) => drift.modelId),
    clients: clientIds.map((id): NBAClient => ({ id, name: clientName(id) })),
    bands,
    lowestBreach: Math.min(...breaches),
    highestBreach: Math.max(...breaches),
    valueToTradeUsd: drifted.reduce((s, d) => s + d.valueToTradeUsd, 0),
  }
}

/**
 * One account's drift as a client letter states it: the worst asset class against the model's
 * target and band, and the value a rebalance trades to restore the targets. That is `totalDrift`
 * (half the sum of the class drifts, the fraction of the account that must trade) of the account's
 * value, in USD.
 */
export function accountDriftFacts(account: Account) {
  const drift = computeDriftForAccount(account)
  const worst = [...drift.assetClassDrifts].sort((a, b) => Math.abs(b.drift) - Math.abs(a.drift))[0]
  if (worst === undefined) throw new Error(`${account.id} has no asset-class drift`)
  const valueToTradeUsd = convertToBase(drift.totalDrift * account.totalValue, account.baseCurrency ?? 'USD', FX_RATES_USD_BASE)
  return { account, drift, worst, valueToTradeUsd }
}

/** "In [your] Robert Johnson Individual, US Equity is 63.2% against the Growth model's 50.0% target, 13.2 points over, outside its ±5% band." */
export function accountDriftSentence({ account, drift, worst }: Pick<ReturnType<typeof accountDriftFacts>, 'account' | 'drift' | 'worst'>, voice: Voice): string {
  const label = ASSET_CLASS_LABELS[worst.assetClass] ?? worst.assetClass
  const points = (Math.abs(worst.drift) * 100).toFixed(1)
  return `In ${voice === 'client' ? 'your ' : ''}${account.name}, ${label} is ${percent(worst.actual)} against the ` +
    `${modelDisplayName(drift.modelId)} model's ${percent(worst.target)} target, ${points} points ${worst.drift > 0 ? 'over' : 'under'}, ` +
    `${drift.needsRebalance ? 'outside' : 'inside'} its ±${formatRatePercent(drift.driftTolerance)} band.`
}

/** Every account `clientId` owns, and those outside their model's band: a rebalancing letter to that client reads these alone. */
export function clientDriftFacts(clientId: string) {
  const own = accounts.filter((a) => a.clientId === clientId).map(accountDriftFacts)
  const outOfBand = own.filter(({ drift }) => drift.needsRebalance)
  return { own, outOfBand, valueToTradeUsd: outOfBand.reduce((s, d) => s + d.valueToTradeUsd, 0) }
}

/**
 * §0.7 · the INTC harvest across the book, return by return. For every taxable account still
 * holding INTC below cost: the loss a sale today realises (`lossAllowedNow`, so any share §1091
 * would wash is left out), the partial harvests already in the realised-sales ledger, and what
 * harvesting the rest does on that client's own return this year. That is the capital-gains tax
 * it saves against the year's realised results so far (`estimateTaxOnReturns`), the ordinary
 * income it newly offsets under §1211(b), and the loss that carries forward under §1212(b)
 * (`capitalLossUse`). §1222 nets within one return and never across two, so nothing here is pooled
 * across clients except the face value of the losses.
 */
export function intcHarvestFacts() {
  const candidates = accounts
    .filter((a) => isTaxableAccount(a.taxTreatment))
    .flatMap((account) => {
      const position = getPositionsForAccount(account.id, account.totalValue).find((p) => p.symbol === 'INTC' && p.gainLoss < 0)
      if (!position) return []
      const lots = generateTaxLotsWithSaleRisk(account.id, account.totalValue).filter((l) => l.positionId === position.id)
      const allowed = (period: 'short' | 'long') => lots.filter((l) => l.holdingPeriod === period).reduce((s, l) => s + lossAllowedNow(l), 0)
      const leg: TaxedLeg = { realisedShortTerm: allowed('short'), realisedLongTerm: allowed('long'), taxImpact: 0 }
      return [{ account, position, leg }]
    })
  const estimates = estimateTaxOnReturns(candidates.map(({ account, leg }) => ({ account, legs: [leg] })), MOCK_TODAY_ISO)
  // What earlier holders in this list have already added to a shared return, as the estimates net them.
  const addedSoFar = new Map<string, number>()
  const holders = candidates.map(({ account, position, leg }, i) => {
    const estimate = estimates[i]
    const returnId = taxReturnFor(account)
    if (estimate === undefined || returnId === null || estimate.ytdRealisedOnReturn === null) throw new Error(`INTC holder ${account.id} has no return-level estimate`)
    const loss = leg.realisedShortTerm + leg.realisedLongTerm
    const ytdNet = estimate.ytdRealisedOnReturn.shortTerm + estimate.ytdRealisedOnReturn.longTerm
    const priorNet = ytdNet + (addedSoFar.get(returnId) ?? 0)
    addedSoFar.set(returnId, (addedSoFar.get(returnId) ?? 0) + loss)
    const filing = ordinaryIncomeOffsetFiling(account)
    return {
      account,
      position,
      loss,
      sales: realisedSales.filter((r) => r.accountId === account.id && r.symbol === 'INTC'),
      jointReturn: returnId.startsWith('joint:'),
      ytdNet,
      priorNet,
      savingThisYear: taxSaved(account, estimate.net),
      ...filing,
      ...capitalLossUse(priorNet, loss, filing.ordinaryIncomeLimit),
      // The same harvest on a separate return, stated beside the joint figures when the household
      // records no filing status for a married client.
      ifFilingSeparately: filing.separateLimitUnconfirmed ? capitalLossUse(priorNet, loss, ORDINARY_INCOME_OFFSET_LIMIT_SEPARATE) : null,
    }
  })
  return {
    holders,
    totalLoss: holders.reduce((s, h) => s + h.loss, 0),
    totalCost: holders.reduce((s, h) => s + h.position.costBasis, 0),
    totalSavingThisYear: holders.reduce((s, h) => s + h.savingThisYear, 0),
    totalCarriedForward: holders.reduce((s, h) => s + h.carriedForward, 0),
  }
}

/** The tax a harvest saves on its return; a harvest realises only losses, so it can add none. */
function taxSaved(account: Account, estimate: number): number {
  const { direction, amount } = taxEstimateDirection(estimate)
  if (direction === 'added to' && amount > 0) throw new Error(`an INTC harvest in ${account.id} adds ${amount} of tax`)
  return direction === 'saved on' ? amount : 0
}

/**
 * §1211(b)'s limit on `account`'s return: $1,500 for a spouse the household records as filing
 * separately, $3,000 otherwise. A married client whose household records no filing status is
 * stated at $3,000 with the separate-return limit beside it.
 */
function ordinaryIncomeOffsetFiling(account: Account): { ordinaryIncomeLimit: number; separateLimitUnconfirmed: boolean } {
  const household = householdFixtures.find((h) => h.id === account.householdId)
  const owner = household?.members.find((m) => m.clientId === account.clientId)
  const married = (owner?.relationship === 'primary' || owner?.relationship === 'spouse')
    && household?.members.some((m) => m.relationship === 'spouse') === true
  if (married && household?.filingStatus === 'married_filing_separately') {
    return { ordinaryIncomeLimit: ORDINARY_INCOME_OFFSET_LIMIT_SEPARATE, separateLimitUnconfirmed: false }
  }
  return { ordinaryIncomeLimit: ORDINARY_INCOME_OFFSET_LIMIT, separateLimitUnconfirmed: married && household?.filingStatus === undefined }
}

const intcHarvest = intcHarvestFacts()

/** The NBA whose per-client facts are `intcHarvest.holders`. */
export const INTC_HARVEST_NBA_ID = 'nba-002'

export type IntcHolder = (typeof intcHarvest.holders)[number]

/** Who a draft speaks about: the advisor's own notes name the client; a letter to the client says "you". */
export type Voice = 'advisor' | 'client'

/** The INTC holder `clientId` is, if any: a client-facing draft reads this client's facts and no one else's. */
export function intcHolderFor(clientId: string): IntcHolder | undefined {
  return intcHarvest.holders.find((h) => h.account.clientId === clientId)
}

/** "Robert and Patricia Johnson": the two spouses a joint return belongs to, from the household record. */
function jointFilers(account: Account): string {
  const household = householdFixtures.find((h) => h.id === account.householdId)
  const [first, second] = (household?.members ?? []).filter((m) => m.relationship === 'primary' || m.relationship === 'spouse').map((m) => m.name)
  if (first === undefined || second === undefined) throw new Error(`joint return for ${account.id} has no couple on record`)
  const surname = (name: string) => name.slice(name.lastIndexOf(' ') + 1)
  return surname(first) === surname(second) ? `${first.split(' ')[0]} and ${second}` : `${first} and ${second}`
}

/** What the INTC still held is, and the shares already harvested from it. */
export function intcHoldingSentence(h: IntcHolder, voice: Voice): string {
  const harvested = (security: string) => h.sales.map((s) => `harvested ${s.quantity.toLocaleString('en-US')} shares${security} on ${formatCalendarDate(s.saleDate)} and `).join('')
  const held = h.position.quantity.toLocaleString('en-US')
  if (voice === 'advisor') return `${clientName(h.account.clientId)} ${harvested('')}holds ${held} at a ${dollars(h.loss)} loss.`
  return h.sales.length > 0
    ? `You ${harvested(' of Intel (INTC)')}still hold ${held} at a ${dollars(h.loss)} loss.`
    : `You hold ${held} shares of Intel (INTC) at a ${dollars(h.loss)} loss.`
}

/**
 * What harvesting the rest does on this holder's own return this year: the capital-gains tax saved,
 * the ordinary income newly offset (§1211(b)) and the loss carried forward (§1212(b)), with the
 * separate-return figures beside them where the filing status is not on record.
 */
export function intcReturnSentence(h: IntcHolder, voice: Voice): string {
  const whose = voice === 'client'
    ? `your ${h.jointReturn ? 'joint ' : ''}return`
    : h.jointReturn ? `${jointFilers(h.account)}'s joint return` : `${clientName(h.account.clientId)}'s return`
  const ytd = h.ytdNet === 0 ? 'no net capital gain or loss' : `a ${dollars(h.ytdNet)} net capital ${h.ytdNet < 0 ? 'loss' : 'gain'}`
  const harvesting = h.sales.length > 0 ? 'harvesting the rest' : 'harvesting'
  const saving = h.savingThisYear > 0 ? `saves about ${dollars(h.savingThisYear)} of capital-gains tax this year` : 'saves no capital-gains tax this year'
  const separately = (joint: number, separate: number | undefined) =>
    separate !== undefined && separate !== joint ? ` (${dollars(separate)} if filing separately)` : ''
  const carried = h.carriedForward > 0
    ? `${dollars(h.carriedForward)} carries forward to later years${separately(h.carriedForward, h.ifFilingSeparately?.carriedForward)}`
    : ''
  const separateLimit = h.separateLimitUnconfirmed ? ORDINARY_INCOME_OFFSET_LIMIT_SEPARATE : undefined
  const outcome = h.ordinaryIncomeOffset > 0
    ? ` and offsets ${dollars(h.ordinaryIncomeOffset)} of ordinary income${separately(h.ordinaryIncomeOffset, h.ifFilingSeparately?.ordinaryIncomeOffset)}${carried ? `; ${carried}` : ''}`
    : h.priorNet <= -h.ordinaryIncomeLimit
      ? `; the return's existing net loss already uses the full ${dollars(h.ordinaryIncomeLimit)} ordinary-income offset${separately(h.ordinaryIncomeLimit, separateLimit)}${carried ? `, so ${carried}` : ''}`
      : carried ? `; ${carried}` : ''
  return `On ${whose}, with ${ytd} so far this year, ${harvesting} ${saving}${outcome}.`
}

function intcHarvestDescription(): string {
  const { holders, totalLoss } = intcHarvest
  const perAccount = holders.map((h) => `${intcHoldingSentence(h, 'advisor')} ${intcReturnSentence(h, 'advisor')}`)
  return `Intel (INTC) is still below cost in ${holders.length} client accounts, ${dollars(totalLoss)} of harvestable losses in all. ` +
    `${perAccount.join(' ')} ` +
    `Figures are capital-gains tax at top federal rates against each return's sales realised so far this year; ` +
    `gains realised later in ${MOCK_TODAY_ISO.slice(0, 4)} would use loss shown as carried forward. ` +
    'Losses carried in from earlier years are not modelled, nor is state tax.'
}

export const nbas: NBA[] = [
  // ── Rebalancing (batch group) ──
  {
    id: 'nba-001',
    // `pms.ts` imports this module, so the drift engine is read when these fields are read, never
    // while the modules load: a load-time call would run before `pms.ts` has defined its models.
    get title() {
      return `Batch rebalance — ${driftBatchFacts().accountCount} accounts outside their model's drift band`
    },
    get description() {
      const facts = driftBatchFacts()
      return `${facts.accountCount} accounts across ${facts.clients.length} clients have drifted outside their own model's band (${facts.bands.join(', ')}). ` +
        'Batch rebalancing proposes every account in one pass.'
    },
    category: 'rebalancing', priority: 'high',
    scoring: { urgency: 72, impact: 80, efficiency: 90, relationship: 50, confidence: 88, composite: 77 },
    get clients() {
      return driftBatchFacts().clients
    },
    groupId: 'grp-001',
    get trigger(): TriggerSignal {
      const facts = driftBatchFacts()
      return { source: 'pms', condition: 'drift_exceeded', value: `${percent(facts.lowestBreach)}–${percent(facts.highestBreach)}`, detectedAt: '2026-02-24T08:00:00Z' }
    },
    suggestedAction: 'Generate batch rebalance trades with tax-loss harvesting overlay',
    // Final review I1 · this was a hand-typed 45_000 with no stated basis. It is now the value the
    // batch trades to bring every out-of-band account back to its model, in USD.
    get estimatedImpact() {
      return Math.round(driftBatchFacts().valueToTradeUsd)
    },
    estimatedImpactNote: "The value traded to bring these accounts back to their models' targets, in USD: not a gain, a cost or revenue.",
    createdAt: '2026-02-24T08:15:00Z', expiresAt: '2026-03-01T23:59:00Z', dismissed: false,
    actionRoute: { path: '/portfolios/rebalance' },
  },
  // ── Tax Management ──
  {
    id: INTC_HARVEST_NBA_ID, title: 'Tax-loss harvesting opportunity — INTC position',
    // §0.7 · this read as if nothing had been harvested, stated the benefit at long-term rates for
    // all three accounts, and said a 2026 harvest could offset Q4 (2025) gains. The description now
    // states the partial harvests already made (the realised-sales ledger), the INTC still held, and
    // what harvesting the rest does on each client's own return this year (`intcReturnSentence`).
    description: intcHarvestDescription(),
    category: 'tax_management', priority: 'high',
    scoring: { urgency: 85, impact: 75, efficiency: 70, relationship: 40, confidence: 92, composite: 76 },
    clients: intcHarvest.holders.map(({ account }): NBAClient => ({ id: account.clientId, name: clientName(account.clientId) })),
    groupId: 'grp-002',
    // The INTC still held, all accounts together: 191,500 / 1,045,000 = −18.3%. It was −18.7%, which
    // is acc-002's own figure; acc-015's is −17.9%.
    trigger: { source: 'pms', condition: 'unrealized_loss_threshold', value: percent(intcHarvest.totalLoss / intcHarvest.totalCost), detectedAt: '2026-02-24T09:30:00Z' },
    suggestedAction: 'Sell INTC, replace with semiconductor ETF (SMH) to maintain sector exposure',
    // §0.7 · the tax harvesting saves this year, return by return (`estimateTaxOnReturns`): not
    // the harvestable loss, and not each lot's loss at its own rate, which assumed gains of that
    // character these clients have not realised. Two of the three returns are already at a net
    // loss for 2026, so only acc-011's $6,260 gain is there to offset.
    estimatedImpact: intcHarvest.totalSavingThisYear,
    estimatedImpactNote: `Capital-gains tax saved this year only. Most of the harvest's value is the ${dollars(intcHarvest.totalCarriedForward)} of loss that carries forward to later years, which this figure does not count.`,
    createdAt: '2026-02-24T09:45:00Z', dismissed: false,
    actionRoute: { path: '/portfolios/accounts/acc-002/tax' },
  },
  {
    id: 'nba-003', title: 'Wash sale risk — Margaret Chen sold NVDA on Feb 10',
    description: 'Margaret Chen sold NVDA at a loss on Feb 10. The 30-day wash sale window closes Mar 12. Her IPS caps any single issuer at 10% — do not repurchase until window expires.',
    category: 'tax_management', priority: 'critical',
    scoring: { urgency: 95, impact: 60, efficiency: 30, relationship: 45, confidence: 98, composite: 72 },
    clients: [{ id: 'cli-003', name: 'Margaret Chen' }],
    trigger: { source: 'compliance', condition: 'wash_sale_window', value: 'NVDA — closes Mar 12', detectedAt: '2026-02-24T06:00:00Z' },
    suggestedAction: 'Block NVDA purchases until Mar 13; use QQQ as temporary substitute',
    estimatedImpact: 8_500, createdAt: '2026-02-24T06:15:00Z', expiresAt: '2026-03-12T23:59:00Z', dismissed: false,
    actionRoute: { path: '/portfolios/accounts/acc-007/tax' },
    contextRelevance: 'portfolio',
  },
  // ── Planning ──
  {
    id: 'nba-004', title: 'RMD deadline approaching — James Thompson',
    description: "James Thompson turns 73 this year. His first Required Minimum Distribution of ~$83,000 (based on $2.2M IRA balance ÷ 26.5 Uniform Lifetime Table factor) must be taken by April 1, 2027, but taking it in 2026 avoids a double-RMD year.",
    category: 'planning', priority: 'high',
    scoring: { urgency: 80, impact: 70, efficiency: 65, relationship: 60, confidence: 95, composite: 76 },
    clients: [{ id: 'cli-008', name: 'James Thompson' }],
    trigger: { source: 'planning', condition: 'rmd_age_threshold', value: 'age 73 in 2026', detectedAt: '2026-01-15T08:00:00Z' },
    suggestedAction: 'Schedule RMD planning meeting; model tax-optimal distribution strategy',
    estimatedImpact: 83_000, createdAt: '2026-01-15T08:30:00Z', dismissed: false,
    actionRoute: { path: '/clients/cli-008', openAI: true, aiMessage: 'Prepare RMD planning analysis for James Thompson — model tax-optimal distribution strategy for 2026' },
  },
  {
    id: 'nba-005', title: 'Goal probability dropped — Patel education fund',
    description: "The Patel 529 education fund probability dropped from 88% to 74% due to market drawdown. An additional $2,000/month contribution would restore it to 85%.",
    category: 'planning', priority: 'medium',
    scoring: { urgency: 55, impact: 65, efficiency: 50, relationship: 70, confidence: 82, composite: 62 },
    clients: [{ id: 'cli-011', name: 'Raj Patel' }, { id: 'cli-012', name: 'Priya Patel' }],
    trigger: { source: 'planning', condition: 'goal_probability_drop', value: '88% → 74%', detectedAt: '2026-02-20T10:00:00Z' },
    suggestedAction: 'Present contribution increase scenario; review asset allocation',
    estimatedImpact: 48_000, createdAt: '2026-02-20T10:15:00Z', dismissed: false,
    actionRoute: { path: '/clients/cli-011', openAI: true, aiMessage: 'Analyze Patel 529 education fund — probability dropped from 88% to 74%. Show contribution increase scenarios' },
  },
  {
    id: 'nba-006', title: 'Retirement plan review — Linda Garcia',
    description: 'Linda Garcia is 75 and her portfolio is 60% equities, which exceeds the risk tolerance guidelines for her age and conservative profile. Consider shifting to 40/60.',
    category: 'planning', priority: 'medium',
    scoring: { urgency: 60, impact: 55, efficiency: 45, relationship: 50, confidence: 78, composite: 56 },
    clients: [{ id: 'cli-016', name: 'Linda Garcia' }],
    trigger: { source: 'planning', condition: 'allocation_age_mismatch', value: '60% equity at age 75', detectedAt: '2026-02-22T08:00:00Z' },
    suggestedAction: 'Schedule review meeting; present de-risking glide path',
    estimatedImpact: 15_000, createdAt: '2026-02-22T08:30:00Z', dismissed: false,
    actionRoute: { path: '/clients/cli-016', openAI: true, aiMessage: 'Review retirement plan for Linda Garcia — portfolio is 60% equities at age 75 with conservative profile. Present de-risking glide path' },
  },
  // ── Risk ──
  {
    // D9 · this previously named an "AAPL (founder shares)" position for Margaret Chen — Apple has
    // no founder-shares class, acc-007 (her account) holds no AAPL, and no fixture holds AAPL
    // "founder shares" at all. Re-pointed at the real concentration in the dataset: acc-011
    // (David Williams) holds NVDA at 13.9% (pos-070, weight 0.139) against the 10% IPS limit.
    id: 'nba-007', title: 'Concentration risk — David Williams NVDA >13%',
    description: 'David Williams holds NVDA at 13.9% of his individual account (acc-011), against a 10% single-issuer IPS limit. A phased reduction paired with harvesting in correlated positions would bring it inside the limit while limiting the realised gain.',
    category: 'risk', priority: 'high',
    scoring: { urgency: 70, impact: 85, efficiency: 40, relationship: 55, confidence: 95, composite: 72 },
    clients: [{ id: 'cli-004', name: 'David Williams' }],
    trigger: { source: 'compliance', condition: 'concentration_exceeded', value: 'NVDA 13.9% vs 10% limit', detectedAt: '2026-02-24T07:00:00Z' },
    suggestedAction: 'Present systematic diversification plan with tax impact analysis',
    // Review round 1, Minor · 310_000 was the AAPL narrative's figure (Margaret Chen, a $6.8M
    // account) and survived onto a different client, account and security. The dollar amount that
    // actually needs trimming is the excess over the 10% IPS limit: pos-070's marketValue 390,000
    // minus 10% of acc-011's totalValue 2,800,000 (280,000) = 110,000.
    estimatedImpact: 110_000, createdAt: '2026-02-24T07:15:00Z', dismissed: false,
    // Review round 1, Important #3 · '/portfolios/accounts/acc-011/concentration' is not a route
    // (routes.tsx defines only accounts/:accountId, .../attribution and .../tax — no concentration
    // child). AccountDetailPage renders a "concentration" tab on the base account route, selected
    // via a ?tab= query param. Review round 2 correction: that ?tab= mechanism did not actually
    // work before this change — TabLayout never read the URL, so this route+params shape (matching
    // nba-007's own pre-existing actionRoute) silently landed on Overview rather than crashing.
    // TabLayout now reads `tab` from the URL (falling back to its prior defaultTab/tabs[0]
    // behavior when absent or unrecognised), so this actually opens the Concentration tab.
    actionRoute: { path: '/portfolios/accounts/acc-011', params: { tab: 'concentration' } },
  },
  {
    // D12 · Anderson's fixed income sleeve (acc-022/023/024/025, generated fallback) holds only
    // AGG and BND — no TLT to rotate out of. Rewritten to name the securities actually held.
    id: 'nba-008', title: 'Duration mismatch — Anderson fixed income',
    description: "Richard Anderson's fixed income is entirely AGG and BND, a blended effective duration of about 6.0 years against a 5.0-year target. Shortening with a short-duration sleeve would reduce rate sensitivity; estimate the tracking-error impact before trading.",
    category: 'risk', priority: 'medium',
    scoring: { urgency: 50, impact: 60, efficiency: 55, relationship: 40, confidence: 80, composite: 55 },
    clients: [{ id: 'cli-009', name: 'Richard Anderson' }],
    trigger: { source: 'pms', condition: 'duration_mismatch', value: '6.0y vs 5.0y target', detectedAt: '2026-02-23T14:00:00Z' },
    suggestedAction: 'Shorten duration with a short-duration bond sleeve',
    estimatedImpact: 22_000, createdAt: '2026-02-23T14:30:00Z', dismissed: false,
    actionRoute: { path: '/portfolios/risk' },
  },
  // ── Client Service ──
  {
    id: 'nba-009', title: 'Birthday in 3 days — Michael Martinez (Mar 1)',
    // D10 · households.ts gives Michael Martinez's DOB as 1968-12-07; his birthday is 7 December,
    // not March 1. Note: `title`, `trigger.value` and `expiresAt` still frame this as "in 3 days"
    // / "Mar 1" — re-dating those is a scheduling restructure outside this task's scope (this NBA
    // may not even belong in a near-term bucket once correctly dated) and is flagged, not silently
    // left unnoticed. `aiMessage`, unlike those, is narrative text like `description` — it is the
    // string fed to the AI drafting flow (NBAFeed.tsx), so it gets the same one-phrase fix.
    description: 'Michael Martinez turns 58 on 7 December. Last year you sent a handwritten note and a restaurant gift card. High-touch clients value personal gestures.',
    category: 'client_service', priority: 'medium',
    scoring: { urgency: 75, impact: 30, efficiency: 85, relationship: 90, confidence: 99, composite: 69 },
    clients: [{ id: 'cli-006', name: 'Michael Martinez' }],
    trigger: { source: 'crm', condition: 'birthday_approaching', value: 'Mar 1 — 3 days', detectedAt: '2026-02-25T06:00:00Z' },
    suggestedAction: 'Send birthday card; AI can draft personalized message',
    estimatedImpact: 0, createdAt: '2026-02-25T06:15:00Z', expiresAt: '2026-02-28T23:59:00Z', dismissed: false,
    actionRoute: { openAI: true, aiMessage: 'Draft a personalized birthday message for Michael Martinez turning 58 on 7 December. Last year we sent a handwritten note and restaurant gift card.' },
  },
  {
    id: 'nba-010', title: 'Annual review overdue — Williams Household',
    description: 'David & Sarah Williams last had a formal review on 2025-04-15 — over 10 months ago. Gold tier requires semi-annual reviews.',
    category: 'client_service', priority: 'high',
    scoring: { urgency: 80, impact: 50, efficiency: 60, relationship: 85, confidence: 95, composite: 73 },
    clients: [{ id: 'cli-004', name: 'David Williams' }, { id: 'cli-005', name: 'Sarah Williams' }],
    trigger: { source: 'crm', condition: 'review_overdue', value: 'Last review: 2025-04-15', detectedAt: '2026-02-20T08:00:00Z' },
    suggestedAction: 'Schedule semi-annual review; AI can generate prep brief',
    estimatedImpact: 0, createdAt: '2026-02-20T08:15:00Z', dismissed: false,
    actionRoute: { path: '/clients/cli-004', openAI: true, aiMessage: 'Prepare a semi-annual review brief for David & Sarah Williams. Last review was 2025-04-15.' },
  },
  {
    id: 'nba-011', title: 'Life event detected — Raj Patel new baby',
    description: "Raj Patel mentioned a new baby during last call (Feb 18). This triggers beneficiary updates, life insurance review, 529 account opening, and estate plan revision.",
    category: 'client_service', priority: 'high',
    scoring: { urgency: 65, impact: 70, efficiency: 50, relationship: 95, confidence: 75, composite: 69 },
    clients: [{ id: 'cli-011', name: 'Raj Patel' }],
    trigger: { source: 'crm', condition: 'life_event', value: 'New child — mentioned Feb 18', detectedAt: '2026-02-18T16:00:00Z' },
    suggestedAction: 'Create onboarding checklist: beneficiary updates, 529, insurance, estate plan',
    estimatedImpact: 50_000, createdAt: '2026-02-18T16:30:00Z', dismissed: false,
    actionRoute: { path: '/clients/cli-011', openAI: true, aiMessage: 'Create a life event action plan for Raj Patel — new baby. Include: beneficiary updates, 529 account opening, life insurance review, estate plan revision.' },
  },
  // ── Compliance ──
  {
    id: 'nba-012', title: 'IPS review overdue — Johnson Household',
    // Terminology · "SEC best practice" attributed a firm practice to a regulator; the SEC does
    // not mandate this cadence. Corrected to attribute it to firm policy.
    description: 'The Johnson Household IPS was last reviewed on 2024-09-10 — over 17 months ago. Firm policy requires an annual IPS review.',
    category: 'compliance', priority: 'medium',
    scoring: { urgency: 65, impact: 45, efficiency: 55, relationship: 50, confidence: 90, composite: 60 },
    clients: [{ id: 'cli-001', name: 'Robert Johnson' }, { id: 'cli-002', name: 'Patricia Johnson' }],
    trigger: { source: 'compliance', condition: 'ips_review_overdue', value: 'Last: 2024-09-10', detectedAt: '2026-02-15T08:00:00Z' },
    suggestedAction: 'Schedule IPS review; AI can generate updated IPS draft',
    estimatedImpact: 0, createdAt: '2026-02-15T08:15:00Z', dismissed: false,
    actionRoute: { path: '/clients/cli-001' },
    complianceInfo: {
      nonDismissible: true,
      escalationLevel: 'advisor',
      deadline: '2026-03-15T23:59:00Z',
      auditTrail: [
        { action: 'created', timestamp: '2026-02-15T08:15:00Z', actor: 'system', note: 'IPS review overdue >12 months' },
        { action: 'viewed', timestamp: '2026-02-20T09:30:00Z', actor: 'advisor-sarah-kim' },
        { action: 'escalated', timestamp: '2026-02-25T08:00:00Z', actor: 'system', note: 'Auto-escalated: 10 days remaining before deadline' },
      ],
    },
  },
  {
    id: 'nba-013', title: 'Large transaction alert — Anderson wire $250K',
    // Terminology · "over $100K" was stated as a federal threshold; no such fixed federal dollar
    // threshold exists. Reworded as firm policy, with the actual regulatory hook named: the
    // FinCEN investment-adviser AML programme rule.
    description: "Richard Anderson's account received a $250K wire transfer yesterday. Firm policy requires source-of-funds documentation above $100,000. The FinCEN investment-adviser AML programme rule took effect 1 January 2026.",
    category: 'compliance', priority: 'critical',
    scoring: { urgency: 95, impact: 40, efficiency: 60, relationship: 30, confidence: 99, composite: 69 },
    clients: [{ id: 'cli-009', name: 'Richard Anderson' }],
    trigger: { source: 'custodian', condition: 'large_transaction', value: '$250,000 wire received', detectedAt: '2026-02-24T15:00:00Z' },
    suggestedAction: 'Contact client for source-of-funds documentation; file compliance report',
    estimatedImpact: 250_000, createdAt: '2026-02-24T15:15:00Z', expiresAt: '2026-02-26T17:00:00Z', dismissed: false,
    actionRoute: { path: '/clients/cli-009', openAI: true, aiMessage: 'Draft a source-of-funds request email for Richard Anderson regarding the $250K wire transfer received yesterday.' },
    complianceInfo: {
      nonDismissible: true,
      escalationLevel: 'supervisor',
      deadline: '2026-02-26T17:00:00Z',
      auditTrail: [
        { action: 'created', timestamp: '2026-02-24T15:15:00Z', actor: 'system', note: 'Large transaction >$100K — source-of-funds required' },
        { action: 'viewed', timestamp: '2026-02-24T15:30:00Z', actor: 'advisor-sarah-kim' },
        { action: 'escalated', timestamp: '2026-02-25T08:00:00Z', actor: 'system', note: 'Auto-escalated to supervisor: <48h remaining' },
      ],
    },
  },
  // ── Growth ──
  {
    id: 'nba-014', title: 'Held-away 401(k) review — Williams $1.2M',
    // Compliance §5.4 · reg-bi / fiduciary-standards / fee-disclosure / conflicts-of-interest —
    // this previously read "Consolidating could save ~$4,800/year in fees". The Williams household
    // is billed at 85 bps, so rolling $1.2M into an advisor-managed IRA ADDS roughly $10,200/year
    // against a plan cost of about $5,400 — a net increase of ~$4,800, not a saving. Rollover
    // recommendations are the exact fact pattern Reg BI's Care Obligation and DOL PTE 2020-02
    // target, and "you will save money" is the specific claim that gets cited.
    description: "David Williams holds $1.2M in a 401(k) at a former employer (Fidelity). Estimated plan cost is 0.45% ($5,400 a year); our schedule for this household is 0.85% ($10,200 a year), so a rollover would raise annual cost by about $4,800. Weigh that against consolidated tax management, household-level rebalancing and planning. Present both options, including leaving the assets in the plan.",
    category: 'growth', priority: 'medium',
    scoring: { urgency: 35, impact: 75, efficiency: 45, relationship: 65, confidence: 70, composite: 55 },
    clients: [{ id: 'cli-004', name: 'David Williams' }],
    trigger: { source: 'crm', condition: 'held_away_opportunity', value: '$1.2M at Fidelity 401(k)', detectedAt: '2026-02-10T08:00:00Z' },
    suggestedAction: 'Prepare a written rollover cost comparison and the PTE 2020-02 disclosure before any recommendation is made',
    estimatedImpact: 0,
    // Fee-increase figures must never feed the recommendation's priority score — that was the
    // conflict of interest at the heart of Compliance §5.4 (a rollover ranked higher precisely
    // because it cost the client more). estimatedImpactNote explains why this is 0, not a revenue
    // figure: rollover recommendations must be evaluated on the client's interest, not the fee
    // they generate.
    estimatedImpactNote: 'Not scored on revenue — a rollover recommendation must be evaluated on the client’s interest, not the fee it generates.',
    createdAt: '2026-02-10T08:30:00Z', dismissed: false,
    actionRoute: { path: '/clients/cli-004', openAI: true, aiMessage: 'Prepare a rollover cost comparison for David Williams: $1.2M 401(k) at Fidelity. Show plan cost against our schedule, list the non-fee considerations on both sides, and draft the PTE 2020-02 disclosure.' },
  },
  {
    id: 'nba-015', title: 'Referral follow-up — Thompson mentioned colleague',
    description: 'James Thompson mentioned his colleague Dr. Amanda Foster (orthopedic surgeon, ~$3M investable) during Feb 20 meeting. Follow up within 5 business days.',
    category: 'growth', priority: 'medium',
    scoring: { urgency: 70, impact: 80, efficiency: 65, relationship: 75, confidence: 60, composite: 71 },
    clients: [{ id: 'cli-008', name: 'James Thompson' }],
    trigger: { source: 'crm', condition: 'referral_mention', value: 'Dr. Amanda Foster — ~$3M', detectedAt: '2026-02-20T14:00:00Z' },
    suggestedAction: 'Send thank-you note to James; request introduction email; AI can draft outreach',
    estimatedImpact: 22_500, createdAt: '2026-02-20T14:15:00Z', dismissed: false,
    actionRoute: { path: '/growth', openAI: true, aiMessage: 'Draft a referral outreach email for Dr. Amanda Foster (orthopedic surgeon, ~$3M investable) — referred by James Thompson.' },
  },
  // ── Additional batch items for volume ──
  {
    id: 'nba-016', title: 'Quarterly review prep — Anderson Household',
    description: 'Richard & Susan Anderson have a quarterly review scheduled for Mar 5. Generate prep materials including performance summary, planning update, and discussion agenda.',
    category: 'client_service', priority: 'medium',
    scoring: { urgency: 70, impact: 45, efficiency: 80, relationship: 70, confidence: 90, composite: 68 },
    clients: [{ id: 'cli-009', name: 'Richard Anderson' }, { id: 'cli-010', name: 'Susan Anderson' }],
    trigger: { source: 'calendar', condition: 'upcoming_review', value: 'Mar 5 quarterly review', detectedAt: '2026-02-25T06:00:00Z' },
    suggestedAction: 'Generate AI meeting brief; review performance; prepare agenda',
    estimatedImpact: 0, createdAt: '2026-02-25T06:15:00Z', dismissed: false,
    actionRoute: { path: '/clients/cli-009', openAI: true, aiMessage: 'Generate a quarterly review prep brief for the Anderson Household — meeting scheduled Mar 5. Include performance summary, planning update, and discussion agenda.' },
  },
  {
    id: 'nba-017', title: 'Roth conversion window — Thompson IRA',
    description: "James Thompson's income will be lower this year in retirement. A partial Roth conversion of $150K could save significant taxes over 10+ years.",
    category: 'tax_management', priority: 'medium',
    scoring: { urgency: 55, impact: 70, efficiency: 45, relationship: 55, confidence: 72, composite: 59 },
    clients: [{ id: 'cli-008', name: 'James Thompson' }],
    trigger: { source: 'planning', condition: 'roth_conversion_opportunity', value: 'Lower income year', detectedAt: '2026-02-15T10:00:00Z' },
    suggestedAction: 'Model Roth conversion scenarios at $50K, $100K, $150K; project tax brackets',
    estimatedImpact: 38_000, createdAt: '2026-02-15T10:30:00Z', dismissed: false,
    actionRoute: { path: '/portfolios/accounts/acc-020/tax' },
  },
  {
    id: 'nba-018', title: 'New model available — ESG Balanced Growth',
    description: 'The firm launched a new ESG Balanced Growth model. Three clients have expressed ESG preferences: Margaret Chen, Susan Anderson, Karen O\'Brien.',
    category: 'rebalancing', priority: 'low',
    scoring: { urgency: 20, impact: 40, efficiency: 70, relationship: 60, confidence: 65, composite: 43 },
    clients: [
      { id: 'cli-003', name: 'Margaret Chen' }, { id: 'cli-010', name: 'Susan Anderson' },
      { id: 'cli-014', name: "Karen O'Brien" },
    ],
    groupId: 'grp-003',
    trigger: { source: 'pms', condition: 'new_model_available', value: 'ESG Balanced Growth', detectedAt: '2026-02-22T12:00:00Z' },
    suggestedAction: 'Present ESG model comparison; show tracking error vs current allocation',
    estimatedImpact: 0, createdAt: '2026-02-22T12:15:00Z', dismissed: false,
    actionRoute: { path: '/portfolios/rebalance' },
  },
  {
    id: 'nba-019', title: 'Account funding incomplete — Foster brokerage',
    description: "William Foster's new individual brokerage account (opened Feb 15) has not received the expected $200K initial deposit after 10 days.",
    category: 'compliance', priority: 'medium',
    scoring: { urgency: 65, impact: 35, efficiency: 70, relationship: 55, confidence: 88, composite: 59 },
    clients: [{ id: 'cli-017', name: 'William Foster' }],
    trigger: { source: 'custodian', condition: 'funding_incomplete', value: 'Expected $200K — 10 days', detectedAt: '2026-02-25T08:00:00Z' },
    suggestedAction: 'Contact William to verify wire details; check with custodian',
    estimatedImpact: 200_000, createdAt: '2026-02-25T08:15:00Z', dismissed: false,
    actionRoute: { path: '/clients/cli-017', openAI: true, aiMessage: 'Draft a follow-up email to William Foster about the expected $200K initial deposit for his new brokerage account. Verify wire details.' },
    complianceInfo: {
      nonDismissible: true,
      escalationLevel: 'none',
      deadline: '2026-03-10T23:59:00Z',
      auditTrail: [
        { action: 'created', timestamp: '2026-02-25T08:15:00Z', actor: 'system', note: 'Funding incomplete after 10 days' },
      ],
    },
  },
  {
    // D11 · acc-032 is on mod-006 (Education 529), whose equity target is 55% (45% US + 10%
    // intl), not 80% — no model in the fixtures targets 80% equity. Review round 1, Important #1:
    // the actual figure was also wrong (62%) — acc-032 has no explicit positions, so it uses
    // `getPositionsForAccount`'s generated fallback, whose equity weights (VTI 0.348 + QQQ 0.087
    // + EFA 0.145) sum to exactly 58.0%, independent of the account's totalValue.
    id: 'nba-020', title: 'Rebalancing overdue — O\'Brien 529',
    description: "The O'Brien 529 account hasn't been rebalanced in 14 months. The equity allocation has drifted from its 55% equity target to 58%.",
    category: 'rebalancing', priority: 'low',
    scoring: { urgency: 40, impact: 25, efficiency: 80, relationship: 45, confidence: 90, composite: 47 },
    clients: [{ id: 'cli-013', name: "Brian O'Brien" }],
    trigger: { source: 'pms', condition: 'rebalance_overdue', value: '14 months since last', detectedAt: '2026-02-24T08:00:00Z' },
    suggestedAction: 'Generate rebalance proposal to return to the 55/45 target',
    estimatedImpact: 0, createdAt: '2026-02-24T08:30:00Z', dismissed: false,
    actionRoute: { path: '/portfolios/rebalance' },
  },
]
