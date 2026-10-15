import type { AssetClass } from './portfolio'
import type { GoalStatus } from './planning'
import type { DocumentType, SignatureStatus } from './document'
import type { CommChannel, CommDirection } from './client-comms'
import type { HouseholdRelationship } from './household'
import type { MeetingState } from './workspace-meeting'

/** A reason the engine can state, without a proposal, that an out-of-band class cannot be closed by selling. */
export type StructuralResidual = 'not_market_tradable' | 'replacement_hold'
export type OutOfBand = { assetClass: AssetClass; drift: number; residual?: StructuralResidual }

type HouseholdAccountBase = {
  accountId: string; name: string; ownerId: string; ownerName: string; typeLabel: string
  /** The sum of the account's positions as the book stands (moved by the session's fills). */
  value: number
}
/** A model-managed account against its model's band; a custom mandate has no model and so no drift. */
export type HouseholdAccount = HouseholdAccountBase & (
  | { mandate: 'model'; modelName: string; driftTolerance: number; maxAbsDrift: number; withinBand: boolean; outside: OutOfBand[] }
  | { mandate: 'custom'; mandateSummary: string }
)
/** An account the firm does not manage: its value as last reported, outside the firm's view. */
type HeldAwayHolding = { id: string; ownerName: string; institution: string; accountType: string; value: number; reportedOn: string }
/** `funded` is current funding over the target, a fraction. */
type PlanGoal = { id: string; name: string; probability: number; funded: number; status: GoalStatus }
type TaxpayerWindow = { saleId: string; accountName: string; symbol: string; name: string; saleDate: string; through: string; loss: number }
export type IpsOnFile = { documentId: string; name: string; signatureStatus: SignatureStatus; signedOn?: string }
type HouseholdOpenItem = { id: string; text: string; source: string }
type HouseholdMember = { clientId: string; name: string; relationship: HouseholdRelationship; dateOfBirth: string }

export type HouseholdSummary = {
  id: string; name: string
  /** "Johnson", for labels such as "Household · Johnson". */
  shortName: string
  members: HouseholdMember[]
  accounts: HouseholdAccount[]
  managedValue: number
  heldAway: HeldAwayHolding[]
  heldAwayValue: number
  goals: PlanGoal[]
  planProbability?: number
  windows: TaxpayerWindow[]
  ips?: IpsOnFile
  openItems: HouseholdOpenItem[]
  /** The session clock when this was read. */
  asOf: string
}

type DocumentRow = { id: string; name: string; type: DocumentType; clientName: string; signatureStatus: SignatureStatus; updatedOn: string }
export type CommunicationRow = { id: string; clientName: string; channel: CommChannel; direction: CommDirection; subject: string; summary: string; at: string }
type ActivityRow = { id: string; title: string; description: string; at: string }
/** A meeting on the household's calendar: one the workspace runs carries its state and thread; any other is a calendar entry. */
export type MeetingRef = { eventId: string; title: string; start: string; end: string; state: MeetingState | 'calendar'; threadId?: string }

export type HouseholdView = HouseholdSummary & {
  documents: DocumentRow[]
  communications: CommunicationRow[]
  activity: ActivityRow[]
  meetings: { past: MeetingRef[]; upcoming: MeetingRef[] }
}

export type ClientView = {
  id: string; name: string; householdId: string; householdName: string; dateOfBirth: string; occupation: string
  preferredContact?: string
  /** The risk score as a fraction of the 100-point scale. */
  risk: { tolerance: string; scoreFraction: number; assessedOn: string }
  accounts: HouseholdAccount[]
  /** The sum of the client's own accounts' values. */
  accountsValue: number
  ips?: IpsOnFile
  communications: CommunicationRow[]
}
