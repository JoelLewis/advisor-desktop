import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useAccounts } from '@/hooks/use-accounts'
import { useDriftSummary, useModels } from '@/hooks/use-portfolio'
import { useRebalancePreview, useExecuteRebalance, useTradeComplianceCheck } from '@/hooks/use-orders'
import { useFormatCurrency } from '@/hooks/use-format-currency'
import type { RebalancePreview } from '@/services/oms'
import type { TradeComplianceResult } from '@/types/compliance'
import type { WizardStep } from './rebalance/types'
import type { SelectionMode } from './rebalance/SelectAccountsStep'
import { StepIndicator } from './rebalance/StepIndicator'
import { SelectAccountsStep } from './rebalance/SelectAccountsStep'
import { PreviewTradesStep } from './rebalance/PreviewTradesStep'
import { ComplianceReviewStep } from './rebalance/ComplianceReviewStep'
import { ExecuteConfirmationStep } from './rebalance/ExecuteConfirmationStep'

const STEPS: { id: WizardStep; label: string }[] = [
  { id: 'select', label: 'Select Accounts' },
  { id: 'preview', label: 'Preview Trades' },
  { id: 'review', label: 'Compliance Review' },
  { id: 'execute', label: 'Execute' },
]

export function RebalancePage() {
  const { formatWithConversion } = useFormatCurrency()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const preselectedAccounts = searchParams.get('accounts')?.split(',').filter(Boolean) ?? []
  const preselectedModel = searchParams.get('model')

  const { data: accounts } = useAccounts({})
  const { data: driftSummary } = useDriftSummary()
  const { data: models } = useModels()
  const previewMutation = useRebalancePreview()
  const executeMutation = useExecuteRebalance()
  const complianceMutation = useTradeComplianceCheck()

  const [step, setStep] = useState<WizardStep>('select')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(preselectedAccounts))
  const [taxAware, setTaxAware] = useState(true)
  const [driftThreshold, setDriftThreshold] = useState(3.0)
  const [previews, setPreviews] = useState<RebalancePreview[]>([])
  const [complianceResults, setComplianceResults] = useState<TradeComplianceResult[]>([])
  const autoAdvancedRef = useRef(false)
  const [selectionMode, setSelectionMode] = useState<SelectionMode>(preselectedModel ? 'model' : 'accounts')
  const [selectedModelId, setSelectedModelId] = useState<string | null>(preselectedModel)

  const driftMap = useMemo(() => new Map(driftSummary?.map((d) => [d.accountId, d]) ?? []), [driftSummary])
  const driftedAccounts = useMemo(() => accounts?.filter((a) => driftMap.get(a.id)?.needsRebalance) ?? [], [accounts, driftMap])

  // Build model -> drifted account mapping
  const driftedAccountsByModel = useMemo(() => {
    const map = new Map<string, string[]>()
    if (driftedAccounts.length > 0) {
      for (const acc of driftedAccounts) {
        const existing = map.get(acc.modelId)
        if (existing) {
          existing.push(acc.id)
        } else {
          map.set(acc.modelId, [acc.id])
        }
      }
    }
    return map
  }, [driftedAccounts])

  // Auto-select model accounts when preselectedModel is present
  useEffect(() => {
    if (preselectedModel && accounts && driftSummary) {
      const modelDriftedIds = driftedAccountsByModel.get(preselectedModel) ?? []
      if (modelDriftedIds.length > 0) {
        setSelectedIds(new Set(modelDriftedIds))
      }
    }
  }, [preselectedModel, accounts, driftSummary, driftedAccountsByModel])

  const handlePreview = useCallback(() => {
    if (selectedIds.size === 0) return
    previewMutation.mutate(
      { accountIds: [...selectedIds], driftThreshold: driftThreshold / 100, taxAware },
      {
        onSuccess: (data) => {
          setPreviews(data)
          setStep('preview')
        },
      },
    )
  }, [selectedIds, driftThreshold, taxAware, previewMutation])

  // Auto-advance to preview if accounts were pre-selected (not model mode)
  useEffect(() => {
    if (autoAdvancedRef.current) return
    if (preselectedAccounts.length > 0 && !preselectedModel && accounts && driftSummary) {
      autoAdvancedRef.current = true
      handlePreview()
    }
  }, [preselectedAccounts, preselectedModel, accounts, driftSummary, handlePreview])

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleSelectModel(modelId: string) {
    if (selectedModelId === modelId) {
      // Deselect model
      setSelectedModelId(null)
      setSelectedIds(new Set())
    } else {
      setSelectedModelId(modelId)
      const modelDriftedIds = driftedAccountsByModel.get(modelId) ?? []
      setSelectedIds(new Set(modelDriftedIds))
    }
  }

  function handleSelectionModeChange(mode: SelectionMode) {
    setSelectionMode(mode)
    if (mode === 'accounts') {
      setSelectedModelId(null)
    }
  }

  function handleReviewCompliance() {
    const complianceRequests = previews.map((p) => ({
      accountId: p.accountId,
      trades: p.trades.map((t) => ({
        symbol: t.symbol,
        side: t.side,
        quantity: t.quantity,
        estimatedValue: t.estimatedValue,
      })),
    }))
    complianceMutation.mutate(complianceRequests, {
      onSuccess: (data) => {
        setComplianceResults(data)
        setStep('review')
      },
    })
  }

  function handleExecute() {
    executeMutation.mutate(
      { accountIds: [...selectedIds], taxAware },
      { onSuccess: () => setStep('execute') },
    )
  }

  const stepIndex = STEPS.findIndex((s) => s.id === step)
  const allComplianceChecks = complianceResults.flatMap((r) => r.checks)
  const hasComplianceFailure = allComplianceChecks.some((c) => c.status === 'fail')
  const totalTrades = previews.reduce((sum, p) => sum + p.trades.length, 0)
  const totalTaxImpact = previews.reduce((sum, p) => sum + p.estimatedTaxImpact, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="rounded p-1.5 text-text-secondary hover:bg-surface-tertiary hover:text-text-primary">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-page-title">Rebalance Wizard</h1>
          <p className="text-caption text-text-secondary">{selectedIds.size} account{selectedIds.size !== 1 ? 's' : ''} selected</p>
        </div>
      </div>

      <StepIndicator steps={STEPS.map((s) => s.label)} currentIndex={stepIndex} />

      {/* Step content */}
      {step === 'select' && (
        <SelectAccountsStep
          accounts={accounts}
          driftedAccounts={driftedAccounts}
          driftMap={driftMap}
          selectedIds={selectedIds}
          toggleSelect={toggleSelect}
          selectionMode={selectionMode}
          setSelectionMode={handleSelectionModeChange}
          selectedModelId={selectedModelId}
          handleSelectModel={handleSelectModel}
          driftThreshold={driftThreshold}
          setDriftThreshold={setDriftThreshold}
          taxAware={taxAware}
          setTaxAware={setTaxAware}
          handlePreview={handlePreview}
          previewMutation={previewMutation}
          formatWithConversion={formatWithConversion}
          models={models ?? []}
          driftedAccountsByModel={driftedAccountsByModel}
        />
      )}

      {step === 'preview' && (
        <PreviewTradesStep
          previews={previews}
          accounts={accounts}
          formatWithConversion={formatWithConversion}
          totalTrades={totalTrades}
          totalTaxImpact={totalTaxImpact}
          complianceMutation={complianceMutation}
          handleReviewCompliance={handleReviewCompliance}
          setStep={setStep}
        />
      )}

      {step === 'review' && (
        <ComplianceReviewStep
          complianceResults={complianceResults}
          accounts={accounts}
          allComplianceChecks={allComplianceChecks}
          hasComplianceFailure={hasComplianceFailure}
          executeMutation={executeMutation}
          handleExecute={handleExecute}
          setStep={setStep}
        />
      )}

      {step === 'execute' && (
        <ExecuteConfirmationStep
          selectedIds={selectedIds}
          totalTrades={totalTrades}
          executeMutation={executeMutation}
          accounts={accounts}
          navigate={navigate}
        />
      )}
    </div>
  )
}
