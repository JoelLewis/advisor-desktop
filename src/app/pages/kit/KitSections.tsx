import { Fragment, useState } from 'react'
import { Pane } from '@/kit/layout/Pane'
import { Grid, MainColumn, SidePanel } from '@/kit/layout/Grid'
import { Reading } from '@/kit/reading/Reading'
import { StatusCode } from '@/kit/status/StatusCode'
import { Tag } from '@/kit/tag/Tag'
import { Button } from '@/kit/button/Button'
import { Attestation } from '@/kit/attestation/Attestation'
import { Stepper } from '@/kit/stepper/Stepper'
import { Gauge } from '@/kit/gauge/Gauge'
import { driftStatus, sharedGaugeDomain } from '@/kit/gauge/gauge-math'
import { WindowRuler } from '@/kit/window-ruler/WindowRuler'
import { TaxTape } from '@/kit/tax-tape/TaxTape'
import { FigureRef } from '@/kit/figure-ref/FigureRef'
import { SourceChips } from '@/kit/source-chips/SourceChips'
import { Stamp } from '@/kit/stamp/Stamp'
import { RecordSlip } from '@/kit/record-slip/RecordSlip'
import { VisibilityBand } from '@/kit/visibility/VisibilityBand'
import { RecordTrail } from '@/kit/record-trail/RecordTrail'
import { clientMoney, fmtDrift, fmtMoney, fmtTimestamp, fmtTolerance } from '@/kit/measure'
import { todayISO, now } from '@/lib/clock'
import { RATE_DISCLOSURE } from '@/lib/tax-rules'
import { taxEstimateDirection } from '@/lib/capital-gains'
import type { Status } from '@/kit/status/status'
import { HoldingsTable, TaxLotsTable } from '@/workspace/full-views/account-columns'
import { assetClassLabel } from '@/workspace/asset-class-label'
import { RebalanceEmbed } from '@/workspace/thread/embeds/RebalanceEmbed'
import { AgentFindingView } from '@/workspace/thread/AgentFindingView'
import { taxScope } from '@/workspace/proposal/tax-scope'
import { splitReviewer } from './reviewer'
import type { KitData } from './use-kit-data'

const STATUSES: Status[] = ['OUT', 'AT LIMIT', 'IN', 'BLOCK', 'WARN', 'CLEAR', 'OPEN']
const TAX_SOURCE = 'Rebalance preview · estimated tax'

