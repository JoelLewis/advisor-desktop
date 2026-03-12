import { create } from 'zustand'
import type { RichCardData } from '@/types/rich-card'

export type ThemeMode = 'light' | 'dark' | 'system'

export type PanelTab = 'ai' | 'messages'

type UIStore = {
  themeMode: ThemeMode
  sidebarExpanded: boolean
  aiPanelOpen: boolean
  aiPanelWidth: number
  aiInitialMessage: string | null
  panelTab: PanelTab
  globalSearchOpen: boolean
  messagingPanelOpen: boolean
  pendingShareCard: RichCardData | null
  annotationsEnabled: boolean
  activeAnnotationId: string | null
  annotationPanelOpen: boolean
  quickCaptureOpen: boolean
  toggleSidebar: () => void
  toggleAIPanel: () => void
  setAIPanelWidth: (width: number) => void
  setInitialMessage: (msg: string) => void
  clearInitialMessage: () => void
  setPanelTab: (tab: PanelTab) => void
  openGlobalSearch: () => void
  closeGlobalSearch: () => void
  toggleMessaging: () => void
  setPendingShareCard: (card: RichCardData | null) => void
  shareWithAI: (card: RichCardData) => void
  shareWithTeam: (card: RichCardData) => void
  toggleAnnotations: () => void
  setActiveAnnotation: (id: string | null) => void
  setAnnotationPanelOpen: (open: boolean) => void
  openQuickCapture: () => void
  closeQuickCapture: () => void
  setThemeMode: (mode: ThemeMode) => void
}

const isDesktop = () => typeof window !== 'undefined' && window.matchMedia('(min-width: 1280px)').matches

function getInitialTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'system'
  return (localStorage.getItem('theme-mode') as ThemeMode | null) ?? 'system'
}

function applyTheme(mode: ThemeMode) {
  if (typeof window === 'undefined') return
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const isDark = mode === 'dark' || (mode === 'system' && prefersDark)
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
}

// Apply theme on load
applyTheme(getInitialTheme())

export const useUIStore = create<UIStore>((set) => ({
  themeMode: getInitialTheme(),
  sidebarExpanded: isDesktop(),
  aiPanelOpen: false,
  aiPanelWidth: 400,
  aiInitialMessage: null,
  panelTab: 'ai',
  globalSearchOpen: false,
  messagingPanelOpen: false,
  pendingShareCard: null,
  annotationsEnabled: false,
  activeAnnotationId: null,
  annotationPanelOpen: false,
  quickCaptureOpen: false,

  toggleSidebar: () => set((s) => ({ sidebarExpanded: !s.sidebarExpanded })),
  toggleAIPanel: () => set((s) => ({
    aiPanelOpen: !s.aiPanelOpen,
    panelTab: s.aiPanelOpen ? s.panelTab : 'ai',
    // Close annotations when opening AI panel
    ...(!s.aiPanelOpen ? { annotationsEnabled: false, annotationPanelOpen: false, activeAnnotationId: null } : {}),
  })),
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
  toggleAnnotations: () => set((s) => {
    const enabling = !s.annotationsEnabled
    return {
      annotationsEnabled: enabling,
      annotationPanelOpen: enabling,
      activeAnnotationId: null,
      // Close AI panel when opening annotations (mutual exclusion)
      ...(enabling ? { aiPanelOpen: false } : {}),
    }
  }),
  setActiveAnnotation: (id) => set({ activeAnnotationId: id }),
  setAnnotationPanelOpen: (open) => set({ annotationPanelOpen: open }),
  openQuickCapture: () => set({ quickCaptureOpen: true }),
  closeQuickCapture: () => set({ quickCaptureOpen: false }),
  setThemeMode: (mode) => {
    localStorage.setItem('theme-mode', mode)
    applyTheme(mode)
    set({ themeMode: mode })
  },
}))
