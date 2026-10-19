import type { Directory, VersionAuthor } from '@/types/workspace'
import { personIn } from '@/workspace/people/directory-people'

export function authorName(author: VersionAuthor, directory: Directory): string {
  if (author.kind === 'person') return personIn(directory, author.personId).name
  const agent = directory.agents.find((a) => a.id === author.agentId)
  if (!agent) throw new Error(`No agent "${author.agentId}" in the directory`)
  return agent.name
}
