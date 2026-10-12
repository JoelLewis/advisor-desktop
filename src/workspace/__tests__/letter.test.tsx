import { describe, it, expect } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { routes } from '@/app/routes'
import { renderRoutes } from '@/test/render'
import { approveProposal, createProposal, draftLetter, reviseDraft, reviseProposal, withdrawApproval } from '@/services/workspace'
import { store } from '@/mocks/data/workspace-store'
import { RATE_DISCLOSURE } from '@/lib/tax-rules'

const ADRIAN = 'user-001'
const inContext = () => within(screen.getByRole('complementary', { name: 'Thread context' }))
const conversation = () => screen.getByRole('list', { name: 'Messages' })

async function approvedV1() {
  const created = await createProposal(ADRIAN, 'th-johnson-review', 'acc-002')
  await approveProposal(ADRIAN, created.id, 1, created.versions[0]!.fingerprint)
  return created
}

async function approveV2(proposalId: string) {
  const v2 = await reviseProposal(ADRIAN, proposalId, [{ kind: 'harvest_only' }])
  await approveProposal(ADRIAN, proposalId, 2, v2.versions[1]!.fingerprint)
}

async function openRobert() {
  renderRoutes(routes, '/t/th-robert')
  await screen.findByRole('heading', { level: 1, name: 'Robert Johnson' })
  return inContext().findByRole('region', { name: 'Drafts for Robert' })
}

async function viewAs(option: string) {
  const user = userEvent.setup()
  await screen.findByRole('option', { name: option })
  await user.selectOptions(screen.getByRole('combobox', { name: 'View as' }), option)
}

