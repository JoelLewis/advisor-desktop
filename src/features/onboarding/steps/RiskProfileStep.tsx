import { cn } from '@/lib/utils'
import { useRiskQuestions } from '@/hooks/use-onboarding'
import { Skeleton } from '@/components/ui/Skeleton'
import type { RiskAnswer, RiskResult } from '@/types/onboarding'

type RiskProfileStepProps = {
  answers: RiskAnswer[]
  result: RiskResult | null
  onAnswer: (questionId: string, selectedOption: number) => void
}

const PROFILE_COLORS: Record<string, string> = {
  conservative: 'bg-accent-blue/10 text-accent-blue border-accent-blue',
  moderate_conservative: 'bg-teal-50 text-teal-700 border-teal-500',
  moderate: 'bg-amber-50 text-amber-700 border-amber-500',
  moderate_aggressive: 'bg-orange-50 text-orange-700 border-orange-500',
  aggressive: 'bg-accent-red/10 text-accent-red border-accent-red',
}

export function RiskProfileStep({ answers, result, onAnswer }: RiskProfileStepProps) {
  const { data: questions, isLoading } = useRiskQuestions()

  if (isLoading) {
    return <div className="space-y-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32" />)}</div>
  }

  if (!questions) return <div className="py-8 text-center text-caption text-text-tertiary">Unable to load risk assessment questions</div>

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-h3 text-text-primary">Risk Profile Assessment</h3>
        <p className="mt-1 text-caption text-text-secondary">
          Answer the following questions to determine the client&apos;s risk tolerance and recommended investment model.
        </p>
      </div>

      {/* Result banner */}
      {result && (
        <div className={cn('rounded-lg border-l-4 p-4', PROFILE_COLORS[result.profile] ?? 'bg-surface-tertiary text-text-primary border-border-primary')}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-body-strong">Risk Profile: {result.label}</p>
              <p className="mt-0.5 text-caption">Score: {result.score}/100</p>
            </div>
            <div className="text-right">
              <p className="text-caption font-medium">Recommended Model</p>
              <p className="text-body-strong">{result.recommendedModel}</p>
            </div>
          </div>
        </div>
      )}

      {/* Questions */}
      <div className="space-y-6">
        {questions.map((q, qi) => {
          const answer = answers.find((a) => a.questionId === q.id)
          return (
            <div key={q.id} className="rounded-lg border border-border-primary bg-surface-primary p-4">
              <p className="text-body-strong text-text-primary">
                <span className="text-text-tertiary">{qi + 1}.</span> {q.text}
              </p>
              <div className="mt-3 space-y-2">
                {q.options.map((opt, oi) => (
                  <button
                    key={oi}
                    onClick={() => onAnswer(q.id, oi)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-md border px-3 py-2 text-left text-caption transition-colors',
                      answer?.selectedOption === oi
                        ? 'border-accent-blue bg-accent-blue/5 text-accent-blue'
                        : 'border-border-primary text-text-secondary hover:bg-surface-tertiary',
                    )}
                  >
                    <span className={cn(
                      'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-medium',
                      answer?.selectedOption === oi
                        ? 'border-accent-blue bg-accent-blue text-white'
                        : 'border-border-secondary text-text-tertiary',
                    )}>
                      {String.fromCharCode(65 + oi)}
                    </span>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
