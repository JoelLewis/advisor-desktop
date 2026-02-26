import { create } from 'zustand'

type PanelTab = 'ai' | 'messages'

type UIStore = {
  sidebarExpanded: boolean
  aiPanelOpen: boolean
  aiPanelWidth: 400 | 600
  aiInitialMessage: string | null
  panelTab: PanelTab
  globalSearchOpen: boolean
  messagingPanelOpen: boolean
  toggleSidebar: () => void
  toggleAIPanel: () => void
  setAIPanelWidth: (width: 400 | 600) => void
  setInitialMessage: (msg: string) => void
  clearInitialMessage: () => void
  setPanelTab: (tab: PanelTab) => void
  openGlobalSearch: () => void
  closeGlobalSearch: () => void
  toggleMessaging: () => void
}

export const useUIStore = create<UIStore>((set) => ({
  sidebarExpanded: true,
  aiPanelOpen: false,
  aiPanelWidth: 400,
  aiInitialMessage: null,
  panelTab: 'ai',
  globalSearchOpen: false,
  messagingPanelOpen: false,

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
}))