describe('the client letter', () => {
  it('drafts once from the approved version; Adrian edits and sends; Robert sees only the message', async () => {
    await approvedV1()
    const drafts = await openRobert()
    const user = userEvent.setup()
    await user.click(await within(drafts).findByRole('button', { name: 'Ask Client Letter Agent' }))
    const draft = await within(drafts).findByRole('article', { name: 'Draft · not sent' })
    expect(draft).toHaveTextContent('Dear Robert,')
    expect(draft).toHaveTextContent('is expected to realize a loss of about $45,900')
    expect(draft).toHaveTextContent('State tax is not modeled.')
    expect(draft).toHaveTextContent("Drafted by Client Letter Agent at Adrian Hale's request · from v1")
    expect(store().drafts).toHaveLength(1)
    expect(within(drafts).getByRole('status')).toHaveTextContent('The Client Letter Agent drafted a letter from v1 of the Johnson rebalance.')
    await user.dblClick(within(drafts).getByRole('button', { name: 'Ask Client Letter Agent' }))
    await waitFor(() => expect(within(drafts).getByRole('status')).toHaveTextContent("The Client Letter Agent's letter from v1 of the Johnson rebalance is already in the drafts."))
    expect(store().drafts).toHaveLength(1)

    await user.click(within(draft).getByRole('button', { name: 'Edit' }))
    const editor = within(draft).getByRole('textbox', { name: 'Edit the letter' })
    await user.type(editor, '{End}{Enter}{Enter}I will call you on Friday to walk through it.')
    await user.click(within(draft).getByRole('button', { name: 'Save edit' }))
    const edited = await within(drafts).findByRole('article', { name: 'Draft · not sent' })
    await waitFor(() => expect(edited).toHaveTextContent("Client Letter Agent's draft, edited by Adrian Hale"))
    await user.click(within(edited).getByRole('button', { name: 'Send to Robert' }))
    await waitFor(() => expect(conversation()).toHaveTextContent('I will call you on Friday to walk through it.'))
    expect(conversation()).toHaveTextContent(RATE_DISCLOSURE)
    const acts = inContext().getByRole('region', { name: 'Binding acts' })
    expect(within(acts).getByRole('list', { name: 'Record trail' })).toHaveTextContent('Send to client')
    const fingerprint = store().acts.find((a) => a.kind === 'approve_proposal')!.fingerprint
    expect(within(acts).getByRole('article', { name: 'Message sent to the client' })).toHaveTextContent(`from v1 · fingerprint ${fingerprint} · edited by Adrian Hale`)
    expect(within(drafts).queryByRole('status')).toBeNull()

    await viewAs('Robert Johnson · Client')
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Message' })).toBeInTheDocument())
    expect(conversation()).toHaveTextContent('Dear Robert,')
    expect(document.body).not.toHaveTextContent('Client Letter Agent')
    expect(document.body).not.toHaveTextContent('Draft · not sent')
    expect(document.body).not.toHaveTextContent('Johnson Rebalance Review')
    expect(document.body).not.toHaveTextContent(fingerprint)
    expect(document.body).not.toHaveTextContent(/edited by|unedited|from v1/)
  })

  it("records an unedited agent letter as the agent's draft", async () => {
    const created = await approvedV1()
    await draftLetter(ADRIAN, 'th-robert', created.id)
    const drafts = await openRobert()
    const draft = await within(drafts).findByRole('article', { name: 'Draft · not sent' })
    await userEvent.setup().click(within(draft).getByRole('button', { name: 'Send to Robert' }))
    const slip = await within(inContext().getByRole('region', { name: 'Binding acts' })).findByRole('article', { name: 'Message sent to the client' })
    expect(slip).toHaveTextContent(`from v1 · fingerprint ${created.versions[0]!.fingerprint} · agent draft, unedited`)
  })

  it('a letter from a version that is no longer approved is marked stale and cannot be sent', async () => {
    const created = await approvedV1()
    await draftLetter(ADRIAN, 'th-robert', created.id)
    await approveV2(created.id)
    const drafts = await openRobert()
    const draft = await within(drafts).findByRole('article', { name: 'Draft · not sent' })
    expect(within(draft).getByText('STALE')).toBeInTheDocument()
    await waitFor(() => expect(draft).toHaveTextContent('The approval moved to v2; this letter is from v1. Ask the Client Letter Agent for a new letter.'))
    const send = within(draft).getByRole('button', { name: 'Send to Robert' })
    expect(send).toBeDisabled()
    expect(send).toHaveAccessibleDescription(/The approval moved to v2/)
    expect(within(draft).queryByRole('button', { name: 'Edit' })).toBeNull()
  })

  it('an edited letter keeps its basis, so a withdrawn approval makes it stale too', async () => {
    const created = await approvedV1()
    const first = await draftLetter(ADRIAN, 'th-robert', created.id)
    await reviseDraft(ADRIAN, 'th-robert', first.id, `${first.body}\n\nAdrian`)
    await withdrawApproval(ADRIAN, created.id)
    const drafts = await openRobert()
    const draft = await within(drafts).findByRole('article', { name: 'Draft · not sent' })
    await waitFor(() => expect(draft).toHaveTextContent('The approval of v1 was withdrawn. Ask the Client Letter Agent for a new letter.'))
    expect(draft).toHaveTextContent("Client Letter Agent's draft, edited by Adrian Hale · from v1")
    expect(within(draft).getByRole('button', { name: 'Send to Robert' })).toBeDisabled()
  })

  it('a send refused as stale is reported, and the draft is then marked stale', async () => {
    const created = await approvedV1()
    await draftLetter(ADRIAN, 'th-robert', created.id)
    const drafts = await openRobert()
    const draft = await within(drafts).findByRole('article', { name: 'Draft · not sent' })
    await approveV2(created.id)
    await userEvent.setup().click(within(draft).getByRole('button', { name: 'Send to Robert' }))
    expect(await within(drafts).findByRole('alert')).toHaveTextContent('no longer the approved version')
    await waitFor(() => expect(within(draft).getByRole('button', { name: 'Send to Robert' })).toBeDisabled())
    expect(within(draft).getByText('STALE')).toBeInTheDocument()
  })

  it('offers no letter until a proposal for this client is approved', async () => {
    await createProposal(ADRIAN, 'th-johnson-review', 'acc-002')
    const drafts = await openRobert()
    const ask = await within(drafts).findByRole('button', { name: 'Ask Client Letter Agent' })
    expect(ask).toBeDisabled()
    expect(ask).toHaveAccessibleDescription('Approve a proposal first.')
  })
})
