import { Link, useParams, useSearchParams } from 'react-router-dom'
import { Pane } from '@/kit/layout/Pane'
import { Gauge } from '@/kit/gauge/Gauge'
import { sharedGaugeDomain } from '@/kit/gauge/gauge-math'
import { PAGE_TITLE_ID } from '@/kit/page/ids'
import { fmtTimestamp, fmtTolerance } from '@/kit/measure'
import { useAccount, useTaxLots } from '@/hooks/use-accounts'
import { useDrift, usePositions } from '@/hooks/use-portfolio'
import { ApiClientError } from '@/services/api-client'
import { assetClassLabel } from '@/workspace/asset-class-label'
import type { Account } from '@/types/account'
import type { DriftStatus, Position, TaxLot } from '@/types/portfolio'
import { HoldingsTable, TaxLotsTable } from './account-columns'

const isNotFound = (error: Error) => error instanceof ApiClientError && error.status === 404

export function AccountView() {
  const { accountId } = useParams()
  if (!accountId) throw new Error('The account route needs an account id')
  return <AccountPage key={accountId} accountId={accountId} />
}

function AccountPage({ accountId }: { accountId: string }) {
  const [params] = useSearchParams()
  const from = params.get('from')
  const account = useAccount(accountId)
  const drift = useDrift(accountId)
  const positions = usePositions(accountId)
  const lots = useTaxLots(accountId)

  if (account.isError && isNotFound(account.error)) return <AccountNotFound />
  const failure = [account, drift, positions, lots].find((q) => q.isError)
  if (failure?.error) return <p role="alert" className="text-body">{failure.error.message}</p>
  if (!account.data || !drift.data || !positions.data || !lots.data) {
    return <p role="status" className="text-body text-ink-3">Loading the account…</p>
  }
  return <Account account={account.data} drift={drift.data} positions={positions.data} lots={lots.data} from={from} />
}

type AccountProps = { account: Account; drift: DriftStatus; positions: Position[]; lots: TaxLot[]; from: string | null }

function Account({ account, drift, positions, lots, from }: AccountProps) {
  const { assetClassDrifts, driftTolerance, lastCalculated } = drift
  const domain = sharedGaugeDomain(assetClassDrifts.map((d) => d.drift), driftTolerance)
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <header className="flex flex-col gap-2">
        {from ? <Link to={`/t/${encodeURIComponent(from)}`} className="self-start text-body underline decoration-rule-2 underline-offset-4 hover:decoration-ink">Back to the thread</Link> : null}
        <h1 id={PAGE_TITLE_ID} tabIndex={-1} className="text-title">{account.name}</h1>
      </header>
      <Pane title="Drift against model" meta={`band ${fmtTolerance(driftTolerance)} pp · as of ${fmtTimestamp(lastCalculated)}`}>
        <div className="flex min-w-0 flex-col gap-2 overflow-x-auto">
          {assetClassDrifts.map((d) => (
            <Gauge key={d.assetClass} label={assetClassLabel(d.assetClass)} drift={d.drift} band={driftTolerance} domain={domain} />
          ))}
        </div>
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

function AccountNotFound() {
  return (
    <div className="flex flex-col gap-2">
      <h1 id={PAGE_TITLE_ID} tabIndex={-1} className="text-title">Account not found</h1>
      <p className="text-body text-ink-2">No account with this id exists.</p>
      <Link to="/" className="self-start text-body underline underline-offset-4">Go to the workspace</Link>
    </div>
  )
}
