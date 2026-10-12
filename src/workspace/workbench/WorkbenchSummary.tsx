import { Pane } from '@/kit/layout/Pane'
import { Reading } from '@/kit/reading/Reading'
import { TaxTape } from '@/kit/tax-tape/TaxTape'
import { fmtResult } from '@/kit/measure'
import { RATE_DISCLOSURE } from '@/lib/tax-rules'
import { PretradeNotes } from '@/workspace/proposal/PretradeNotes'
import { taxScope } from '@/workspace/proposal/tax-scope'
import type { DraftPreview, ProposalDetail } from '@/types/workspace-proposal'
import { DriftComparison } from './DriftComparison'
import { HeldAwayList } from './HeldAwayList'
import { RestrictionRulers } from './RestrictionRulers'

/** The draft's figures are not known yet: the engine refused it or has not answered. */
function NotPreviewed() {
  return <p className="text-body text-ink-3"><span aria-hidden="true">—</span> <span>Shown once the engine previews the draft.</span></p>
}

type WorkbenchSummaryProps = {
  detail: ProposalDetail
  view: DraftPreview
  /** True while a draft has no preview of its own, so no version's figures stand in for it. */
  notPreviewed?: boolean
}

export function WorkbenchSummary({ detail, view, notPreviewed = false }: WorkbenchSummaryProps) {
  const s = view.summary
  // Collectibles gains are part of the long-term result, so short plus long is the whole year to date.
  const ytd = view.preview.ytdRealisedOnReturn
  return (
    <>
      <Pane title="Tax effect" meta="return-level estimate against this year's results">
        {notPreviewed ? <NotPreviewed /> : <>
        <TaxTape gains={s.gains} losses={s.losses} netShortTerm={s.netShortTerm} netLongTerm={s.netLongTerm}
          grossTax={s.grossTax} netTax={s.netTax} scope={taxScope(view.preview)} rateBasis={RATE_DISCLOSURE}
          yearToDate={ytd ? ytd.shortTerm + ytd.longTerm : undefined} />
        {s.washed !== 0 ? <Reading label="Washed · deferred or disallowed" value={fmtResult(s.washed)} unit={view.preview.currency} /> : null}
        </>}
      </Pane>
      <Pane title="Drift before and after">
        {notPreviewed ? <NotPreviewed /> : <DriftComparison accountId={detail.accountId} projected={view.preview.projectedDrift} />}
      </Pane>
      <Pane title="Wash-sale taxpayer">
        {notPreviewed ? <NotPreviewed /> : <RestrictionRulers restrictions={view.preview.repurchaseRestrictions} />}
        <HeldAwayList accountId={detail.accountId} />
      </Pane>
      <Pane title="Pre-trade check">
        {notPreviewed ? <NotPreviewed /> : <PretradeNotes pretrade={view.pretrade} />}
      </Pane>
    </>
  )
}
