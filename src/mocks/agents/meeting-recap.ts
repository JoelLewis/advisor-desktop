import type { MeetingFiling, NoteSection } from '@/types/workspace-meeting'
import type { ClientLetter } from './client-letter'

/** A sentence from the firm's records (a date the notes may not carry) set directly after one filed line. */
export type RecordSentence = { afterLineId: string; text: string }

export type RecapInput = { greetingName: string; withOthers: boolean; filing: MeetingFiling; signerName: string; recordSentences?: readonly RecordSentence[] }

export const RECAP_HEADINGS = { client_requests: 'What you asked us', decisions: 'What we decided' } as const

/**
 * The Client Letter Agent's recap of a filed meeting record: only what the clients asked and what was
 * decided, as filed — the lines say who does what in the firm's voice. No transcript text, no
 * discussion line, no follow-up task, no colleague, no figure. A record sentence is the one addition:
 * a date taken from the engine, since note text carries no digits.
 */
export function writeMeetingRecap({ greetingName, withOthers, filing, signerName, recordSentences = [] }: RecapInput): ClientLetter {
  const listed = (section: Extract<NoteSection, 'client_requests' | 'decisions'>) => {
    const lines = filing.lines.filter((l) => l.section === section).flatMap((l) => [
      `- ${l.text}`,
      ...recordSentences.filter((r) => r.afterLineId === l.id).map((r) => `- ${r.text}`),
    ])
    return lines.length > 0 ? [[`${RECAP_HEADINGS[section]}:`, ...lines].join('\n')] : []
  }
  const asked = listed('client_requests')
  const decided = listed('decisions')
  const paragraphs = [
    `Dear ${greetingName},`,
    `Thank you${withOthers ? ' both' : ''} for meeting with me today. Here is what we agreed.`,
    ...asked,
    ...decided,
    ...(asked.length + decided.length === 0 ? ['Nothing was decided or asked of us at this meeting.'] : []),
    'If anything here is not as you remember it, please tell me.',
    signerName,
  ]
  return { body: paragraphs.join('\n\n'), figures: [] }
}
