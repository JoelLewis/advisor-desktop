/**
 * Items the firm has on file to resolve with a household, each from the record that raised it. `text`
 * is how a full view states it; `claim` is how an agent says it (digit-free); `agendaWords` name it in
 * an agenda title.
 */
export type OpenItemFixture = { id: string; householdId: string; text: string; claim: string; agendaWords: string; source: string; asOf: string }

export const OPEN_ITEMS: readonly OpenItemFixture[] = [
  {
    id: 'oi-001', householdId: 'hh-001',
    text: "Confirm Robert Johnson has corrected the beneficiary on his held-away Vanguard 401(k) (ha-001) to match the estate plan.",
    claim: "the beneficiary on Robert's Vanguard plan does not match the estate plan",
    agendaWords: 'the Vanguard beneficiary',
    source: 'comm-014', asOf: '2026-02-03T13:00:00Z',
  },
]
