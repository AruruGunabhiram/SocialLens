import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
    variant?: 'default' | 'outline'
  }
  secondaryAction?: {
    label: string
    onClick: () => void
  }
  className?: string
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn('flex flex-col items-center text-center', className)}
      style={{ maxWidth: 400, padding: 'var(--space-16)', margin: '0 auto' }}
    >
      {Icon && (
        <Icon
          size={48}
          strokeWidth={1.5}
          aria-hidden
          style={{ color: 'var(--color-text-muted)', flexShrink: 0 }}
        />
      )}

      <h3
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'var(--text-lg)',
          fontWeight: 600,
          color: 'var(--color-text-primary)',
          letterSpacing: 'var(--tracking-tight)',
          marginTop: Icon ? 'var(--space-4)' : undefined,
        }}
      >
        {title}
      </h3>

      {description && (
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-sm)',
            color: 'var(--color-text-muted)',
            lineHeight: 'var(--leading-relaxed)',
            maxWidth: '24rem',
            textAlign: 'center',
            marginTop: 'var(--space-2)',
          }}
        >
          {description}
        </p>
      )}

      {(action || secondaryAction) && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-3)',
            marginTop: 'var(--space-6)',
          }}
        >
          {action && (
            <button
              type="button"
              onClick={action.onClick}
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 'var(--text-sm)',
                fontWeight: 600,
                color:
                  action.variant === 'outline'
                    ? 'var(--color-text-primary)'
                    : 'var(--color-text-inverse)',
                background: action.variant === 'outline' ? 'transparent' : 'var(--accent)',
                border:
                  action.variant === 'outline' ? '1px solid var(--color-border-strong)' : 'none',
                borderRadius: 'var(--radius-md)',
                padding: 'var(--space-2) var(--space-5)',
                cursor: 'pointer',
                transition: 'opacity var(--duration-base) var(--ease-standard)',
              }}
              onMouseOver={(e) => ((e.currentTarget as HTMLButtonElement).style.opacity = '0.85')}
              onMouseOut={(e) => ((e.currentTarget as HTMLButtonElement).style.opacity = '1')}
            >
              {action.label}
            </button>
          )}
          {secondaryAction && (
            <button
              type="button"
              onClick={secondaryAction.onClick}
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 'var(--text-sm)',
                fontWeight: 500,
                color: 'var(--color-text-secondary)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                textDecoration: 'underline',
                transition: 'opacity var(--duration-base) var(--ease-standard)',
              }}
              onMouseOver={(e) => ((e.currentTarget as HTMLButtonElement).style.opacity = '0.75')}
              onMouseOut={(e) => ((e.currentTarget as HTMLButtonElement).style.opacity = '1')}
            >
              {secondaryAction.label}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
