import type { BindingAct, Directory, Draft, LetterBasis, RecordBasis } from '@/types/workspace'
import { personIn } from '@/workspace/people/directory-people'

/** What an agent letter was written from: an approved version, or a filed meeting record. */
function basisWords(basis: LetterBasis | undefined, recordBasis: RecordBasis | undefined): string | undefined {
  if (basis) return `from v${basis.version} · fingerprint ${basis.fingerprint}`
  if (recordBasis) return `from the filed record ${recordBasis.actId} · fingerprint ${recordBasis.fingerprint}`
  return undefined
}

/** Who wrote a draft, at whose request, who edited it, and what it was written from. */
export function draftOrigin(draft: Draft, directory: Directory): string {
  const author = personIn(directory, draft.authorId).name
  const agent = draft.agentId ? directory.agents.find((a) => a.id === draft.agentId)?.name : undefined
  const who = !agent ? `Drafted by ${author}` : draft.supersedes ? `${agent}'s draft, edited by ${author}` : `Drafted by ${agent} at ${author}'s request`
  const from = basisWords(draft.basis, draft.recordBasis)
  return from ? `${who} · ${from}` : who
}

/** Where a sent agent letter came from, for the firm's record: what it was written from and who edited it. Undefined for other acts. */
export function sentLetterOrigin(act: BindingAct, directory: Directory): string | undefined {
  if (act.kind !== 'send_to_client' || !act.editedBy) return undefined
  const editors = act.editedBy.map((id) => personIn(directory, id).name)
  const edits = editors.length > 0 ? `edited by ${editors.join(' and ')}` : 'agent draft, unedited'
  const from = basisWords(act.basis, act.recordBasis)
  return from ? `${from} · ${edits}` : edits
}
