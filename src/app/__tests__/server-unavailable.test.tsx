import { it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ServerUnavailable } from '@/app/ServerUnavailable'
import { StartFailure } from '@/app/start-failure'

it('says the service worker was blocked when the server failed to start', () => {
  render(<ServerUnavailable stage="server" reason="blocked" />)
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('The demo could not start')
  expect(screen.getByRole('main')).toHaveTextContent('runs its server in your browser as a service worker')
})

it("says the code did not load when the app's chunk failed, and what the browser said", () => {
  const failure = new StartFailure('app', new TypeError('Failed to fetch dynamically imported module'))
  render(<ServerUnavailable stage={failure.stage} reason={failure.message} />)
  expect(screen.getByRole('main')).toHaveTextContent("The demo's code did not finish loading")
  expect(screen.getByRole('main')).not.toHaveTextContent('service worker')
  expect(screen.getByRole('main')).toHaveTextContent('The browser said: Failed to fetch dynamically imported module')
})
