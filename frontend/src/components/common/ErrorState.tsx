import { ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

type ErrorStateProps = {
  title?: string
  /** Error message / description shown below the title. */
  description?: string
  /** Alias for description  -  either prop works. */
  message?: string
  actionLabel?: string
  onAction?: () => void
  /** Alias for onAction  -  either prop works. */
  onRetry?: () => void
  icon?: ReactNode
  className?: string
  status?: number
  code?: string
}

export function ErrorState({
  title = 'Something went wrong',
  description,
  message,
  actionLabel = 'Try Again',
  onAction,
  onRetry,
  icon,
  className,
  status,
  code,
}: ErrorStateProps) {
  const resolvedDescription =
    description ?? message ?? 'Please try again or contact support if the issue persists.'
  const resolvedAction = onAction ?? onRetry
  return (
    <Card className={cn('border-destructive/40 bg-destructive/10', className)}>
      <CardContent className="flex flex-col items-center justify-center gap-3 py-8 text-center">
        {icon}
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-destructive">{title}</h3>
          <p className="text-sm text-muted-foreground">{resolvedDescription}</p>
          {(status || code) && (
            <p className="text-xs text-muted-foreground/80">
              {status ? `Status ${status}` : ''}
              {status && code ? ' · ' : ''}
              {code ?? ''}
            </p>
          )}
        </div>
        {resolvedAction && (
          <Button variant="secondary" onClick={resolvedAction}>
            {actionLabel}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
