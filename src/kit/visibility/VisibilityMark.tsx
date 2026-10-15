import { VISIBILITY_RULE, type Visibility } from './visibility'

/** The visibility mark alone, for a list whose legend says the words once. Decorative: the row's description names it. */
export function VisibilityMark({ visibility }: { visibility: Visibility }) {
  return <div aria-hidden="true" data-visibility={visibility} className={VISIBILITY_RULE[visibility]} />
}
