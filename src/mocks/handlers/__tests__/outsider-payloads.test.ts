import { describe, it, expect } from 'vitest'

async function call(method: string, path: string, viewer: string, body?: unknown) {
  const res = await fetch(`/api/workspace${path}`, {
    method, headers: { 'Content-Type': 'application/json', 'X-Viewer': viewer }, body: body === undefined ? undefined : JSON.stringify(body),
  })
  return { status: res.status, text: await res.text() }
}

const FIRM_RECORD = /REC-\d{4}|fingerprint/i
const UTC_STAMP = /\d{4}-\d{2}-\d{2}T[\d:.]+Z/

const expectNoFirmRecord = (label: string, text: string) => {
  expect(text, `${label}: record id or fingerprint`).not.toMatch(FIRM_RECORD)
  expect(text, `${label}: UTC stamp`).not.toMatch(UTC_STAMP)
}

describe("what an outsider is served carries no record id, fingerprint or UTC stamp", () => {
  it("Robert's thread, acts and a message he posts", async () => {
    const draft = JSON.parse((await call('POST', '/threads/th-robert/drafts', 'user-001', { body: 'Your review is booked for Friday.' })).text)
    const sent = await call('POST', '/acts', 'user-001', { kind: 'send_to_party', draftId: draft.id })
    expect(sent.status).toBe(201)
    const thread = await call('GET', '/threads/th-robert', 'cli-001')
    const acts = await call('GET', '/acts?threadId=th-robert', 'cli-001')
    const posted = await call('POST', '/threads/th-robert/messages', 'cli-001', { body: 'Thank you.' })
    expect([thread.status, acts.status, posted.status]).toEqual([200, 200, 201])
    expectNoFirmRecord('thread', thread.text)
    expectNoFirmRecord('acts', acts.text)
    expectNoFirmRecord('posted message', posted.text)
    expect(JSON.parse(acts.text)).toHaveLength(1)
    const actMessage = JSON.parse(thread.text).messages.find((m: { kind: string }) => m.kind === 'act')
    expect(actMessage.actId).toBe(JSON.parse(acts.text)[0].id)
  })

  it("Dr. Pell's thread, acts and her acceptance", async () => {
    expect((await call('POST', '/acts', 'user-001', { kind: 'deliver_disclosure', prospectId: 'prsp-011', document: 'form_crs' })).status).toBe(201)
    const thread = await call('GET', '/threads/th-pell', 'prsp-011')
    const acts = await call('GET', '/acts?threadId=th-pell', 'prsp-011')
    expect([thread.status, acts.status]).toEqual([200, 200])
    expectNoFirmRecord('thread', thread.text)
    expectNoFirmRecord('acts', acts.text)
    expect(JSON.parse(acts.text)).toHaveLength(1)
  })

  it('the archive and the supervision queue are not reachable by either', async () => {
    for (const viewer of ['cli-001', 'prsp-011']) {
      for (const path of ['/archive', '/supervision']) expect((await call('GET', path, viewer)).status, `${viewer} ${path}`).toBe(404)
    }
  })
})
