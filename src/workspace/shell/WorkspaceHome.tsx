import { Link } from 'react-router-dom'
import { PAGE_TITLE_ID } from '@/kit/page/ids'
import { fmtDayMonthYear } from '@/kit/measure'
import { MOCK_TODAY_ISO } from '@/lib/clock'
import { FIRM_NAME } from '@/lib/firm'

const LINK = 'underline decoration-rule-2 underline-offset-4 hover:decoration-ink'

export function WorkspaceHome() {
  return (
    <div className="flex flex-col gap-2">
      <h1 id={PAGE_TITLE_ID} tabIndex={-1} className="text-title">Workspace</h1>
      <p className="text-body text-ink-2">Choose a thread, or start with <Link to="/t/th-brief" className={LINK}>the Brief</Link>.</p>
      <p className="text-body text-ink-3">
        A demonstration: {FIRM_NAME} and everyone in it are fictional, the date is frozen at {fmtDayMonthYear(MOCK_TODAY_ISO)}, and nothing here is investment, tax or legal advice.
      </p>
    </div>
  )
}
