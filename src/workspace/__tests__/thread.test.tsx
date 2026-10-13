import { describe, it, expect, afterEach } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { routes } from '@/app/routes'
import { renderRoutes } from '@/test/render'
import { server } from '@/test/server'
import { accounts } from '@/mocks/data/accounts'
import { computeDriftForAccount } from '@/mocks/handlers/pms'
import { createDraft, getDrafts, runAgent, sendToParty } from '@/services/workspace'
import { eventTime } from '@/lib/clock'
import { fmtDrift, fmtTimestamp, fmtTolerance, UNIT } from '@/kit/measure'
import { assetClassLabel } from '@/workspace/asset-class-label'
import { embedFor } from '@/workspace/thread/embeds/embed-registry'

const ADRIAN = 'user-001'
const viewAsOnLoad = (id: string) => sessionStorage.setItem('ws-viewer', id)

function acc002Drift() {
  const account = accounts.find((a) => a.id === 'acc-002')
  if (!account) throw new Error('acc-002 missing from the book')
  const drift = computeDriftForAccount(account)
  const worst = drift.assetClassDrifts.reduce((a, b) => (Math.abs(b.drift) > Math.abs(a.drift) ? b : a))
  return { drift, worst }
}

async function openThread(path: string, title: string) {
  const view = renderRoutes(routes, path)
  await screen.findByRole('heading', { level: 1, name: title })
  return view
}

const conversation = () => screen.getByRole('list', { name: 'Messages' })
const composerBox = () => screen.getByRole('textbox', { name: /^(Message|Draft)/ })

async function viewAs(option: string) {
  const user = userEvent.setup()
  const select = await screen.findByRole('combobox', { name: 'View as' })
  await screen.findByRole('option', { name: option })
  await user.selectOptions(select, option)
}

/** Records whether `text` was ever on screen, so a test can prove a transient state never rendered. */
function watchFor(text: string) {
  let seen = false
  const observer = new MutationObserver(() => { if (document.body.textContent?.includes(text)) seen = true })
  observer.observe(document.body, { childList: true, subtree: true, characterData: true })
  return { seen: () => seen, stop: () => observer.disconnect() }
}

