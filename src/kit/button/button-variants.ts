import { cva, type VariantProps } from 'class-variance-authority'

export const buttonVariants = cva(
  'inline-flex h-9 items-center gap-2 rounded-xs px-4 text-body font-semibold disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      rank: {
        primary: 'bg-ink text-face hover:bg-ink-2',
        secondary: 'border border-ink bg-transparent text-ink hover:bg-face',
        quiet: 'h-auto px-0 text-ink underline decoration-rule-2 underline-offset-4 hover:decoration-ink',
      },
    },
    defaultVariants: { rank: 'primary' },
  },
)

export type ButtonRank = NonNullable<VariantProps<typeof buttonVariants>['rank']>
