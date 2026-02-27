import { describe, it, expect, beforeEach } from 'vitest'
import { useNavigationStore } from '../navigation-store'

const defaultState = {
  breadcrumbs: [],
  entityContext: { type: null, id: null, name: null },
}

describe('navigation-store', () => {
  beforeEach(() => {
    useNavigationStore.setState(defaultState)
  })

  describe('default state', () => {
    it('has empty breadcrumbs', () => {
      expect(useNavigationStore.getState().breadcrumbs).toEqual([])
    })

    it('has entity context with all nulls', () => {
      const ctx = useNavigationStore.getState().entityContext
      expect(ctx.type).toBeNull()
      expect(ctx.id).toBeNull()
      expect(ctx.name).toBeNull()
    })
  })

  describe('setBreadcrumbs', () => {
    it('updates breadcrumbs with the provided items', () => {
      const crumbs = [
        { label: 'Dashboard', path: '/' },
        { label: 'Clients', path: '/clients' },
        { label: 'Robert Johnson', path: '/clients/cli-001' },
      ]
      useNavigationStore.getState().setBreadcrumbs(crumbs)
      expect(useNavigationStore.getState().breadcrumbs).toEqual(crumbs)
    })

    it('replaces existing breadcrumbs', () => {
      useNavigationStore.getState().setBreadcrumbs([
        { label: 'First', path: '/first' },
      ])
      useNavigationStore.getState().setBreadcrumbs([
        { label: 'Second', path: '/second' },
      ])
      expect(useNavigationStore.getState().breadcrumbs).toEqual([
        { label: 'Second', path: '/second' },
      ])
    })

    it('can set an empty breadcrumbs array', () => {
      useNavigationStore.getState().setBreadcrumbs([
        { label: 'Something', path: '/something' },
      ])
      useNavigationStore.getState().setBreadcrumbs([])
      expect(useNavigationStore.getState().breadcrumbs).toEqual([])
    })
  })

  describe('setEntityContext', () => {
    it('updates entityContext with the provided values', () => {
      useNavigationStore.getState().setEntityContext({
        type: 'client',
        id: 'cli-001',
        name: 'Robert Johnson',
      })
      const ctx = useNavigationStore.getState().entityContext
      expect(ctx.type).toBe('client')
      expect(ctx.id).toBe('cli-001')
      expect(ctx.name).toBe('Robert Johnson')
    })

    it('handles different entity types', () => {
      useNavigationStore.getState().setEntityContext({
        type: 'household',
        id: 'hh-001',
        name: 'Johnson Household',
      })
      const ctx = useNavigationStore.getState().entityContext
      expect(ctx.type).toBe('household')
      expect(ctx.id).toBe('hh-001')
      expect(ctx.name).toBe('Johnson Household')
    })

    it('handles account entity type', () => {
      useNavigationStore.getState().setEntityContext({
        type: 'account',
        id: 'acc-001',
        name: 'Johnson Family Trust',
      })
      expect(useNavigationStore.getState().entityContext.type).toBe('account')
    })
  })

  describe('clearEntityContext', () => {
    it('resets entityContext to all nulls', () => {
      useNavigationStore.getState().setEntityContext({
        type: 'client',
        id: 'cli-001',
        name: 'Robert Johnson',
      })
      useNavigationStore.getState().clearEntityContext()
      const ctx = useNavigationStore.getState().entityContext
      expect(ctx.type).toBeNull()
      expect(ctx.id).toBeNull()
      expect(ctx.name).toBeNull()
    })

    it('is idempotent when already cleared', () => {
      useNavigationStore.getState().clearEntityContext()
      const ctx = useNavigationStore.getState().entityContext
      expect(ctx).toEqual({ type: null, id: null, name: null })
    })
  })
})
