import { describe, it, expect, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/render'
import { useUIStore } from '@/store/ui-store'
import { AIChatPanel } from '../AIChatPanel'

beforeEach(() => {
  // Open the panel and set to AI tab before each test
  useUIStore.setState({
    aiPanelOpen: true,
    panelTab: 'ai',
    aiInitialMessage: null,
    pendingShareCard: null,
  })
})

describe('AIChatPanel', () => {
  it('renders the panel when store state is open', () => {
    renderWithProviders(<AIChatPanel />, { initialEntries: ['/dashboard'] })
    // The panel renders as an aside element
    expect(screen.getByRole('complementary')).toBeInTheDocument()
  })

  it('shows suggested prompts for dashboard context', async () => {
    renderWithProviders(<AIChatPanel />, { initialEntries: ['/dashboard'] })
    // Dashboard suggested prompt from mock data
    expect(
      await screen.findByText('Summarize my book today'),
    ).toBeInTheDocument()
  })

  it('has a message input with correct placeholder', () => {
    renderWithProviders(<AIChatPanel />, { initialEntries: ['/dashboard'] })
    expect(
      screen.getByPlaceholderText('Ask AI anything...'),
    ).toBeInTheDocument()
  })

  it('renders AI and Messages tab buttons', () => {
    renderWithProviders(<AIChatPanel />, { initialEntries: ['/dashboard'] })
    // Tab labels defined in TAB_CONFIG
    expect(screen.getByText('AI')).toBeInTheDocument()
    expect(screen.getByText('Messages')).toBeInTheDocument()
  })

  it('allows typing in the message input', async () => {
    const user = userEvent.setup()
    renderWithProviders(<AIChatPanel />, { initialEntries: ['/dashboard'] })

    const input = screen.getByPlaceholderText('Ask AI anything...')
    await user.type(input, 'Hello AI')
    expect(input).toHaveValue('Hello AI')
  })

  it('has a close panel button', () => {
    renderWithProviders(<AIChatPanel />, { initialEntries: ['/dashboard'] })
    expect(screen.getByLabelText('Close panel')).toBeInTheDocument()
  })
})
