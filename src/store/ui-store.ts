import { create } from 'zustand'
import type { RichCardData } from '@/types/rich-card'

type PanelTab = 'ai' | 'messages' | 'client'

type UIStore = {
  sidebarExpanded: boolean
  aiPanelOpen: boolean
  aiPanelWidth: 400 | 600
  aiInitialMessage: string | null
  panelTab: PanelTab
  globalSearchOpen: boolean
  messagingPanelOpen: boolean
  pendingShareCard: RichCardData | null
  toggleSidebar: () => void
  toggleAIPanel: () => void
  setAIPanelWidth: (width: 400 | 600) => void
  setInitialMessage: (msg: string) => void
  clearInitialMessage: () => void
  setPanelTab: (tab: PanelTab) => void
  openGlobalSearch: () => void
  closeGlobalSearch: () => void
  toggleMessaging: () => void
  setPendingShareCard: (card: RichCardData | null) => void
  shareWithAI: (card: RichCardData) => void
  shareWithTeam: (card: RichCardData) => void
}

export const useUIStore = create<UIStore>((set) => ({
  sidebarExpanded: true,
  aiPanelOpen: false,
  aiPanelWidth: 400,
  aiInitialMessage: null,
  panelTab: 'ai',
  globalSearchOpen: false,
  messagingPanelOpen: false,
  pendingShareCard: null,

  toggleSidebar: () => set((s) => ({ sidebarExpanded: !s.sidebarExpanded })),
  toggleAIPanel: () => set((s) => ({ aiPanelOpen: !s.aiPanelOpen, panelTab: s.aiPanelOpen ? s.panelTab : 'ai' })),
  setAIPanelWidth: (width) => set({ aiPanelWidth: width }),
  setInitialMessage: (msg) => set({ aiInitialMessage: msg, aiPanelOpen: true, panelTab: 'ai' }),
  clearInitialMessage: () => set({ aiInitialMessage: null }),
  setPanelTab: (tab) => set({ panelTab: tab }),
  openGlobalSearch: () => set({ globalSearchOpen: true }),
  closeGlobalSearch: () => set({ globalSearchOpen: false }),
  toggleMessaging: () => set((s) => {
    if (s.aiPanelOpen && s.panelTab === 'messages') {
      return { aiPanelOpen: false }
    }
    return { aiPanelOpen: true, panelTab: 'messages' }
  }),
  setPendingShareCard: (card) => set({ pendingShareCard: card }),
  shareWithAI: (card) => set({ pendingShareCard: card, aiPanelOpen: true, panelTab: 'ai' }),
  shareWithTeam: (card) => set({ pendingShareCard: card, aiPanelOpen: true, panelTab: 'messages' }),
}))
