import type { AssetClass } from './portfolio'
import type { RiskAnswer } from './onboarding'
import type { BindingAct, VersionAuthor, ViaPresenter } from './workspace'

export type ProspectStage = 'contact' | 'discovery' | 'proposal' | 'accepted' | 'onboarding'

/** One line of a statement she shared: held away, never an engine position. */
export type Holding = { symbol: string; name: string; quantity: number; costBasis: number; acquired: string; assetClass: AssetClass }
export type StatementAccountType = 'taxable_brokerage' | '403b'
export type Statement = { id: string; custodian: string; accountType: StatementAccountType; holdings: Holding[]; cash: number; asOf: string }

export type DisclosureDocument = 'form_crs' | 'adv_2a' | 'adv_2b' | 'privacy_notice'
export const DISCLOSURE_DOCUMENTS: readonly DisclosureDocument[] = ['form_crs', 'adv_2a', 'adv_2b', 'privacy_notice']
export const isDisclosureDocument = (value: unknown): value is DisclosureDocument =>
  typeof value === 'string' && (DISCLOSURE_DOCUMENTS as readonly string[]).includes(value)
export const DISCLOSURE_TITLES: Readonly<Record<DisclosureDocument, string>> = {
  form_crs: 'Form CRS (client relationship summary)',
  adv_2a: 'Form ADV Part 2A (firm brochure)',
  adv_2b: 'Form ADV Part 2B (brochure supplement)',
  privacy_notice: 'Privacy notice',
}
/** Append-only: each delivery names the act that recorded it. */
export type DisclosureDelivery = { document: DisclosureDocument; actId: string; at: string; deliveredBy: string }

export type Questionnaire = { answers: RiskAnswer[]; receivedAt: string }
export type PartyStepKind = 'questionnaire' | 'statements' | 'acceptance'
/** A step of hers, with the firm-only record of how the one presenter performed it. */
export type PartyStep = { kind: PartyStepKind; at: string; messageId: string; actId?: string; viaPresenter: ViaPresenter }
export type ProspectTask = { id: string; text: string; ownerId: string; due: string; createdAt: string; fromActId: string }

export type OnboardingItemId = 'account_application' | 'cip' | 'ofac' | 'trusted_contact' | 'source_of_funds' | 'advisory_agreement' | 'adv_2b' | 'privacy_notice' | 'acat'
export type OnboardingItemStatus = 'open' | 'awaiting_signature' | 'delivered' | 'not_started'
export type OnboardingItem = { id: OnboardingItemId; label: string; status: OnboardingItemStatus; ownerId: string; due?: string }
export type OnboardingChecklist = { openedAt: string; acceptanceActId: string; items: OnboardingItem[] }

export type StageChange = { stage: ProspectStage; at: string }
export type Coffee = { at: string; messageId: string; authorId: string }
export type SentProposal = { proposalId: string; version: number; actId: string; messageId: string; at: string }
export type Acceptance = { proposalId: string; version: number; actId: string; at: string }

/** The session's record of a prospect: reset with the workspace store. */
export type ProspectRecord = {
  id: string
  name: string
  /** How a letter addresses her: "Dr. Pell". */
  salutation: string
  referredBy?: string
  stage: ProspectStage
  stageHistory: StageChange[]
  threadId: string
  internalThreadId: string
  /** The calendar event of the first meeting (the coffee). */
  eventId: string
  coffee?: Coffee
  questionnaire?: Questionnaire
  /** Shared by her; held-away data, not engine positions. */
  statements: Statement[]
  disclosures: DisclosureDelivery[]
  steps: PartyStep[]
  tasks: ProspectTask[]
  sent?: SentProposal
  accepted?: Acceptance
  onboarding?: OnboardingChecklist
}

/** The one revision the Proposal Agent takes for a prospect: document a staged sale of the concentrated stock. */
export type ProspectConstraint = { kind: 'stage_diversification'; tranches: 2 | 3 }

