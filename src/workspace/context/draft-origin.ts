import type { Directory, Draft } from '@/types/workspace'
import { personIn } from '@/workspace/people/directory-people'

/** Who wrote a draft, at whose request, who edited it, and which approved version it was written from. */
export function draftOrigin(draft: Draft, directory: Directory): string {
  const author = personIn(directory, draft.authorId).name
  const agent = draft.agentId ? directory.agents.find((a) => a.id === draft.agentId)?.name : undefined
  const who = !agent ? `Drafted by ${author}` : draft.supersedes ? `${agent}'s draft, edited by ${author}` : `Drafted by ${agent} at ${author}'s request`
  return draft.basis ? `${who} · from v${draft.basis.version} · fingerprint ${draft.basis.fingerprint}` : who
}
