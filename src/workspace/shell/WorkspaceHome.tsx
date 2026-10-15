import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAnnounce } from '@/kit/announcer/use-announce'
import { PAGE_TITLE_ID } from '@/kit/page/ids'
import { Tag } from '@/kit/tag/Tag'
import { fmtDayMonthYear, fmtQuantity } from '@/kit/measure'
import { MOCK_TODAY_ISO } from '@/lib/clock'
import { FIRM_NAME } from '@/lib/firm'
import { useDirectory, useStoryProgress, useViewAsDirectory } from '@/hooks/use-workspace'
import { hiddenRedirectOf } from '@/workspace/full-views/hidden-redirect'
import { isExternalViewerIn } from '@/workspace/people/directory-people'
import { useViewer } from '@/workspace/viewer/use-viewer'
import type { StoryProgress } from '@/types/workspace-story'
import { HOME_STEPS } from './home-steps'
import { LINK_TARGET } from '@/kit/link-target'

const LINK = `${LINK_TARGET} text-body underline decoration-rule-2 underline-offset-4 hover:decoration-ink`

export function WorkspaceHome() {
  const { viewerId } = useViewer()
  const directory = useDirectory()
  const firm = directory.data !== undefined && !isExternalViewerIn(directory.data, viewerId)
  const progress = useStoryProgress(firm)
  return (
    <div className="flex max-w-[46rem] min-w-0 flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 id={PAGE_TITLE_ID} tabIndex={-1} className="text-title">Workspace</h1>
        <p className="text-copy">{`One advisor's day at ${FIRM_NAME}: agents measure the book, the advisor decides, compliance releases, and each client sees only what is theirs.`}</p>
        <p className="text-body text-ink-3">
          {`A demonstration: ${FIRM_NAME} and everyone in it are fictional, the date is frozen at ${fmtDayMonthYear(MOCK_TODAY_ISO)}, and nothing here is investment, tax or legal advice.`}
        </p>
        <RedirectNote />
      </div>
      {firm ? <FiveMinutePath progress={progress.data} /> : null}
    </div>
  )
}

function FiveMinutePath({ progress }: { progress: StoryProgress | undefined }) {
  const doneOf = new Map(progress?.steps.map((s) => [s.id, s.done]))
  return (
    <section aria-labelledby="five-minute-path" className="flex flex-col gap-3">
      <h2 id="five-minute-path" className="border-b border-ink pb-2 text-label uppercase text-ink-2">Five minutes, in order</h2>
      <ol aria-label="The five-minute path" className="flex flex-col">
        {HOME_STEPS.map((step, i) => (
          <li key={step.id} aria-current={progress?.next === step.id ? 'step' : undefined} className="grid grid-cols-[1.75rem_1fr_auto] items-baseline gap-x-3 border-b border-rule py-3 last:border-b-0">
            <span className="tabular text-body text-ink-3">{fmtQuantity(i + 1)}</span>
            <div className="flex min-w-0 flex-col gap-1">
              <span className="text-copy font-semibold">{step.title}</span>
              <span className="text-body text-ink-2">{step.detail}</span>
              <Link to={step.to} className={`self-start ${LINK}`}>{step.linkLabel}</Link>
            </div>
            <span>{progress?.next === step.id ? <Tag tone="solid">NEXT</Tag> : doneOf.get(step.id) ? <Tag>DONE</Tag> : null}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}

/**
 * After View-as sent the viewer home from a page they cannot see: says why, on the page and to the announcer.
 * The redirect is read once from the router state (which names who it was for), announced, then cleared from history,
 * so a reload or Back never repeats it; it stays on screen only while that same viewer is still the one viewing.
 */
function RedirectNote() {
  const location = useLocation()
  const navigate = useNavigate()
  const [redirect] = useState(() => hiddenRedirectOf(location.state))
  const { viewerId } = useViewer()
  const people = useViewAsDirectory(redirect !== undefined)
  const announce = useAnnounce()
  const name = people.data?.people.find((p) => p.id === redirect?.hiddenFrom)?.name
  const sentence = redirect && name ? `${name} can't see ${redirect.hiddenSubject}; showing the workspace.` : undefined
  const current = redirect !== undefined && redirect.hiddenFrom === viewerId
  const said = useRef(false)
  useEffect(() => {
    if (!sentence || !current || said.current) return
    said.current = true
    announce(sentence)
    navigate(location.pathname, { replace: true, state: null })
  }, [sentence, current, announce, navigate, location.pathname])
  return sentence && current ? <p className="text-body text-ink-2">{sentence}</p> : null
}
