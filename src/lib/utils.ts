import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

// The instrument's type scale and colour tokens are not Tailwind defaults, so tailwind-merge
// would otherwise read `text-label` as a colour and drop it beside `text-ink`.
export const FONT_SIZE_TOKENS = ['label', 'table-dense', 'table', 'body', 'copy', 'title', 'total', 'readout-sm', 'readout-md', 'readout-lg'] as const
export const COLOUR_TOKENS = ['bg', 'face', 'ink', 'ink-2', 'ink-3', 'rule', 'rule-2', 'band', 'signal', 'signal-ink', 'scrim'] as const

const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: [...FONT_SIZE_TOKENS],
      color: [...COLOUR_TOKENS],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
