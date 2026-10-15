import type { ButtonHTMLAttributes } from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cn } from '@/lib/utils'
import { buttonVariants, type ButtonRank } from './button-variants'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { rank?: ButtonRank; asChild?: boolean; pending?: boolean }

/** `pending`: a request is in flight. The button keeps focus and says it is unavailable, and ignores activation until it settles. */
export function Button({ rank = 'primary', asChild = false, pending = false, className, type, onClick, 'aria-disabled': ariaDisabled, ...rest }: ButtonProps) {
  const Comp = asChild ? Slot : 'button'
  return (
    <Comp
      {...rest}
      data-rank={rank}
      data-pending={pending ? 'true' : undefined}
      aria-disabled={pending ? true : ariaDisabled}
      type={asChild ? undefined : (type ?? 'button')}
      className={cn(buttonVariants({ rank }), className)}
      onClick={pending ? (e) => e.preventDefault() : onClick}
    />
  )
}
