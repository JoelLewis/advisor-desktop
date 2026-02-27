import { useState, useCallback } from 'react'
import { X, FileText, Download, Loader2, CheckCircle2, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useReportTemplates, useGenerateReport } from '@/hooks/use-reports'
import type { ReportTemplate, ReportSection, GeneratedReport } from '@/types/report'

const SECTION_LABELS: Record<ReportSection, string> = {
  executive_summary: 'Executive Summary',
  portfolio_overview: 'Portfolio Overview',
  performance_analysis: 'Performance Analysis',
  asset_allocation: 'Asset Allocation',
  holdings_detail: 'Holdings Detail',
  transactions: 'Transaction Summary',
  tax_summary: 'Tax Summary',
  planning_progress: 'Planning Progress',
  market_commentary: 'Market Commentary',
  recommendations: 'Recommendations',
}

const PERIOD_OPTIONS = [
  { value: 'mtd', label: 'Month-to-Date' },
  { value: 'qtd', label: 'Quarter-to-Date' },
  { value: 'ytd', label: 'Year-to-Date' },
  { value: '1y', label: '1 Year' },
  { value: '3y', label: '3 Years' },
] as const

/** Render bold **text** as <strong> elements safely without dangerouslySetInnerHTML */
function renderBoldText(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*.+?\*\*)/)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>
    }
    return <span key={i}>{part}</span>
  })
}

