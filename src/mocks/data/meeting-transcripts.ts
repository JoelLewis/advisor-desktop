import type { TranscriptLine } from '@/types/workspace-meeting'

/**
 * The Johnson annual review (evt-010), as the transcript service delivers it once the meeting is held.
 * Fixture data: it states no figure (the figures on screen come from the engine), and it follows the
 * story of Phases 3–4 — this morning's rebalance and the rest of the INTC harvest.
 */
export const JOHNSON_REVIEW_TRANSCRIPT: readonly TranscriptLine[] = [
  { id: 't-01', speaker: 'user-001', text: "Thank you both for coming in. I'd like to start with what changed this morning, then the plan, then a few open items." },
  { id: 't-02', speaker: 'user-001', text: "This morning we rebalanced Robert's individual account and sold the rest of the Intel shares at a loss. That loss can be deducted now only if no Intel is bought back before its window closes." },
  { id: 't-03', speaker: 'cli-001', text: "So I shouldn't buy Intel again for now, even in my IRA?" },
  { id: 't-04', speaker: 'user-001', text: "Right: not in any of your accounts or Patricia's, and that includes the IRAs. The firm also counts the old Vanguard plan as if it were included; the rule for employer plans is unsettled, so that is our policy. And dividends set to reinvest into Intel count as buying it." },
  { id: 't-05', speaker: 'cli-001', text: "Understood. I'll leave Intel alone until you tell me the window has closed." },
  { id: 't-06', speaker: 'user-001', text: 'The plan shows the legacy goal at risk. The retirement goal is on track.' },
  { id: 't-07', speaker: 'cli-002', text: "The legacy goal matters most to me. I don't want to give up on it." },
  { id: 't-08', speaker: 'user-001', text: "Then we keep it. Mike will have scenarios ready by Monday, and we'll bring you the options at the next review." },
  { id: 't-09', speaker: 'user-001', text: "Patricia, your accounts sit well away from the models they are assigned to." },
  { id: 't-10', speaker: 'cli-002', text: "I'm more cautious than those models assume." },
  { id: 't-11', speaker: 'user-001', text: "Then I'll review your risk profile and the models on your accounts by Monday, before we trade in them. Nothing is traded in your accounts until that review is done." },
  { id: 't-12', speaker: 'cli-001', text: 'My required distributions start in a few years. Should we be converting some of the IRA to a Roth before then?' },
  { id: 't-13', speaker: 'user-001', text: 'It is worth modelling. Your distributions begin in the year you turn seventy-three, so the years before that are the window.' },
  { id: 't-14', speaker: 'cli-001', text: 'Please model a few conversion amounts for us.' },
  { id: 't-15', speaker: 'user-001', text: "We will. Mike will run the analysis by Friday next week. It will be an estimate, not tax advice, and I'll contact your CPA by this Friday so they are part of the decision." },
  { id: 't-16', speaker: 'cli-002', text: "We have Robert's Vanguard 401(k) and my TIAA 403(b) sitting outside. Would it make sense to bring them here?" },
  { id: 't-17', speaker: 'user-001', text: "I can't answer that today. Moving them needs a proper comparison first: the plans' fees, their services and their investment options against ours." },
  { id: 't-18', speaker: 'user-001', text: 'Sarah will request the plan fee disclosures and your recent statements by next Wednesday so we can make that comparison.' },
  { id: 't-19', speaker: 'cli-001', text: "That's fair." },
  { id: 't-20', speaker: 'user-001', text: "One more item on the Vanguard plan: the beneficiary on file doesn't match your estate plan." },
  { id: 't-21', speaker: 'cli-001', text: "I'll call the plan administrator to fix it." },
  { id: 't-22', speaker: 'user-001', text: "Sarah will send you our beneficiary checklist tomorrow so you have everything they'll ask for." },
  { id: 't-23', speaker: 'cli-001', text: "I've been reading about ESG funds. Could the trust hold some?" },
  { id: 't-24', speaker: 'user-001', text: "We can look at alternatives, but the trust's investment policy statement would need a signed amendment before anything changes." },
  { id: 't-25', speaker: 'cli-001', text: "Then let's look at an amendment." },
  { id: 't-26', speaker: 'user-001', text: "I'll draft the amendment by Friday, March thirteenth, so we can go through it at the next meeting." },
  { id: 't-27', speaker: 'user-001', text: 'Otherwise the investment policy statement stays as signed; nothing else in it needs to change.' },
  { id: 't-28', speaker: 'cli-002', text: 'Agreed.' },
]

const TRANSCRIPTS: ReadonlyMap<string, readonly TranscriptLine[]> = new Map([['evt-010', JOHNSON_REVIEW_TRANSCRIPT]])

export function transcriptOf(eventId: string): readonly TranscriptLine[] | undefined {
  return TRANSCRIPTS.get(eventId)
}