export function KitSections({ data }: { data: KitData }) {
  const { account, positions, drift, lots, windows, preview, approval, agentFinding } = data
  const [attested, setAttested] = useState(false)
  const worst = [...drift.assetClassDrifts].sort((a, b) => Math.abs(b.drift) - Math.abs(a.drift))[0]
  const gains = preview.trades.reduce((s, t) => s + Math.max(0, t.realisedShortTerm) + Math.max(0, t.realisedLongTerm), 0)
  const losses = preview.trades.reduce((s, t) => s + Math.min(0, t.realisedShortTerm) + Math.min(0, t.realisedLongTerm), 0)
  const netShortTerm = preview.trades.reduce((s, t) => s + t.realisedShortTerm, 0)
  const netLongTerm = preview.trades.reduce((s, t) => s + t.realisedLongTerm, 0)
  const estimate = taxEstimateDirection(preview.estimatedTaxImpact)
  const restriction = windows[0]
  const gaugeDomain = sharedGaugeDomain(drift.assetClassDrifts.map((d) => d.drift), drift.driftTolerance)
  const stamp = now().toISOString()
  const { alert, record } = approval
  const reviewer = splitReviewer(record.reviewer)

  return (
    <Grid>
      <MainColumn>
        <Pane title="Readings" meta={account.name}>
          <div className="flex flex-wrap gap-10">
            {worst ? <Reading label={`Max drift · ${assetClassLabel(worst.assetClass)}`} value={fmtDrift(worst.drift)} unit="pp" size="readout-md"
              limit={`tol ${fmtTolerance(drift.driftTolerance)} pp`} status={driftStatus(worst.drift, drift.driftTolerance)} /> : null}
            <Reading label="Account value" value={fmtMoney(account.totalValue)} unit="USD" size="total" />
          </div>
        </Pane>
        <Pane title="Status codes and tags">
          <div className="flex flex-wrap gap-4">{STATUSES.map((s) => <StatusCode key={s} status={s} />)}</div>
          <div className="flex flex-wrap gap-2"><Tag tone="hatch">NO MARKET</Tag><Tag>OFF-MODEL</Tag><Tag tone="solid">HELD</Tag></div>
          <div className="flex flex-wrap gap-4"><Button>Approve</Button><Button rank="secondary">Withdraw</Button><Button rank="quiet">View lots</Button></div>
        </Pane>
        <Pane title="Drift against model" meta={`band ${fmtTolerance(drift.driftTolerance)} pp`}>
          <div className="flex flex-col gap-2">
            {drift.assetClassDrifts.map((d) => <Gauge key={d.assetClass} label={assetClassLabel(d.assetClass)} drift={d.drift} band={drift.driftTolerance} domain={gaugeDomain} />)}
          </div>
        </Pane>
        <Pane title="Holdings" meta={`${positions.length} positions`}>
          <HoldingsTable positions={positions} accountValue={account.totalValue} />
        </Pane>
        <Pane title="Tax lots" meta={`${lots.length} lots`}>
          <TaxLotsTable lots={lots} positions={positions} />
        </Pane>
        {restriction ? (
          <Pane title="Restriction window">
            <WindowRuler label={`${restriction.symbol} repurchase window`} start={restriction.start} end={restriction.end} today={todayISO()}
              events={[{ date: restriction.saleDate, label: 'Loss sale' }]} />
          </Pane>
        ) : null}
        <Pane title="Visibility indicator test view">
          {(['private', 'internal', 'client'] as const).map((v) => (
            <Fragment key={v}>
              <VisibilityBand visibility={v} scale="thread" audience={v === 'client' ? account.name : undefined} />
              <div className="pl-6"><VisibilityBand visibility={v} scale="message" /></div>
            </Fragment>
          ))}
        </Pane>
        <Pane title="Workspace embeds" meta={account.name}>
          <div className="flex flex-col gap-6">
            <RebalanceEmbed subject={{ type: 'account', id: account.id }} />
            <AgentFindingView finding={agentFinding.finding} agent={agentFinding.agent} />
          </div>
        </Pane>
        <Pane title="Records">
          <section aria-labelledby="kit-preview-approval" className="flex flex-col gap-4">
            <h3 id="kit-preview-approval" className="text-label uppercase text-ink-2">Rebalance preview · not yet approved</h3>
            <Stamp state="awaiting" />
            <Stepper label="Rebalance this account" currentId="approve" steps={[
              { id: 'drift', label: 'Drift and lots', state: 'DONE' },
              { id: 'preview', label: 'Proposal', state: 'PREVIEWED' },
              { id: 'approve', label: 'Approve', state: 'OPEN' },
              { id: 'message', label: 'Client message', state: 'DRAFT' },
            ]} />
            <Attestation id="kit-attest" checked={attested} onChange={setAttested}>I reviewed every leg and its pre-trade reading.</Attestation>
          </section>
          <section aria-labelledby="kit-review-approval" className="flex flex-col gap-4">
            <h3 id="kit-review-approval" className="text-label uppercase text-ink-2">{`${alert.type} review · on record`}</h3>
            <Stamp state="approved" person={reviewer.name} role={reviewer.role} at={record.timestamp} />
            <RecordSlip kind={`Supervisory review · ${record.action}`} title={alert.title} recordId={record.id}
              recordedBy={reviewer} at={record.timestamp} archive="Compliance supervision log">
              {record.notes}
            </RecordSlip>
            <RecordTrail steps={[
              { label: `${alert.type} review opened`, state: 'DONE', at: alert.createdAt },
              { label: record.action, actor: `${reviewer.name}, ${reviewer.role}`, state: 'DONE', at: record.timestamp },
            ]} />
          </section>
        </Pane>
      </MainColumn>
      <SidePanel label="Tax effect">
        <TaxTape gains={gains} losses={losses} netShortTerm={netShortTerm} netLongTerm={netLongTerm}
          grossTax={preview.grossTaxOnGains} netTax={preview.estimatedTaxImpact}
          scope={taxScope(preview)} rateBasis={RATE_DISCLOSURE} />
        <p className="text-body">{`Estimated capital-gains tax ${estimate.direction} this return: about `}<FigureRef source={TAX_SOURCE} path="rebalance.estimatedTaxImpact" note={1}>{clientMoney(estimate.amount)}</FigureRef>.</p>
        <p className="text-label normal-case text-ink-3"><span aria-hidden="true">1. </span>{`Source: ${TAX_SOURCE} for ${account.name}, as of ${fmtTimestamp(stamp)}.`}</p>
        <SourceChips sources={[{ label: 'Rebalance preview', detail: account.name, asOf: stamp }, { label: 'Drift calculation', detail: `${drift.assetClassDrifts.length} asset classes`, asOf: stamp }]} />
      </SidePanel>
    </Grid>
  )
}