function MarkdownBlock({ content }: { content: string }) {
  const paragraphs = content.split('\n\n')
  return (
    <div className="space-y-2 text-caption text-text-secondary">
      {paragraphs.map((paragraph, i) => {
        // Markdown table
        if (paragraph.startsWith('|')) {
          const rows = paragraph.split('\n').filter((r) => !r.match(/^\|[-|]+\|$/))
          const headers = rows[0]?.split('|').filter(Boolean).map((h) => h.trim()) ?? []
          const dataRows = rows.slice(1)
          return (
            <table key={i} className="my-2 w-full border-collapse text-[11px]">
              <thead>
                <tr className="border-b border-border-primary">
                  {headers.map((h, hi) => (
                    <th key={hi} className="px-2 py-1 text-left font-medium text-text-secondary">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dataRows.map((row, ri) => (
                  <tr key={ri} className="border-b border-border-primary last:border-0">
                    {row.split('|').filter(Boolean).map((cell, ci) => (
                      <td key={ci} className="px-2 py-1 font-mono text-text-primary">{cell.trim()}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )
        }
        // Bulleted or numbered list
        if (paragraph.startsWith('- ') || paragraph.startsWith('1. ')) {
          return (
            <ul key={i} className="my-1 list-disc pl-4 text-text-secondary">
              {paragraph.split('\n').map((item, li) => (
                <li key={li} className="py-0.5">{renderBoldText(item.replace(/^[-\d]+[.)] /, ''))}</li>
              ))}
            </ul>
          )
        }
        // Plain paragraph
        return <p key={i} className="my-1">{renderBoldText(paragraph)}</p>
      })}
    </div>
  )
}

type ReportGeneratorProps = {
  clientId?: string
  householdId?: string
  entityName: string
  onClose: () => void
}

export function ReportGenerator({ clientId, householdId, entityName, onClose }: ReportGeneratorProps) {
  const { data: templates } = useReportTemplates()
  const generate = useGenerateReport()

  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate>('portfolio_review')
  const [period, setPeriod] = useState<string>('qtd')
  const [sections, setSections] = useState<ReportSection[]>([])
  const [report, setReport] = useState<GeneratedReport | null>(null)

  const handleTemplateChange = useCallback((templateId: ReportTemplate) => {
    setSelectedTemplate(templateId)
    const tmpl = templates?.find((t) => t.id === templateId)
    if (tmpl) setSections(tmpl.defaultSections as ReportSection[])
    setReport(null)
  }, [templates])

  // Initialize sections on first template data
  if (templates && sections.length === 0) {
    const tmpl = templates.find((t) => t.id === selectedTemplate)
    if (tmpl) setSections(tmpl.defaultSections as ReportSection[])
  }

  const toggleSection = useCallback((section: ReportSection) => {
    setSections((prev) =>
      prev.includes(section) ? prev.filter((s) => s !== section) : [...prev, section],
    )
    setReport(null)
  }, [])

  const handleGenerate = useCallback(() => {
    generate.mutate(
      { template: selectedTemplate, period: period as 'mtd' | 'qtd' | 'ytd' | '1y' | '3y' | 'custom', sections, clientId, householdId },
      { onSuccess: (data) => setReport(data) },
    )
  }, [generate, selectedTemplate, period, sections, clientId, householdId])

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 z-50 flex max-h-[85vh] w-[900px] -translate-x-1/2 -translate-y-1/2 flex-col rounded-lg border border-border-primary bg-surface-primary shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-primary px-5 py-4">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-accent-blue" />
            <h2 className="text-body-strong text-text-primary">Generate Report — {entityName}</h2>
          </div>
          <button onClick={onClose} className="rounded p-1 text-text-tertiary hover:bg-surface-tertiary">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left: Config */}
          <div className="w-[320px] shrink-0 space-y-4 overflow-y-auto border-r border-border-primary p-5 scrollbar-thin">
            {/* Template */}
            <div>
              <label className="mb-1.5 block text-caption font-medium text-text-secondary">Template</label>
              <div className="space-y-1.5">
                {templates?.map((tmpl) => (
                  <button
                    key={tmpl.id}
                    onClick={() => handleTemplateChange(tmpl.id as ReportTemplate)}
                    className={cn(
                      'w-full rounded-md border px-3 py-2 text-left text-caption transition-colors',
                      selectedTemplate === tmpl.id
                        ? 'border-accent-blue bg-accent-blue/5 font-medium text-accent-blue'
                        : 'border-border-primary text-text-secondary hover:bg-surface-tertiary',
                    )}
                  >
                    {tmpl.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Period */}
            <div>
              <label className="mb-1.5 block text-caption font-medium text-text-secondary">Reporting Period</label>
              <select
                value={period}
                onChange={(e) => { setPeriod(e.target.value); setReport(null) }}
                className="w-full rounded-md border border-border-secondary bg-surface-primary px-3 py-2 text-caption text-text-primary"
              >
                {PERIOD_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Sections */}
            <div>
              <label className="mb-1.5 block text-caption font-medium text-text-secondary">Sections</label>
              <div className="space-y-1">
                {(Object.entries(SECTION_LABELS) as [ReportSection, string][]).map(([id, label]) => (
                  <label key={id} className="flex items-center gap-2 rounded px-2 py-1 text-caption hover:bg-surface-tertiary">
                    <input
                      type="checkbox"
                      checked={sections.includes(id)}
                      onChange={() => toggleSection(id)}
                      className="rounded border-border-secondary text-accent-blue focus:ring-accent-blue"
                    />
                    <span className="text-text-primary">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Generate */}
            <button
              onClick={handleGenerate}
              disabled={sections.length === 0 || generate.isPending}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-accent-blue px-4 py-2 text-caption font-medium text-white transition-colors hover:bg-accent-blue/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {generate.isPending ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Generating...</>
              ) : (
                <><Sparkles className="h-3.5 w-3.5" /> Generate Report</>
              )}
            </button>
          </div>

          {/* Right: Preview */}
          <div className="flex-1 overflow-y-auto p-5 scrollbar-thin">
            {!report && !generate.isPending && (
              <div className="flex h-full items-center justify-center text-caption text-text-tertiary">
                <div className="text-center">
                  <FileText className="mx-auto mb-2 h-10 w-10 opacity-30" />
                  <p>Select a template and sections, then click Generate</p>
                </div>
              </div>
            )}

            {generate.isPending && (
              <div className="flex h-full items-center justify-center">
                <div className="text-center">
                  <Loader2 className="mx-auto mb-2 h-8 w-8 animate-spin text-accent-purple" />
                  <p className="text-caption text-text-secondary">AI is generating your report...</p>
                </div>
              </div>
            )}

            {report && (
              <div className="space-y-6">
                {/* Report Header */}
                <div className="border-b border-border-primary pb-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-accent-green" />
                    <span className="text-caption text-accent-green">Report generated</span>
                  </div>
                  <h3 className="mt-1 text-body-strong text-text-primary">{report.title}</h3>
                  <p className="text-caption text-text-tertiary">
                    Generated {new Date(report.generatedAt).toLocaleString()}
                  </p>
                </div>

                {/* Sections */}
                {report.sections.map((section) => (
                  <div key={section.id}>
                    <h4 className="mb-2 text-body-strong text-text-primary">{section.title}</h4>
                    <MarkdownBlock content={section.content} />
                  </div>
                ))}

                {/* Download mock */}
                <div className="border-t border-border-primary pt-4">
                  <button
                    className="flex items-center gap-2 rounded-md border border-border-primary px-3 py-1.5 text-caption font-medium text-text-secondary hover:bg-surface-tertiary"
                    onClick={() => {/* Mock — would generate PDF */}}
                  >
                    <Download className="h-3.5 w-3.5" />
                    Export as PDF
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
