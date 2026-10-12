import type { BindingAct, Directory, Draft } from '@/types/workspace'
import { personIn } from '@/workspace/people/directory-people'

/** Who wrote a draft, at whose request, who edited it, and which approved version it was written from. */
export function draftOrigin(draft: Draft, directory: Directory): string {
  const author = personIn(directory, draft.authorId).name
  const agent = draft.agentId ? directory.agents.find((a) => a.id === draft.agentId)?.name : undefined
  const who = !agent ? `Drafted by ${author}` : draft.supersedes ? `${agent}'s draft, edited by ${author}` : `Drafted by ${agent} at ${author}'s request`
  return draft.basis ? `${who} · from v${draft.basis.version} · fingerprint ${draft.basis.fingerprint}` : who
}

/** Where a sent agent letter came from, for the firm's record: its approved version and who edited it. Undefined for other acts. */
export function sentLetterOrigin(act: BindingAct, directory: Directory): string | undefined {
  if (act.kind !== 'send_to_client' || !act.editedBy) return undefined
  const editors = act.editedBy.map((id) => personIn(directory, id).name)
  const edits = editors.length > 0 ? `edited by ${editors.join(' and ')}` : 'agent draft, unedited'
  return act.basis ? `from v${act.basis.version} · fingerprint ${act.basis.fingerprint} · ${edits}` : edits
}
