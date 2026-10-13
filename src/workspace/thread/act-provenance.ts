import type { BindingAct, Directory } from '@/types/workspace'
import { personIn } from '@/workspace/people/directory-people'

/** The firm's record of how a compliance act was made: its rationale, and the presenter shortcut when it was used. */
export function actProvenance(act: BindingAct, directory: Directory): string[] {
  return [
    ...(act.rationale ? [`Rationale · ${act.rationale}`] : []),
    ...(act.viaPresenter ? [`Demo · recorded through the presenter shortcut by ${personIn(directory, act.viaPresenter.presenterId).name}`] : []),
  ]
}
