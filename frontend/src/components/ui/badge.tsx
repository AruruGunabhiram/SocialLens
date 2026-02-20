import * as React from 'react'

import { cn } from '@/lib/utils'

const badgeVariants = {
  default:
    'bg-primary text-primary-foreground shadow hover:bg-primary/90',
  secondary:
    'bg-secondary text-secondary-foreground hover:bg-secondary/80',
  destructive:
    'bg-destructive text-destructive-foreground shadow hover:bg-destructive/90',
  outline:
    'text-foreground border',
}

export type BadgeVariant = keyof typeof badgeVariants

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: BadgeVariant
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
          badgeVariants[variant],
          className
        )}
        {...props}
      />
    )
  }
)
Badge.displayName = 'Badge'

export { Badge }
