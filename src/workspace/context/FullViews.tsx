import { Link } from 'react-router-dom'
import { useAccount } from '@/hooks/use-accounts'
import { useProspect } from '@/hooks/use-prospect-work'
import { useClientView, useHousehold } from '@/hooks/use-meetings'
import { accountFullViewHref, clientFullViewHref, householdFullViewHref, meetingFullViewHref, prospectFullViewHref } from '@/workspace/full-views/full-view-href'
import type { Subject } from '@/types/workspace'
import { ContextSection } from './ContextSection'

const LINK = 'self-start text-body underline decoration-rule-2 underline-offset-4 hover:decoration-ink'

function FullViewLink({ to, children }: { to: string; children: string }) {
  return <Link to={to} className={LINK}>{`${children} `}<span aria-hidden="true">↗</span></Link>
}

/** The full views the thread's subject opens: its account; or its household, the household's clients and meetings; or its client and their household. */
export function FullViews({ subject, threadId }: { subject: Subject; threadId: string }) {
  switch (subject.type) {
    case 'account': return <AccountViews accountId={subject.id} threadId={threadId} />
    case 'household': return <HouseholdViews householdId={subject.id} threadId={threadId} />
    case 'client': return <ClientViews clientId={subject.id} threadId={threadId} />
    case 'prospect': return <ProspectViews prospectId={subject.id} threadId={threadId} />
    default: return null
  }
}

function AccountViews({ accountId, threadId }: { accountId: string; threadId: string }) {
  const account = useAccount(accountId)
  return (
    <ContextSection title="Full views">
      {account.isPending ? <p role="status" className="text-body text-ink-3">Loading the account…</p>
        : account.isError ? <p role="alert" className="text-body">{account.error.message}</p>
        : <FullViewLink to={accountFullViewHref(accountId, threadId)}>{account.data.name}</FullViewLink>}
    </ContextSection>
  )
}

function HouseholdViews({ householdId, threadId }: { householdId: string; threadId: string }) {
  const household = useHousehold(householdId)
  return (
    <ContextSection title="Full views">
      {household.isPending ? <p role="status" className="text-body text-ink-3">Loading the household…</p>
        : household.isError ? <p role="alert" className="text-body">{household.error.message}</p>
        : (
          <div className="flex flex-col gap-2">
            {[...household.data.meetings.upcoming, ...household.data.meetings.past].filter((m) => m.threadId !== undefined).map((m) => (
              <FullViewLink key={m.eventId} to={meetingFullViewHref(m.eventId, threadId)}>{`Meeting · ${m.title}`}</FullViewLink>
            ))}
            <FullViewLink to={householdFullViewHref(householdId, threadId)}>{household.data.name}</FullViewLink>
            {household.data.members.map((m) => <FullViewLink key={m.clientId} to={clientFullViewHref(m.clientId, threadId)}>{m.name}</FullViewLink>)}
          </div>
        )}
    </ContextSection>
  )
}

function ClientViews({ clientId, threadId }: { clientId: string; threadId: string }) {
  const client = useClientView(clientId)
  return (
    <ContextSection title="Full views">
      {client.isPending ? <p role="status" className="text-body text-ink-3">Loading the client…</p>
        : client.isError ? <p role="alert" className="text-body">{client.error.message}</p>
        : (
          <div className="flex flex-col gap-2">
            <FullViewLink to={clientFullViewHref(clientId, threadId)}>{client.data.name}</FullViewLink>
            <FullViewLink to={householdFullViewHref(client.data.householdId, threadId)}>{client.data.householdName}</FullViewLink>
          </div>
        )}
    </ContextSection>
  )
}

function ProspectViews({ prospectId, threadId }: { prospectId: string; threadId: string }) {
  const prospect = useProspect(prospectId)
  return (
    <ContextSection title="Full views">
      {prospect.isPending ? <p role="status" className="text-body text-ink-3">Loading the prospect…</p>
        : prospect.isError ? <p role="alert" className="text-body">{prospect.error.message}</p>
        : <FullViewLink to={prospectFullViewHref(prospectId, threadId)}>{prospect.data.name}</FullViewLink>}
    </ContextSection>
  )
}
