import { STORY_STEP_IDS, type StoryProgress, type StoryStepId } from '@/types/workspace-story'
import type { BindingAct } from '@/types/workspace'
import { store } from '@/mocks/data/workspace-store'
import { PELL_ID } from '@/mocks/data/prospect-seed'
import { prospectOf } from './prospects'

const JOHNSON_THREAD_ID = 'th-johnson-review'

/**
 * How far the session has come along the README's path. Steps 2, 3, 5, 6 and 7 are done by what the
 * session recorded; steps 1 (the Brief) and 4 (the blotter) are reading steps, done once a later step is;
 * step 8 (View as Robert) changes nothing, so it is never done — only next, at the end.
 */
export function storyProgress(): StoryProgress {
  const s = store()
  // Each rule names its own subject: Dr. Pell's approval records the same kind as the Johnson one.
  const onJohnsonProposal = (a: BindingAct) => a.threadId === JOHNSON_THREAD_ID && a.subject?.type === 'proposal'
  const recorded = (kind: BindingAct['kind'], scope: (a: BindingAct) => boolean = () => true) => s.acts.some((a) => a.kind === kind && scope(a))
  const pell = prospectOf(PELL_ID)
  if (!pell) throw new Error(`The story's prospect ${PELL_ID} is not in the session`)
  const ruled = new Map<StoryStepId, boolean>([
    ['rebalance', recorded('approve_proposal', onJohnsonProposal)],
    ['release', recorded('release_orders', onJohnsonProposal)],
    ['meeting', s.meetings.some((m) => m.state === 'filed') && s.acts.some((a) => a.kind === 'send_to_party' && a.recordBasis !== undefined)],
    ['pell', pell.sent !== undefined && pell.accepted !== undefined],
    ['reference', recorded('resolve_break')],
  ])
  const steps = STORY_STEP_IDS.map((id, i) => {
    const rule = ruled.get(id)
    if (rule !== undefined) return { id, done: rule }
    const laterDone = id !== 'view_as' && STORY_STEP_IDS.slice(i + 1).some((later) => ruled.get(later) === true)
    return { id, done: laterDone }
  })
  return { steps, next: steps.find((step) => !step.done)?.id ?? null }
}
