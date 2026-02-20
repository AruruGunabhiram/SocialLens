import { ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

type ErrorStateProps = {
  title?: string
  description?: string
  actionLabel?: string
  onAction?: () => void
  icon?: ReactNode
  className?: string
  status?: number
  code?: string
}

export function ErrorState({
  title = 'Something went wrong',
  description = 'Please try again or contact support if the issue persists.',
  actionLabel = 'Retry',
  onAction,
  icon,
  className,
  status,
  code,
}: ErrorStateProps) {
  return (
    <Card className={cn('border-destructive/40 bg-destructive/10', className)}>
      <CardContent className="flex flex-col items-center justify-center gap-3 py-8 text-center">
        {icon}
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-destructive">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
          {(status || code) && (
            <p className="text-xs text-muted-foreground/80">
              {status ? `Status ${status}` : ''}
              {status && code ? ' · ' : ''}
              {code ?? ''}
            </p>
          )}
        </div>
        {onAction && (
          <Button variant="secondary" onClick={onAction}>
            {actionLabel}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
