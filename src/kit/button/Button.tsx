import type { ButtonHTMLAttributes } from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cn } from '@/lib/utils'
import { buttonVariants, type ButtonRank } from './button-variants'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { rank?: ButtonRank; asChild?: boolean }

export function Button({ rank = 'primary', asChild = false, className, type, ...rest }: ButtonProps) {
  const Comp = asChild ? Slot : 'button'
  return (
    <Comp
      data-rank={rank}
      type={asChild ? undefined : (type ?? 'button')}
      className={cn(buttonVariants({ rank }), className)}
      {...rest}
    />
  )
}
