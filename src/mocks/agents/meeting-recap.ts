import type { MeetingFiling, NoteLine, NoteSection } from '@/types/workspace-meeting'
import type { ClientLetter } from './client-letter'
import { FIRM_NAME } from '@/lib/firm'
import { joinWords } from '@/lib/words'

/**
 * `addresseeId` is the client the recap is written to: a filed line worded for them is read in that wording.
 * `greetingNames` are the first names of the clients who attended, the addressee first.
 */
export type RecapInput = { addresseeId: string; greetingNames: string[]; filing: MeetingFiling; signerName: string; windowSentence?: string }

const RECAP_HEADINGS = { client_requests: 'What you asked us', decisions: 'What we decided' } as const

/** A filed line as the addressee reads it: the wording filed for them, else the line as filed. */
const asRead = (line: NoteLine, addresseeId: string) => (line.toClient?.clientId === addresseeId ? line.toClient.text : line.text)

/**
 * The Client Letter Agent's recap of a filed meeting record: only what the clients asked and what was
 * decided, as filed — each line in the wording filed for the addressee ("you"), else as the firm
 * recorded it. Nothing is reworded here: both wordings are part of the filed record. No transcript text, no
 * discussion line, no follow-up task, no colleague, no figure. The window sentence is the one addition:
 * a date taken from the engine, since note text carries no digits. It precedes the first decision about Intel,
 * so the plain instruction comes before the detail it governs, or ends the decisions when none mentions Intel,
 * so it is never dropped.
 */
export function writeMeetingRecap({ addresseeId, greetingNames, filing, signerName, windowSentence }: RecapInput): ClientLetter {
  const listed = (section: Extract<NoteSection, 'client_requests' | 'decisions'>) => {
    const lines = filing.lines.filter((l) => l.section === section).map((l) => `- ${asRead(l, addresseeId)}`)
    return lines.length > 0 ? [[`${RECAP_HEADINGS[section]}:`, ...lines].join('\n')] : []
  }
  const decisionsWithWindow = () => {
    const lines = filing.lines.filter((l) => l.section === 'decisions').map((l) => `- ${asRead(l, addresseeId)}`)
    if (windowSentence !== undefined) {
      const about = lines.findIndex((l) => /\bIntel\b/.test(l))
      lines.splice(about === -1 ? lines.length : about, 0, `- ${windowSentence}`)
    }
    return lines.length > 0 ? [[`${RECAP_HEADINGS.decisions}:`, ...lines].join('\n')] : []
  }
  const asked = listed('client_requests')
  const decided = decisionsWithWindow()
  const paragraphs = [
    `Dear ${joinWords(greetingNames)},`,
    `Thank you${greetingNames.length === 2 ? ' both' : greetingNames.length > 2 ? ' all' : ''} for meeting with me today. Here is what we agreed.`,
    ...asked,
    ...decided,
    ...(asked.length + decided.length === 0 ? ['Nothing was decided or asked of us at this meeting.'] : []),
    'If anything here is not as you remember it, please tell me.',
    `${signerName}\n${FIRM_NAME}`,
  ]
  return { body: paragraphs.join('\n\n'), figures: [] }
}
