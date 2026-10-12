import { useEffect, useMemo, useReducer, useState } from 'react'
import { useProposalPreview, useSaveVersion } from '@/hooks/use-workspace'
import type { DraftPreview, LegEdit, ProposalDetail } from '@/types/workspace-proposal'
import { latestVersionOf } from '@/workspace/proposal/latest-version'
import { useViewer } from '@/workspace/viewer/use-viewer'
import { draftReducer, normaliseDraftEdits, sameEdits, type DraftAction, type DraftState } from './edit-draft'

export type DraftVersion = {
  edits: LegEdit[]; dispatch: (a: DraftAction) => void; dirty: boolean; view: DraftPreview
  previewPending: boolean; previewError: Error | null; newerArrived: boolean
  canSave: boolean; save: () => void; saving: boolean; saveError: Error | null; savedVersion?: number; discard: () => void; nextVersion: number
  /** The draft was left unsaved on an earlier visit and is shown again. */
  keptFromEarlier: boolean
}

const keyOf = (viewerId: string, proposalId: string) => `ws-draft:${viewerId}:${proposalId}`

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null

function asLegEdit(v: unknown): LegEdit | undefined {
  if (!isRecord(v) || typeof v.symbol !== 'string') return undefined
  if (v.kind === 'exclude') return { kind: 'exclude', symbol: v.symbol }
  if (v.kind === 'quantity' && typeof v.quantity === 'number') return { kind: 'quantity', symbol: v.symbol, quantity: v.quantity }
  if (v.kind === 'lots' && Array.isArray(v.lotIds) && v.lotIds.every((id) => typeof id === 'string')) return { kind: 'lots', symbol: v.symbol, lotIds: v.lotIds }
  return undefined
}

/** A draft left in this tab's session for a version the proposal still has; anything else is not a draft. */
function readKeptDraft(key: string, detail: ProposalDetail): DraftState | undefined {
  const raw = sessionStorage.getItem(key)
  if (raw === null) return undefined
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error
    return undefined
  }
  if (!isRecord(parsed) || typeof parsed.base !== 'number' || !Array.isArray(parsed.edits)) return undefined
  const edits = parsed.edits.map(asLegEdit)
  if (!edits.every((e): e is LegEdit => e !== undefined)) return undefined
  const base = parsed.base
  return detail.versions.some((v) => v.n === base) ? { base, edits } : undefined
}

export function useDraftVersion(detail: ProposalDetail): DraftVersion {
  const { viewerId } = useViewer()
  const storageKey = keyOf(viewerId, detail.id)
  const latest = latestVersionOf(detail)
  const [kept] = useState(() => readKeptDraft(storageKey, detail))
  const [state, dispatch] = useReducer(draftReducer, kept ?? { base: latest.n, edits: latest.edits })
  const [keptFromEarlier, setKeptFromEarlier] = useState(kept !== undefined && !sameEdits(kept.edits, latest.edits))
  const [savedVersion, setSavedVersion] = useState<number>()
  const baseEdits = detail.versions.find((v) => v.n === state.base)?.edits ?? []
  const clean = sameEdits(state.edits, baseEdits)
  // A version that lands while the draft is clean becomes the draft; one that lands mid-edit takes the edits on top.
  useEffect(() => {
    if (clean && state.base !== latest.n) dispatch({ type: 'reset', base: latest.n, edits: latest.edits })
  }, [clean, state.base, latest.n, latest.edits])
  const dirty = !sameEdits(state.edits, latest.edits)
  // Kept for the session so leaving the page does not lose the work; a clean draft keeps nothing.
  useEffect(() => {
    if (dirty) sessionStorage.setItem(storageKey, JSON.stringify(state))
    else sessionStorage.removeItem(storageKey)
  }, [dirty, state, storageKey])
  const edits = useMemo(() => normaliseDraftEdits(state.edits), [state.edits])
  const preview = useProposalPreview(detail.id, edits, dirty)
  const saveVersion = useSaveVersion(detail.id)
  const previewReady = dirty && preview.data !== undefined && !preview.isPlaceholderData && !preview.isError
  const canSave = previewReady && !saveVersion.isPending
  const save = () => {
    if (!canSave) return
    setSavedVersion(undefined)
    saveVersion.mutate(edits, {
      onSuccess: (saved) => {
        const v = saved.versions[saved.versions.length - 1]
        if (!v) return
        setSavedVersion(v.n)
        setKeptFromEarlier(false)
        dispatch({ type: 'reset', base: v.n, edits: v.edits })
      },
    })
  }
  return {
    edits: state.edits,
    dispatch: (a) => {
      setSavedVersion(undefined)
      saveVersion.reset()
      dispatch(a)
    },
    dirty,
    view: dirty && preview.data ? preview.data : latest,
    previewPending: dirty && preview.isFetching,
    previewError: dirty ? preview.error : null,
    newerArrived: dirty && state.base !== latest.n,
    canSave,
    save,
    saving: saveVersion.isPending,
    saveError: saveVersion.error,
    savedVersion,
    discard: () => {
      setSavedVersion(undefined)
      setKeptFromEarlier(false)
      saveVersion.reset()
      dispatch({ type: 'reset', base: latest.n, edits: latest.edits })
    },
    nextVersion: latest.n + 1,
    keptFromEarlier: keptFromEarlier && dirty,
  }
}
