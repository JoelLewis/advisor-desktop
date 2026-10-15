import { Link, useParams, useSearchParams } from 'react-router-dom'
import { Pane } from '@/kit/layout/Pane'
import { VisibilityBand } from '@/kit/visibility/VisibilityBand'
import { PAGE_TITLE_ID } from '@/kit/page/ids'
import { UNIT, fmtDayMonthYear, fmtMoney, fmtScore } from '@/kit/measure'
import { useClientView } from '@/hooks/use-meetings'
import { isNotFound } from '@/workspace/is-not-found'
import { AccountsTable } from '@/workspace/household/AccountsTable'
import { CommunicationsList } from '@/workspace/household/CommunicationsList'
import { ipsLine } from '@/workspace/household/household-words'
import type { ClientView as ClientReadModel } from '@/types/workspace-household'
import { FullViewNotFound } from './FullViewNotFound'
import { householdFullViewHref } from './full-view-href'
import { useGoHomeWhenHidden } from './use-go-home-when-hidden'
import { LINK_TARGET } from '@/kit/link-target'

const LINK = `${LINK_TARGET} self-start text-body underline decoration-rule-2 underline-offset-4 hover:decoration-ink`

export function ClientView() {
  const { clientId } = useParams()
  if (!clientId) throw new Error('The client route needs a client id')
  return <ClientGate key={clientId} clientId={clientId} />
}

/** Firm-only: a client is told the client is not found — even themself — and a switch to a client goes home. */
function ClientGate({ clientId }: { clientId: string }) {
  const client = useClientView(clientId)
  const hiddenFromNewViewer = useGoHomeWhenHidden(client, 'this client')
  if (hiddenFromNewViewer || client.isPending) return <p role="status" className="text-body text-ink-3">Loading the client…</p>
  if (client.isError) return isNotFound(client.error) ? <FullViewNotFound subject="Client" /> : <p role="alert" className="text-body">{client.error.message}</p>
  return <ClientPage view={client.data} />
}

function ClientPage({ view }: { view: ClientReadModel }) {
  const [params] = useSearchParams()
  const from = params.get('from') ?? undefined
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <header className="flex flex-col gap-2">
        {from ? <Link to={`/t/${encodeURIComponent(from)}`} className={LINK}>Back to the thread</Link> : null}
        <VisibilityBand visibility="internal" scale="thread" />
        <h1 id={PAGE_TITLE_ID} tabIndex={-1} className="text-title">{view.name}</h1>
        <Link to={householdFullViewHref(view.householdId, from)} className={LINK}>{view.householdName}</Link>
      </header>
      <Pane title="Profile">
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-body">
          <dt className="text-ink-3">Date of birth</dt><dd className="tabular">{fmtDayMonthYear(view.dateOfBirth)}</dd>
          <dt className="text-ink-3">Occupation</dt><dd>{view.occupation}</dd>
          {view.preferredContact ? <><dt className="text-ink-3">Preferred contact</dt><dd>{view.preferredContact}</dd></> : null}
        </dl>
      </Pane>
      <Pane title="Risk assessment">
        <p className="tabular text-body">{`${view.risk.tolerance} · score ${fmtScore(view.risk.scoreFraction)} of 100 · assessed ${fmtDayMonthYear(view.risk.assessedOn)}`}</p>
      </Pane>
      <Pane title="Accounts owned" meta={`${fmtMoney(view.accountsValue)} ${UNIT.usd}`}>
        <AccountsTable caption="Accounts owned" accounts={view.accounts} totalValue={view.accountsValue} totalLabel="Owned" />
      </Pane>
      <Pane title="Investment policy statement"><p className="text-body">{ipsLine(view.ips)}</p></Pane>
      <Pane title="Communications"><CommunicationsList communications={view.communications} /></Pane>
    </div>
  )
}