/** A holding she would transfer: in kind, with what selling it now would realise. */
export type TransferLine = {
  statementId: string; symbol: string; name: string; assetClass: AssetClass; securityKind: 'single_name' | 'fund'
  quantity: number; price: number; marketValue: number; costBasis: number; acquired: string; holdingPeriod: 'short' | 'long'
  unrealised: number; taxIfSoldNow: number; plan: 'in_kind'
}
export type HeldAwayLine = { statementId: string; custodian: string; accountType: '403b'; value: number; rollover: 'asked_about' }
export type Sleeve = { assetClass: AssetClass; target: number; transferred: number }
export type Concentration = { symbol: string; name: string; marketValue: number; weightOfAssets: number; totalAssets: number; unrealised: number; taxIfSoldNow: number }
export type Tranche = { n: number; taxYear: number; shares: number; proceeds: number; gain: number; tax: number }
export type FeeEstimate = { scheduleName: string; base: number; annual: number; blendedRate: number; tiers: { label: string; rate: number }[] }

export type ProspectProposalVersion = {
  n: number
  author: VersionAuthor
  createdAt: string
  constraints: ProspectConstraint[]
  score: number
  profileLabel: string
  modelId: string
  modelName: string
  transfer: TransferLine[]
  cash: number
  transferValue: number
  totalAssets: number
  sleeves: Sleeve[]
  concentration?: Concentration
  tranches: Tranche[]
  heldAway: HeldAwayLine[]
  fees: FeeEstimate
  pricesAsOf: string
  /** What she reads when it is sent: plain language, figures formatted for a client. */
  clientSummary: string
  changeSummary: string
  fingerprint: string
}

export type BestInterestAlternative = { kind: 'lower_risk_model' | 'self_directed'; name: string; annualFee: number; why: string }
/** Firm only: why this recommendation is in her best interest, filed with the approval. */
export type BestInterestRecord = {
  rationale: string
  profileLabel: string
  score: number
  modelId: string
  modelName: string
  alternatives: BestInterestAlternative[]
  costs: { scheduleName: string; annualFee: number; blendedRate: number }
  concentration?: { symbol: string; name: string; weightOfAssets: number; unrealised: number; taxIfSoldNow: number }
  /** What she would hold if everything moves in kind, against the model; reaching the model takes sales. */
  inKindVsModel: string
  rollover: string
}
/** What the engine would file for the latest version, shown before approval; the advisor adds the rationale. */
export type BestInterestDraft = Omit<BestInterestRecord, 'rationale'>
export type ProspectApproval = { version: number; fingerprint: string; actId: string; approverId: string; at: string }
export type ProspectProposal = { id: string; prospectId: string; title: string; threadId: string; versions: ProspectProposalVersion[]; approval?: ProspectApproval }
export type ProspectProposalDetail = ProspectProposal & { sent?: SentProposal; accepted?: Acceptance; bestInterestDraft: BestInterestDraft }
/** What one of her steps (or a clock jump) returns: her steps as they now stand, and the act it recorded, if any. */
export type StepOutcome = { steps: PartySteps; act?: BindingAct }

export type ProfileResult = { score: number; profileLabel: string; floor: number; ceiling: number; modelId: string; modelName: string }
export type TransferSummary = { lines: TransferLine[]; cash: number; heldAway: HeldAwayLine[]; transferValue: number; totalAssets: number; pricesAsOf: string }
export type NextJump = { to: 'reply' | 'acceptance'; at: string; blockedReason?: string }
/** The prospect as the firm reads her. */
export type ProspectView = ProspectRecord & {
  referrerName?: string
  profile?: ProfileResult
  transfer?: TransferSummary
  proposals: ProspectProposalDetail[]
  nextJump?: NextJump
  formCrsDelivered: boolean
  /** The documents that may be delivered now. */
  deliverable: DisclosureDocument[]
}
export type ProspectSummary = { id: string; name: string; stage: ProspectStage; threadId: string; internalThreadId: string }
export type StepState = 'open' | 'done' | 'unavailable'
/** Her own steps, as she (and the firm) may read them. */
export type PartySteps = { questionnaire: StepState; statements: StepState; acceptance: StepState; sentVersion?: number }
export type ProspectStepName = 'questionnaire' | 'statements' | 'accept'
export const isProspectStepName = (value: unknown): value is ProspectStepName => value === 'questionnaire' || value === 'statements' || value === 'accept'
