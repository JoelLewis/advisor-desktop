import { describe, it, expect } from 'vitest'
import { screen, within } from '@testing-library/react'
import { routes } from '@/app/routes'
import { renderRoutes } from '@/test/render'
import { createDraft, sendToParty } from '@/services/workspace'

const sendOne = async () => {
  const draft = await createDraft('user-001', 'th-robert', 'Your review is booked for Friday.')
  return sendToParty('user-001', draft.id)
}

describe('the record slip', () => {
  it("the firm's slip is a record, with its id, UTC and fingerprint under Audit details", async () => {
    const act = await sendOne()
    renderRoutes(routes, '/t/th-robert')
    const trail = await screen.findByRole('region', { name: 'Audit trail' })
    const slip = within(trail).getAllByRole('article')[0]!
    expect(slip).toHaveTextContent('Message sent · record')
    const audit = within(slip).getByText('Audit details').closest('details')!
    expect(audit).not.toHaveAttribute('open')
    expect(audit).toHaveTextContent(act.id)
    expect(audit).toHaveTextContent('UTC')
    expect(audit).toHaveTextContent(act.fingerprint)
  })
  it("an outsider's slip has no Audit details", async () => {
    const act = await sendOne()
    sessionStorage.setItem('ws-viewer', 'cli-001')
    renderRoutes(routes, '/t/th-robert')
    const records = await screen.findByRole('region', { name: 'Records' })
    expect(records).not.toHaveTextContent('Audit details')
    expect(records).not.toHaveTextContent(act.id)
    expect(records).not.toHaveTextContent(act.fingerprint)
    expect(records).not.toHaveTextContent('UTC')
  })
})
