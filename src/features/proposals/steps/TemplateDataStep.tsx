import { FileText, TrendingUp, Target, Users, Check } from 'lucide-react'
import { useFormatCurrency } from '@/hooks/use-format-currency'
import { cn } from '@/lib/utils'
import { useProposalTemplates } from '@/hooks/use-proposals'
import { useClient } from '@/hooks/use-clients'
import { Skeleton } from '@/components/ui/Skeleton'
import type { ProposalTemplate } from '@/types/proposal'

const TEMPLATE_ICONS: Record<string, React.ReactNode> = {
  'tpl-001': <FileText className="h-5 w-5" />,
  'tpl-002': <Target className="h-5 w-5" />,
  'tpl-003': <TrendingUp className="h-5 w-5" />,
}

type TemplateDataStepProps = {
  clientId: string
  selectedTemplateId: string | null
  onSelectTemplate: (id: string) => void
}

export function TemplateDataStep({ clientId, selectedTemplateId, onSelectTemplate }: TemplateDataStepProps) {
  const { formatWithConversion } = useFormatCurrency()
  const { data: templates, isLoading: templatesLoading } = useProposalTemplates()
  const { data: client } = useClient(clientId)

  if (templatesLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Client context */}
      {client && (
        <div className="rounded-lg border border-border-primary bg-surface-secondary p-4">
          <div className="flex items-center gap-2 text-caption font-medium text-text-tertiary uppercase tracking-wider mb-2">
            <Users className="h-3.5 w-3.5" /> Client
          </div>
          <p className="text-body font-semibold text-text-primary">{client.fullName}</p>
          <div className="mt-1 flex items-center gap-4 text-caption text-text-secondary">
            <span>AUM: {formatWithConversion(client.totalAUM, 'USD', { compact: true })}</span>
            <span>Risk: {client.riskProfile.tolerance} ({client.riskProfile.score})</span>
          </div>
        </div>
      )}

      {/* Template selection */}
      <div>
        <h3 className="text-body font-semibold text-text-primary mb-3">Select Proposal Template</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {templates?.map((template: ProposalTemplate) => {
            const isSelected = selectedTemplateId === template.id
            return (
              <button
                key={template.id}
                onClick={() => onSelectTemplate(template.id)}
                className={cn(
                  'relative flex flex-col rounded-lg border p-4 text-left transition-all hover:shadow-sm',
                  isSelected
                    ? 'border-accent-blue bg-accent-blue/5 ring-1 ring-accent-blue'
                    : 'border-border-primary hover:border-border-secondary',
                )}
              >
                {isSelected && (
                  <div className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-accent-blue">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                )}
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-accent-blue/10 text-accent-blue">
                  {TEMPLATE_ICONS[template.id] ?? <FileText className="h-5 w-5" />}
                </div>
                <h4 className="mt-3 text-body font-semibold text-text-primary">{template.name}</h4>
                <p className="mt-1 text-caption text-text-secondary line-clamp-2">{template.description}</p>
                <p className="mt-2 text-[10px] text-text-tertiary">{template.suitableFor}</p>
              </button>
            )
          })}
        </div>
      </div>

      {/* Allocation preview for selected template */}
      {selectedTemplateId && templates && (() => {
        const template = templates.find((t: ProposalTemplate) => t.id === selectedTemplateId)
        if (!template) return null
        return (
          <div>
            <h3 className="text-body font-semibold text-text-primary mb-3">Default Allocation</h3>
            <div className="overflow-hidden rounded-lg border border-border-primary">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border-primary bg-surface-secondary">
                    <th className="px-4 py-2 text-left text-caption font-medium text-text-secondary">Asset Class</th>
                    <th className="px-4 py-2 text-right text-caption font-medium text-text-secondary">Current</th>
                    <th className="px-4 py-2 text-right text-caption font-medium text-text-secondary">Target</th>
                    <th className="px-4 py-2 text-right text-caption font-medium text-text-secondary">Change</th>
                  </tr>
                </thead>
                <tbody>
                  {template.defaultAllocation.map((a) => {
                    const change = a.targetWeight - a.currentWeight
                    return (
                      <tr key={a.assetClass} className="border-b border-border-primary last:border-0">
                        <td className="px-4 py-2 text-body text-text-primary">{a.assetClass}</td>
                        <td className="px-4 py-2 text-right font-mono text-body text-text-secondary">{(a.currentWeight * 100).toFixed(0)}%</td>
                        <td className="px-4 py-2 text-right font-mono text-body text-text-primary font-medium">{(a.targetWeight * 100).toFixed(0)}%</td>
                        <td className={cn(
                          'px-4 py-2 text-right font-mono text-body',
                          change > 0 ? 'text-accent-green' : change < 0 ? 'text-accent-red' : 'text-text-tertiary',
                        )}>
                          {change > 0 ? '+' : ''}{(change * 100).toFixed(0)}%
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
