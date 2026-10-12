import { Link } from 'react-router-dom'
import { fmtTimestamp } from '@/kit/measure'
import { personIn } from '@/workspace/people/directory-people'
import { useViewer } from '@/workspace/viewer/use-viewer'
import type { Directory, Message } from '@/types/workspace'
import { AgentFindingView } from './AgentFindingView'

type Carried = Extract<Message, { kind: 'carried' }>

/**
 * A Brief finding quoted in a team thread. The Brief is private to the person who carried it, so
 * only they get a link back to it; everyone else reads whose brief it came from, as plain text, which
 * already says who carried it.
 */
export function CarriedFindingView({ message, directory }: { message: Carried; directory: Directory }) {
  const { viewerId } = useViewer()
  const agent = directory.agents.find((a) => a.id === message.finding.agentId)
  if (!agent) throw new Error(`No agent "${message.finding.agentId}" in the directory`)
  const carrier = personIn(directory, message.carriedBy).name
  const ownBrief = message.carriedBy === viewerId
  const from = ownBrief ? 'the Brief' : `${carrier}'s brief`
  return (
    <article aria-label={`Carried from ${from}: ${message.finding.claim}`} className="flex min-w-0 flex-col gap-3">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-label uppercase text-ink-3">
          {'From '}
          {ownBrief
            ? <><Link to={`/t/${encodeURIComponent(message.fromThreadId)}`} className="underline decoration-rule-2 underline-offset-4 hover:decoration-ink">{from}</Link>{` · carried by ${carrier}`}</>
            : from}
        </span>
        <span className="tabular ml-auto text-label text-ink-3">{fmtTimestamp(message.at)}</span>
      </div>
      <blockquote className="border-l-2 border-rule-2 pl-4">
        <AgentFindingView finding={message.finding} agent={agent} />
      </blockquote>
    </article>
  )
}
