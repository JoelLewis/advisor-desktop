import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Pane } from '@/kit/layout/Pane'
import { PAGE_TITLE_ID } from '@/kit/page/ids'
import { useAccount, useTaxLots } from '@/hooks/use-accounts'
import { useDrift, usePositions } from '@/hooks/use-portfolio'
import { useReferenceModels } from '@/hooks/use-reference'
import { accountAttributionHref, accountRiskHref, modelHref } from '@/workspace/full-views/reference-href'
import { useDirectory } from '@/hooks/use-workspace'
import { isExternalViewerIn } from '@/workspace/people/directory-people'
import { useViewer } from '@/workspace/viewer/use-viewer'
import { DriftGauges } from '@/workspace/drift/DriftGauges'
import { driftMeta } from '@/workspace/drift/drift-meta'
import { FullViewNotFound } from '@/workspace/full-views/FullViewNotFound'
import type { HiddenRedirect } from '@/workspace/full-views/hidden-redirect'
import { isNotFound } from '@/workspace/is-not-found'
import type { Account } from '@/types/account'
import type { DriftStatus, Position, TaxLot } from '@/types/portfolio'
import { HoldingsTable, TaxLotsTable } from './account-columns'
import { LINK_TARGET } from '@/kit/link-target'

const LINK = `${LINK_TARGET} self-start text-body underline decoration-rule-2 underline-offset-4 hover:decoration-ink`

export function AccountView() {
  const { accountId } = useParams()
  if (!accountId) throw new Error('The account route needs an account id')
  return <AccountGate key={accountId} accountId={accountId} />
}

/** The full view is firm-only: a client viewer is told the account is not found, and a switch to a client goes home. */
function AccountGate({ accountId }: { accountId: string }) {
  const { viewerId } = useViewer()
  const [openedAs] = useState(viewerId)
  const navigate = useNavigate()
  const directory = useDirectory()
  const viewerIsExternal = directory.data !== undefined && isExternalViewerIn(directory.data, viewerId)
  const switchedToClient = viewerIsExternal && viewerId !== openedAs
  useEffect(() => {
    if (switchedToClient) navigate('/', { replace: true, state: { hiddenSubject: 'this account', hiddenFrom: viewerId } satisfies HiddenRedirect })
  }, [switchedToClient, navigate, viewerId])

  if (switchedToClient || directory.isPending) return <p role="status" className="text-body text-ink-3">Loading the account…</p>
  if (directory.isError) return <p role="alert" className="text-body">{directory.error.message}</p>
  if (viewerIsExternal) return <FullViewNotFound subject="Account" />
  return <AccountPage accountId={accountId} />
}

function AccountPage({ accountId }: { accountId: string }) {
  const [params] = useSearchParams()
  const from = params.get('from')
  const account = useAccount(accountId)
  const drift = useDrift(accountId)
  const positions = usePositions(accountId)
  const lots = useTaxLots(accountId)

  // The account decides whether there is a page at all, before any of its readings can fail.
  if (account.isError) return isNotFound(account.error) ? <FullViewNotFound subject="Account" /> : <p role="alert" className="text-body">{account.error.message}</p>
  if (account.isPending) return <p role="status" className="text-body text-ink-3">Loading the account…</p>
  const failure = [drift, positions, lots].find((q) => q.isError)
  if (failure?.error) return <p role="alert" className="text-body">{failure.error.message}</p>
  if (!drift.data || !positions.data || !lots.data) {
    return <p role="status" className="text-body text-ink-3">Loading the account…</p>
  }
  return <AccountReadings account={account.data} drift={drift.data} positions={positions.data} lots={lots.data} from={from} />
}

type AccountReadingsProps = { account: Account; drift: DriftStatus; positions: Position[]; lots: TaxLot[]; from: string | null }

function AccountReadings({ account, drift, positions, lots, from }: AccountReadingsProps) {
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <header className="flex flex-col gap-2">
        {from ? <Link to={`/t/${encodeURIComponent(from)}`} className={`${LINK_TARGET} self-start text-body underline decoration-rule-2 underline-offset-4 hover:decoration-ink`}>Back to the thread</Link> : null}
        <h1 id={PAGE_TITLE_ID} tabIndex={-1} className="text-title">{account.name}</h1>
        <ReferenceLinks account={account} from={from} />
      </header>
      <Pane title="Drift against model" meta={driftMeta(drift)}>
        <DriftGauges drift={drift} />
      </Pane>
      <Pane title="Holdings" meta={`${positions.length} positions`}>
        <HoldingsTable positions={positions} accountValue={account.totalValue} />
      </Pane>
      <Pane title="Tax lots" meta={`${lots.length} lots`}>
        <TaxLotsTable lots={lots} positions={positions} />
      </Pane>
    </div>
  )
}

/** The account's reference views: its risk, its attribution and its model, each remembering the thread. */
function ReferenceLinks({ account, from }: { account: Account; from: string | null }) {
  const models = useReferenceModels()
  const modelId = account.mandate === 'model' ? account.modelId : undefined
  const model = models.data?.models.find((m) => m.id === modelId)
  const back = from ?? undefined
  return (
    <nav aria-label="Reports" className="flex flex-wrap gap-x-6 gap-y-1 *:inline-flex *:min-h-6 *:items-center coarse:*:min-h-11">
      <Link to={accountRiskHref(account.id, back)} className={LINK}>Risk</Link>
      <Link to={accountAttributionHref(account.id, back)} className={LINK}>Attribution</Link>
      {modelId
        ? <Link to={modelHref(modelId, back)} className={LINK}>{model ? `Model · ${model.name}` : 'Model'}</Link>
        : <span className="text-ink-3">Custom mandate · not model-managed</span>}
    </nav>
  )
}
