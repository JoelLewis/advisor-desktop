import { it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { useDocumentTitle } from '@/app/use-document-title'
import { PAGE_TITLE_ID } from '@/kit/page/ids'

function Probe() {
  useDocumentTitle()
  return null
}

it('titles the tab with the app alone while there is no h1, and again once the h1 goes', async () => {
  document.title = 'Billing · Advisor Desktop'
  render(<Probe />)
  expect(document.title).toBe('Advisor Desktop')

  const h1 = document.createElement('h1')
  h1.id = PAGE_TITLE_ID
  h1.textContent = 'Supervision'
  document.body.append(h1)
  await expect.poll(() => document.title).toBe('Supervision · Advisor Desktop')

  h1.remove()
  await expect.poll(() => document.title).toBe('Advisor Desktop')
})
