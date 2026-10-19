import { useState } from 'react'
import { NavLink, useNavigate, useParams } from 'react-router-dom'
import { useAnnounce } from '@/kit/announcer/use-announce'
import { Button } from '@/kit/button/Button'
import { RadioGroup } from '@/kit/radio-group/RadioGroup'
import { TextInput } from '@/kit/text-input/TextInput'
import { VisibilityMark } from '@/kit/visibility/VisibilityMark'
import { cn } from '@/lib/utils'
import { useHousehold } from '@/hooks/use-meetings'
import { useStartConversation } from '@/hooks/use-workspace'
import { bandWordsOf } from '@/workspace/people/visibility-words'
import { conversationChoices } from './conversation-choice'

/** The household's conversations, each with who reads it, and a new one started here. */
export function HouseholdConversations() {
  const { householdId } = useParams()
  if (!householdId) throw new Error('The household column needs a household id')
  const household = useHousehold(householdId)
  if (household.isPending) return <p role="status" className="text-body text-ink-3">Loading the conversations…</p>
  if (household.isError) return null
  const view = household.data
  return (
    <div className="flex flex-col gap-6">
      <ul aria-label="Conversations about this household" className="flex flex-col">
        {view.conversations.map((c) => (
          <li key={c.threadId}>
            <NavLink to={`/t/${c.threadId}`} className={({ isActive }) => cn('flex flex-col gap-1 border-l-2 py-2 pl-3 pr-2 hover:bg-face', isActive ? 'border-ink bg-face' : 'border-transparent')}>
              <VisibilityMark visibility={c.visibility} />
              <span className="text-body">{c.title}</span>
              <span className="text-label normal-case text-ink-3">{bandWordsOf(c.audience, false)}</span>
            </NavLink>
          </li>
        ))}
      </ul>
      <StartConversation householdId={view.id} members={view.members} />
    </div>
  )
}

function StartConversation({ householdId, members }: { householdId: string; members: readonly { clientId: string; name: string }[] }) {
  const choices = conversationChoices(members)
  const [value, setValue] = useState<string>('internal')
  const [title, setTitle] = useState('')
  const start = useStartConversation()
  const navigate = useNavigate()
  const announce = useAnnounce()
  const choice = choices.find((c) => c.value === value)
  if (!choice) throw new Error(`No conversation choice ${value}`)
  const forClient = choice.audience.kind === 'client'
  const submit = () => start.mutate({ householdId, title, audience: choice.audience }, {
    onSuccess: ({ thread, created }) => {
      announce(created ? `Started ${thread.title}.` : `Opened ${thread.title}.`)
      navigate(`/t/${thread.id}`)
    },
  })
  return (
    <section aria-label="Start a conversation" className="flex flex-col gap-3 border-t border-rule pt-4">
      <RadioGroup legend="Who reads it" value={value} onChange={setValue} options={choices.map(({ value: v, label }) => ({ value: v, label }))} />
      {forClient ? null : <TextInput label="Title" value={title} rows={1} onChange={setTitle} />}
      <Button pending={start.isPending} disabled={!forClient && title.trim() === ''} onClick={submit}>{forClient ? 'Open the conversation' : 'Start the conversation'}</Button>
      {start.isError ? <p role="alert" className="text-body">{start.error.message}</p> : null}
    </section>
  )
}
