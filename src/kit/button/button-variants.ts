import { cva, type VariantProps } from 'class-variance-authority'

/**
 * Disabled buttons drop to an outline in muted ink rather than fading: a faded solid ink block reads
 * as a heavy gray slab in dark mode. ink-3 text and the rule-2 outline are contrast-checked tokens.
 */
export const buttonVariants = cva(
  'inline-flex h-9 items-center gap-2 rounded-xs px-4 text-body font-semibold disabled:cursor-not-allowed disabled:text-ink-3 aria-disabled:cursor-progress aria-disabled:text-ink-3',
  {
    variants: {
      rank: {
        primary: 'bg-ink text-face not-disabled:not-aria-disabled:hover:bg-ink-2 disabled:border disabled:border-rule-2 disabled:bg-transparent aria-disabled:border aria-disabled:border-rule-2 aria-disabled:bg-transparent',
        secondary: 'border border-ink bg-transparent text-ink not-disabled:not-aria-disabled:hover:bg-face disabled:border-rule-2 aria-disabled:border-rule-2',
        quiet: 'h-auto px-0 text-ink underline decoration-rule-2 underline-offset-4 not-disabled:not-aria-disabled:hover:decoration-ink disabled:no-underline aria-disabled:no-underline',
      },
    },
    defaultVariants: { rank: 'primary' },
  },
)

export type ButtonRank = NonNullable<VariantProps<typeof buttonVariants>['rank']>
