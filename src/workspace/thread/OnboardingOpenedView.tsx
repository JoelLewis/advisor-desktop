import { Tag } from '@/kit/tag/Tag'
import { fmtDayMonthYear } from '@/kit/measure'
import { personIn } from '@/workspace/people/directory-people'
import { ONBOARDING_STATUS_WORDS } from '@/workspace/prospect/prospect-words'
import type { Directory, Message } from '@/types/workspace'

type Opened = Extract<Message, { kind: 'onboarding_opened' }>

/** The checklist her acceptance opened, as it was opened. The live checklist is in the thread's context. */
export function OnboardingOpenedView({ message, directory }: { message: Opened; directory: Directory }) {
  return (
    <article aria-label="Onboarding opened" className="flex min-w-0 flex-col gap-3 border border-ink p-4">
      <p className="text-label uppercase text-ink-2">{`Onboarding opened · from ${message.acceptanceActId}`}</p>
      <ul aria-label="Onboarding items" className="flex flex-col gap-1.5">
        {message.items.map((item) => (
          <li key={item.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-body">
            <span>{item.label}</span>
            <Tag>{ONBOARDING_STATUS_WORDS[item.status]}</Tag>
            <span className="text-ink-2">{personIn(directory, item.ownerId).name}</span>
            {item.due ? <span className="tabular ml-auto text-ink-3">{`due ${fmtDayMonthYear(item.due)}`}</span> : null}
          </li>
        ))}
      </ul>
    </article>
  )
}
