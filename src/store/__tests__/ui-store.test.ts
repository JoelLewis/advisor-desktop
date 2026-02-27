import { describe, it, expect, beforeEach } from 'vitest'
import { useUIStore } from '../ui-store'
import type { RichCardData } from '@/types/rich-card'

const defaultState = {
  sidebarExpanded: true,
  aiPanelOpen: false,
  aiPanelWidth: 400,
  aiInitialMessage: null,
  panelTab: 'ai' as const,
  globalSearchOpen: false,
  messagingPanelOpen: false,
  pendingShareCard: null,
}

describe('ui-store', () => {
  beforeEach(() => {
    useUIStore.setState(defaultState)
  })

  describe('default state', () => {
    it('has sidebarExpanded = true', () => {
      expect(useUIStore.getState().sidebarExpanded).toBe(true)
    })

    it('has aiPanelOpen = false', () => {
      expect(useUIStore.getState().aiPanelOpen).toBe(false)
    })

    it('has panelTab = ai', () => {
      expect(useUIStore.getState().panelTab).toBe('ai')
    })

    it('has globalSearchOpen = false', () => {
      expect(useUIStore.getState().globalSearchOpen).toBe(false)
    })
  })

  describe('toggleSidebar', () => {
    it('flips sidebarExpanded from true to false', () => {
      useUIStore.getState().toggleSidebar()
      expect(useUIStore.getState().sidebarExpanded).toBe(false)
    })

    it('flips sidebarExpanded from false to true', () => {
      useUIStore.setState({ sidebarExpanded: false })
      useUIStore.getState().toggleSidebar()
      expect(useUIStore.getState().sidebarExpanded).toBe(true)
    })
  })

  describe('toggleAIPanel', () => {
    it('opens the panel and sets panelTab to ai', () => {
      useUIStore.getState().toggleAIPanel()
      const state = useUIStore.getState()
      expect(state.aiPanelOpen).toBe(true)
      expect(state.panelTab).toBe('ai')
    })

    it('closes the panel when already open', () => {
      useUIStore.setState({ aiPanelOpen: true })
      useUIStore.getState().toggleAIPanel()
      expect(useUIStore.getState().aiPanelOpen).toBe(false)
    })

    it('preserves panelTab when closing', () => {
      useUIStore.setState({ aiPanelOpen: true, panelTab: 'messages' })
      useUIStore.getState().toggleAIPanel()
      expect(useUIStore.getState().panelTab).toBe('messages')
    })
  })

  describe('setInitialMessage', () => {
    it('sets aiInitialMessage, opens panel, and sets tab to ai', () => {
      useUIStore.getState().setInitialMessage('hello')
      const state = useUIStore.getState()
      expect(state.aiInitialMessage).toBe('hello')
      expect(state.aiPanelOpen).toBe(true)
      expect(state.panelTab).toBe('ai')
    })
  })

  describe('clearInitialMessage', () => {
    it('sets aiInitialMessage to null', () => {
      useUIStore.setState({ aiInitialMessage: 'some message' })
      useUIStore.getState().clearInitialMessage()
      expect(useUIStore.getState().aiInitialMessage).toBeNull()
    })
  })

  describe('toggleMessaging', () => {
    it('opens panel with messages tab when panel is closed', () => {
      useUIStore.getState().toggleMessaging()
      const state = useUIStore.getState()
      expect(state.aiPanelOpen).toBe(true)
      expect(state.panelTab).toBe('messages')
    })

    it('closes panel when panel is open on messages tab', () => {
      useUIStore.setState({ aiPanelOpen: true, panelTab: 'messages' })
      useUIStore.getState().toggleMessaging()
      expect(useUIStore.getState().aiPanelOpen).toBe(false)
    })

    it('switches to messages tab when panel is open on ai tab', () => {
      useUIStore.setState({ aiPanelOpen: true, panelTab: 'ai' })
      useUIStore.getState().toggleMessaging()
      const state = useUIStore.getState()
      expect(state.aiPanelOpen).toBe(true)
      expect(state.panelTab).toBe('messages')
    })
  })

  describe('globalSearch', () => {
    it('openGlobalSearch sets globalSearchOpen to true', () => {
      useUIStore.getState().openGlobalSearch()
      expect(useUIStore.getState().globalSearchOpen).toBe(true)
    })

    it('closeGlobalSearch sets globalSearchOpen to false', () => {
      useUIStore.setState({ globalSearchOpen: true })
      useUIStore.getState().closeGlobalSearch()
      expect(useUIStore.getState().globalSearchOpen).toBe(false)
    })
  })

  describe('shareWithAI', () => {
    it('sets pendingShareCard, opens panel, sets tab to ai', () => {
      const card: RichCardData = {
        variant: 'client_summary',
        entityId: 'cli-001',
        entityName: 'Robert Johnson',
      }
      useUIStore.getState().shareWithAI(card)
      const state = useUIStore.getState()
      expect(state.pendingShareCard).toEqual(card)
      expect(state.aiPanelOpen).toBe(true)
      expect(state.panelTab).toBe('ai')
    })
  })

  describe('shareWithTeam', () => {
    it('sets pendingShareCard, opens panel, sets tab to messages', () => {
      const card: RichCardData = {
        variant: 'portfolio_overview',
        entityId: 'acc-001',
        entityName: 'Johnson Family Trust',
      }
      useUIStore.getState().shareWithTeam(card)
      const state = useUIStore.getState()
      expect(state.pendingShareCard).toEqual(card)
      expect(state.aiPanelOpen).toBe(true)
      expect(state.panelTab).toBe('messages')
    })
  })
})
