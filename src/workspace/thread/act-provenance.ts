import type { BindingAct, Directory } from '@/types/workspace'
import { personIn } from '@/workspace/people/directory-people'
import { PATH_WORDS } from '@/workspace/prospect/prospect-words'
import { suitabilityLine } from '@/lib/suitability'

/** The firm's record of how an act was made: its rationale, its best-interest record, its suitability reason, and the presenter's path when one was used. */
export function actProvenance(act: BindingAct, directory: Directory): string[] {
  const presenter = act.viaPresenter && personIn(directory, act.viaPresenter.presenterId).name
  return [
    ...(act.rationale ? [`Rationale · ${act.rationale}`] : []),
    ...(act.bestInterest ? [`Best-interest record filed · ${act.bestInterest.rationale}`] : []),
    ...(act.suitability ? [suitabilityLine(act.suitability)] : []),
    ...(act.viaPresenter && presenter ? [PATH_WORDS[act.viaPresenter.path ?? 'shortcut'](presenter)] : []),
  ]
}
