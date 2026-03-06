import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RangePillOption {
  label: string
  value: string
}

/** Convenience preset — most charts use this exact set. */
export const DEFAULT_RANGE_OPTIONS: RangePillOption[] = [
  { label: '7D', value: '7' },
  { label: '28D', value: '28' },
  { label: '90D', value: '90' },
  { label: '1Y', value: '365' },
  { label: 'All', value: 'all' },
]

export interface RangePillsProps {
  options?: RangePillOption[]
  value: string
  onChange: (value: string) => void
  className?: string
}

// ---------------------------------------------------------------------------
// RangePills
// ---------------------------------------------------------------------------

/**
 * Time-range pill selector for chart card headers — spec §5.6.
 *
 * Active pill:   surface-3 background + border-strong
 * Inactive pill: transparent + text-muted; hover → surface-1 + text-secondary
 * Font: DM Mono 500, --text-xs, not uppercase (short labels like "28D" read cleanly)
 */
export function RangePills({
  options = DEFAULT_RANGE_OPTIONS,
  value,
  onChange,
  className,
}: RangePillsProps) {
  return (
    <div
      role="group"
      aria-label="Time range"
      className={cn('flex items-center', className)}
      style={{ gap: 'var(--space-1)' }}
    >
      {options.map((opt) => {
        const active = opt.value === value
        return (
          <RangePill
            key={opt.value}
            label={opt.label}
            active={active}
            onClick={() => onChange(opt.value)}
          />
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Individual pill (split out to avoid stale-closure issues with hover state)
// ---------------------------------------------------------------------------

interface RangePillProps {
  label: string
  active: boolean
  onClick: () => void
}

function RangePill({ label, active, onClick }: RangePillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 'var(--text-xs)',
        fontWeight: 500,
        letterSpacing: 'var(--tracking-normal)',
        padding: '3px 10px',
        borderRadius: 'var(--radius-full)',
        border: active ? '1px solid var(--color-border-strong)' : '1px solid transparent',
        background: active ? 'var(--color-surface-3)' : 'transparent',
        color: active ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
        cursor: 'pointer',
        transition: [
          'background var(--duration-base) var(--ease-standard)',
          'color var(--duration-base) var(--ease-standard)',
          'border-color var(--duration-base) var(--ease-standard)',
        ].join(', '),
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.color = 'var(--color-text-secondary)'
          e.currentTarget.style.background = 'var(--color-surface-1)'
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.color = 'var(--color-text-muted)'
          e.currentTarget.style.background = 'transparent'
        }
      }}
      onFocus={(e) => {
        e.currentTarget.style.outline = '2px solid var(--color-blue-500)'
        e.currentTarget.style.outlineOffset = '2px'
      }}
      onBlur={(e) => {
        e.currentTarget.style.outline = 'none'
      }}
    >
      {label}
    </button>
  )
}
