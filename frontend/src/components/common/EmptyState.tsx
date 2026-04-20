import { ReactNode } from 'react'
import { AlertCircle, BarChart2 } from 'lucide-react'

import { cn } from '@/lib/utils'

export type EmptyStatePreset = 'no-data' | 'error'

export interface EmptyStateProps {
  /** Overrides the preset title. */
  title?: string
  /** Overrides the preset description. */
  description?: string
  actionLabel?: string
  onAction?: () => void
  /** Custom illustration / icon slot  -  overrides preset icon. */
  illustration?: ReactNode
  /** @deprecated Use `illustration`. Kept for backward compat. */
  icon?: ReactNode
  preset?: EmptyStatePreset
  className?: string
}

interface PresetConfig {
  icon: ReactNode
  title: string
  description: string
}

const ICON_STYLE: React.CSSProperties = { flexShrink: 0 }

const PRESETS: Record<EmptyStatePreset, PresetConfig> = {
  'no-data': {
    icon: (
      <BarChart2
        size={48}
        strokeWidth={1.5}
        aria-hidden
        style={{ ...ICON_STYLE, color: 'var(--color-border-strong)' }}
      />
    ),
    title: 'No data available',
    description: 'There is nothing to display here yet. Data will appear once it is available.',
  },
  error: {
    icon: (
      <AlertCircle
        size={48}
        strokeWidth={1.5}
        aria-hidden
        style={{ ...ICON_STYLE, color: 'var(--color-down)' }}
      />
    ),
    title: 'Failed to load',
    description:
      'Something went wrong while fetching this data. Try again, or contact support if the issue persists.',
  },
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  illustration,
  icon,
  preset = 'no-data',
  className,
}: EmptyStateProps) {
  const resolved = PRESETS[preset]
  const displayTitle = title ?? resolved.title
  const displayDescription = description ?? resolved.description
  const displayIllustration = illustration ?? icon ?? resolved.icon
  const hasAction = Boolean(actionLabel && onAction)

  return (
    <div
      className={cn('flex flex-col items-center text-center', className)}
      style={{ maxWidth: '400px', padding: 'var(--space-16)', margin: '0 auto' }}
    >
      {/* Illustration / icon */}
      {displayIllustration && (
        <div style={{ marginBottom: 'var(--space-6)' }}>{displayIllustration}</div>
      )}

      {/* Headline  -  Syne 600, --text-2xl per spec */}
      <h3
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'var(--text-2xl)',
          fontWeight: 600,
          color: 'var(--color-text-primary)',
          letterSpacing: 'var(--tracking-tight)',
          marginBottom: 'var(--space-2)',
        }}
      >
        {displayTitle}
      </h3>

      {/* Description  -  Instrument Sans 400, --text-base per spec */}
      <p
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 'var(--text-base)',
          color: 'var(--color-text-secondary)',
          lineHeight: 'var(--leading-relaxed)',
          marginBottom: hasAction ? 'var(--space-6)' : undefined,
        }}
      >
        {displayDescription}
      </p>

      {/* Action button */}
      {hasAction && (
        <button
          type="button"
          onClick={onAction}
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-sm)',
            fontWeight: 600,
            color: 'var(--color-text-inverse)',
            background: 'var(--accent)',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-2) var(--space-5)',
            cursor: 'pointer',
            transition: 'opacity var(--duration-base) var(--ease-standard)',
          }}
          onMouseOver={(e) => ((e.currentTarget as HTMLButtonElement).style.opacity = '0.85')}
          onMouseOut={(e) => ((e.currentTarget as HTMLButtonElement).style.opacity = '1')}
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}