describe('thread view', () => {
  afterEach(() => sessionStorage.clear())

  it('shows the thread-scale band and the title as the one h1', async () => {
    const { container } = await openThread('/t/th-johnson-review', 'Johnson Rebalance Review')
    const main = screen.getByRole('main')
    expect(within(main).getByRole('note', { name: "Visibility: Firm only · client can't see" })).toHaveAttribute('data-scale', 'thread')
    expect(container.querySelectorAll('h1')).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 1 })).toHaveAttribute('id', 'page-title')
  })

  it('shows text messages in order with author, role and event time', async () => {
    await openThread('/t/th-johnson-review', 'Johnson Rebalance Review')
    const items = within(conversation()).getAllByRole('listitem')
    expect(items).toHaveLength(3)
    expect(items[0]).toHaveTextContent('Sarah Mitchell')
    expect(items[0]).toHaveTextContent('Client service')
    expect(items[0]).toHaveTextContent(fmtTimestamp(eventTime(2)))
    expect(items[0]).toHaveTextContent('2026-02-25 12:02 UTC')
    expect(items[0]).toHaveTextContent('Robert asked when his annual review is this year.')
    expect(items[2]).toHaveTextContent('Adrian Hale')
    expect(items[2]).toHaveTextContent('Mike, can you look at the tax side before we build anything?')
  })

  it('embeds the drift gauges on a shared scale with display names and a full-view link', async () => {
    await openThread('/t/th-johnson-review', 'Johnson Rebalance Review')
    const { drift, worst } = acc002Drift()
    const embed = await within(conversation()).findByRole('region', { name: /^Drift against model/ })
    const gauges = within(embed).getAllByRole('img')
    expect(gauges).toHaveLength(drift.assetClassDrifts.length)
    expect(within(embed).getByRole('img', { name: new RegExp(`^${assetClassLabel(worst.assetClass)}: drift \\${fmtDrift(worst.drift)} percentage points`) })).toBeInTheDocument()
    expect(embed).toHaveTextContent(`${fmtTolerance(drift.driftTolerance)} pp`)
    expect(within(embed).getByRole('link', { name: 'Open full view' })).toHaveAttribute('href', '/accounts/acc-002?from=th-johnson-review')
  })

  it("the embed's full view leads back to the thread it was opened from", async () => {
    const { router } = await openThread('/t/th-johnson-review', 'Johnson Rebalance Review')
    const user = userEvent.setup()
    const embed = await within(conversation()).findByRole('region', { name: /^Drift against model/ })
    await user.click(within(embed).getByRole('link', { name: 'Open full view' }))
    await screen.findByRole('heading', { level: 1, name: 'Robert Johnson Individual' })
    await user.click(screen.getByRole('link', { name: 'Back to the thread' }))
    await screen.findByRole('heading', { level: 1, name: 'Johnson Rebalance Review' })
    expect(router.state.location.pathname).toBe('/t/th-johnson-review')
  })

  it("shows an agent finding: claim, scope, status, formatted figures and what it relies on", async () => {
    await runAgent(ADRIAN, 'th-johnson-review', 'drift-monitor')
    await openThread('/t/th-johnson-review', 'Johnson Rebalance Review')
    const { worst, drift } = acc002Drift()
    const label = assetClassLabel(worst.assetClass)
    const finding = await within(conversation()).findByRole('article', { name: `Drift Monitor: ${label} is outside its tolerance band.` })
    const f = within(finding)
    expect(f.getByText('Drift Monitor')).toBeInTheDocument()
    expect(f.getByText('may measure and flag')).toBeInTheDocument()
    expect(f.getByText('may not stage or release trades · post in a client thread')).toBeInTheDocument()
    expect(finding.querySelector('[data-status="OUT"]')).not.toBeNull()
    const reading = f.getByText(`Largest drift · ${label}`).parentElement as HTMLElement
    expect(within(reading).getByText(fmtDrift(worst.drift))).toBeInTheDocument()
    expect(within(reading).getByText(UNIT.pp)).toBeInTheDocument()
    const tolerance = f.getByText('Tolerance').parentElement as HTMLElement
    expect(within(tolerance).getByText(fmtTolerance(drift.driftTolerance))).toBeInTheDocument()
    expect(f.getByText('Relies on')).toBeInTheDocument()
    expect(f.getByText('Drift calculation · Robert Johnson Individual')).toBeInTheDocument()
     const offModel = within(conversation()).getByRole('article', { name: 'Drift Monitor: Some holdings sit outside the model.' })
    expect(offModel.querySelector('[data-status]')).toBeNull()
  })

  it('posting in the internal thread appends the message', async () => {
    await openThread('/t/th-johnson-review', 'Johnson Rebalance Review')
    const user = userEvent.setup()
    await user.type(composerBox(), 'Looking at the lots now.')
    await user.click(screen.getByRole('button', { name: 'Post' }))
    await waitFor(() => expect(within(conversation()).getAllByRole('listitem')).toHaveLength(4))
    expect(within(conversation()).getAllByRole('listitem')[3]).toHaveTextContent('Looking at the lots now.')
    expect(composerBox()).toHaveValue('')
  })

  it('surfaces the engine refusing a post', async () => {
    server.use(http.post('/api/workspace/threads/:id/messages', () =>
      HttpResponse.json({ code: 'NOT_PERMITTED', message: 'Only members can post here.' }, { status: 403 })))
    await openThread('/t/th-johnson-review', 'Johnson Rebalance Review')
    const user = userEvent.setup()
    await user.type(composerBox(), 'Hello')
    await user.click(screen.getByRole('button', { name: 'Post' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Only members can post here.')
    expect(composerBox()).toHaveValue('Hello')
  })

  it("as Adrian in Robert's thread the composer writes a draft and posts nothing to the conversation", async () => {
    await openThread('/t/th-robert', 'Robert Johnson')
    expect(screen.getByRole('note', { name: 'Visibility: CLIENT CAN SEE' })).toHaveTextContent('Robert Johnson')
    const box = composerBox()
    expect(box).toHaveAttribute('placeholder', 'Write a draft for Robert (not sent until you send it)')
    const user = userEvent.setup()
    await user.type(box, 'Sarah will be in touch this week.')
    await user.click(screen.getByRole('button', { name: 'Save draft' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Draft saved — not sent.')
    expect(composerBox()).toHaveValue('')
    expect(within(conversation()).getAllByRole('listitem')).toHaveLength(1)
    expect(conversation()).not.toHaveTextContent('Sarah will be in touch this week.')
    const drafts = await getDrafts(ADRIAN, 'th-robert')
    expect(drafts.map((d) => d.body)).toEqual(['Sarah will be in touch this week.'])
  })

  it('as Robert the composer posts to his own thread', async () => {
    viewAsOnLoad('cli-001')
    await openThread('/t/th-robert', 'Robert Johnson')
    const box = composerBox()
    expect(box).not.toHaveAttribute('placeholder', expect.stringContaining('draft'))
    const user = userEvent.setup()
    await user.type(box, 'Thank you.')
    await user.click(screen.getByRole('button', { name: 'Send' }))
    await waitFor(() => expect(within(conversation()).getAllByRole('listitem')).toHaveLength(2))
    expect(within(conversation()).getAllByRole('listitem')[1]).toHaveTextContent('Thank you.')
    expect(within(conversation()).getAllByRole('listitem')[1]).toHaveTextContent('Robert Johnson')
  })

  it('a viewer who may not post reads the thread without a composer', async () => {
    viewAsOnLoad('cco-001')
    await openThread('/t/th-robert', 'Robert Johnson')
    expect(screen.getByText('You can read this thread but not post in it.')).toBeInTheDocument()
    expect(screen.queryByRole('textbox')).toBeNull()
  })

  it('a recorded act appears in the conversation as a record slip in firm terms; only the context column anchors it', async () => {
    const draft = await createDraft(ADRIAN, 'th-robert', 'Sarah will be in touch this week.')
    const act = await sendToParty(ADRIAN, draft.id)
    const { container } = await openThread('/t/th-robert', 'Robert Johnson')
    const slip = await within(conversation()).findByRole('article', { name: act.summary })
    const s = within(slip)
    expect(s.getByText('Send to client or prospect · binding')).toBeInTheDocument()
    expect(s.getByText(act.id)).toBeInTheDocument()
    expect(s.getByText('Adrian Hale, Advisor')).toBeInTheDocument()
    expect(s.getByText('Supervisory review')).toBeInTheDocument()
    expect(s.getByText(act.fingerprint)).toBeInTheDocument()
    expect(slip.closest('[id^="act-"]')).toBeNull()
    expect(container.querySelectorAll(`[id="act-${act.id}"]`)).toHaveLength(1)
    expect(screen.getByRole('complementary', { name: 'Thread context' })).toContainElement(container.querySelector(`[id="act-${act.id}"]`))
    expect(conversation()).toHaveTextContent('Sarah will be in touch this week.')
  })

  it('the client sees the same record in their own terms: a message sent to them, kept as a record', async () => {
    const draft = await createDraft(ADRIAN, 'th-robert', 'Sarah will be in touch this week.')
    const act = await sendToParty(ADRIAN, draft.id)
    viewAsOnLoad('cli-001')
    await openThread('/t/th-robert', 'Robert Johnson')
    const slip = await within(conversation()).findByRole('article', { name: 'Sent to you' })
    const s = within(slip)
    expect(s.getByText('Message from Adrian Hale')).toBeInTheDocument()
    expect(s.getByText(act.id)).toBeInTheDocument()
    expect(s.getByText('Adrian Hale, Advisor')).toBeInTheDocument()
    expect(s.getByText('Retained as a record')).toBeInTheDocument()
    expect(s.getByText(act.fingerprint)).toBeInTheDocument()
    expect(conversation().textContent).not.toMatch(/binding|Supervisory review|Send to client/i)
  })

  it('an unknown thread is not found, with a way home', async () => {
    renderRoutes(routes, '/t/th-nope')
    expect(await screen.findByRole('heading', { level: 1, name: 'Thread not found' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Go to the workspace' })).toHaveAttribute('href', '/')
  })

  it('shows a status while the thread loads', () => {
    renderRoutes(routes, '/t/th-johnson-review')
    expect(within(screen.getByRole('main')).getByRole('status')).toHaveTextContent('Loading the thread…')
  })

  it('shows the error message when the thread fails to load', async () => {
    server.use(http.get('/api/workspace/threads/:id', () => HttpResponse.json({ message: 'Engine offline' }, { status: 503 })))
    renderRoutes(routes, '/t/th-johnson-review')
    expect(await within(screen.getByRole('main')).findByRole('alert')).toHaveTextContent('Engine offline')
  })

  it('switching to a viewer who cannot see the thread goes home without flashing "not found"', async () => {
    const { router } = await openThread('/t/th-brief', 'Brief')
    const watch = watchFor('Thread not found')
    await viewAs('Robert Johnson · Client')
    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
    await screen.findByRole('heading', { level: 1, name: 'Workspace' })
    watch.stop()
    expect(watch.seen()).toBe(false)
  })

  it('switching to a viewer who can see the thread stays on it', async () => {
    const { router } = await openThread('/t/th-johnson-review', 'Johnson Rebalance Review')
    await viewAs('Mark Davis · Compliance')
    await screen.findByText('You can read this thread but not post in it.')
    expect(router.state.location.pathname).toBe('/t/th-johnson-review')
  })
})

describe('embed registry', () => {
  it('an unknown embed kind is an explicit error', () => {
    expect(() => embedFor('pie_chart')).toThrow(/pie_chart/)
  })
})
