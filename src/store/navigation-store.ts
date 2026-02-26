import { create } from 'zustand'

type BreadcrumbItem = {
  label: string
  path: string
}

type EntityContext = {
  type: 'client' | 'household' | 'account' | 'portfolio' | 'workflow' | null
  id: string | null
  name: string | null
}

type NavigationStore = {
  breadcrumbs: BreadcrumbItem[]
  entityContext: EntityContext
  setBreadcrumbs: (items: BreadcrumbItem[]) => void
  setEntityContext: (ctx: EntityContext) => void
  clearEntityContext: () => void
}

export const useNavigationStore = create<NavigationStore>((set) => ({
  breadcrumbs: [],
  entityContext: { type: null, id: null, name: null },

  setBreadcrumbs: (items) => set({ breadcrumbs: items }),
  setEntityContext: (ctx) => set({ entityContext: ctx }),
  clearEntityContext: () =>
    set({ entityContext: { type: null, id: null, name: null } }),
}))
