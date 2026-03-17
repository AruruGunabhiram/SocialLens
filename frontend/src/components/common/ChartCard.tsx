import { ReactNode } from 'react'

import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Recharts style constants — derived from design tokens.
// Spread these into Recharts props so every chart shares consistent styling.
//
// Example:
//   <CartesianGrid {...CHART_STYLES.grid} vertical={false} />
//   <XAxis tick={CHART_STYLES.axisTick} ... />
//   <Tooltip {...CHART_STYLES.tooltip} />
// ---------------------------------------------------------------------------

export const CHART_STYLES = {
  /** CartesianGrid props */
  grid: {
    stroke: 'var(--color-border-subtle)',
    strokeDasharray: '3 3',
  },
  /** tick object for XAxis / YAxis */
  axisTick: {
    fontFamily: 'var(--font-mono)',
    fontSize: 11, // --text-xs = 11px
    fill: 'var(--color-text-muted)',
  },
  /** Tooltip component props */
  tooltip: {
    contentStyle: {
      background: 'var(--color-surface-3)',
      border: '1px solid var(--color-border-strong)',
      borderRadius: 'var(--radius-md)',
      boxShadow: 'var(--shadow-lg)',
      fontFamily: 'var(--font-mono)',
      fontSize: '11px',
      color: 'var(--color-text-primary)',
      padding: '8px 12px',
    },
    labelStyle: {
      color: 'var(--color-text-muted)',
      fontSize: '11px',
      marginBottom: '4px',
    },
    cursor: {
      stroke: 'var(--color-border-strong)',
      strokeDasharray: '4 2',
      strokeWidth: 1,
    },
  },
} as const

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ChartCardProps {
  title: string
  /** Subtitle below the title. Alias: `description` (kept for backward compat). */
  subtitle?: string
  /** @deprecated Use `subtitle`. */
  description?: string
  /** Right-side header slot (e.g. <RangePills>). Alias: `action` (backward compat). */
  controls?: ReactNode
  /** @deprecated Use `controls`. */
  action?: ReactNode
  /**
   * Data window label rendered bottom-left.
   * E.g. "Showing data for: Mar 1 – Apr 30, 2025"
   */
  dataWindow?: string
  /** Trust badges / data-source attribution — bottom-right. */
  footer?: ReactNode
  /**
   * Height of the chart area in px (or any CSS string like "100%").
   * Default: 320. Pass `"auto"` to let children determine height.
   */
  chartHeight?: number | string
  children: ReactNode
  className?: string
}

// ---------------------------------------------------------------------------
// ChartCard
// ---------------------------------------------------------------------------

/**
 * Standard chart card wrapper — spec §5.6.
 *
 * Layout:
 *   ┌──────────────────────────────────────────────────────┐
 *   │  Title                         [controls slot]       │
 *   │  Subtitle                                            │
 *   │──────────────────────────────────────────────────────│
 *   │  [children / chart area]                             │
 *   │──────────────────────────────────────────────────────│
 *   │  dataWindow label              [footer slot]         │
 *   └──────────────────────────────────────────────────────┘
 *
 * Token-first: all colors / typography via CSS variables.
 * Backward-compatible: `description` = `subtitle`, `action` = `controls`.
 */
export function ChartCard({
  title,
  subtitle,
  description,
  controls,
  action,
  dataWindow,
  footer,
  chartHeight = 320,
  children,
  className,
}: ChartCardProps) {
  const resolvedSubtitle = subtitle ?? description
  const resolvedControls = controls ?? action
  const hasFooter = Boolean(dataWindow || footer)

  return (
    <div
      className={cn('transition-card', className)}
      style={{
        background: 'var(--color-surface-0)',
        border: '1px solid var(--color-border-base)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-sm)',
        overflow: 'hidden',
      }}
    >
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div
        className="flex items-start justify-between"
        style={{ padding: 'var(--card-padding) var(--card-padding) var(--space-4)' }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'var(--text-lg)',
              fontWeight: 600,
              color: 'var(--color-text-primary)',
              letterSpacing: 'var(--tracking-tight)',
              lineHeight: 'var(--leading-tight)',
              marginBottom: resolvedSubtitle ? 'var(--space-1)' : 0,
            }}
          >
            {title}
          </h3>
          {resolvedSubtitle && (
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 'var(--text-sm)',
                color: 'var(--color-text-secondary)',
                lineHeight: 'var(--leading-normal)',
              }}
            >
              {resolvedSubtitle}
            </p>
          )}
        </div>

        {resolvedControls && (
          <div style={{ flexShrink: 0, marginLeft: 'var(--space-4)' }}>{resolvedControls}</div>
        )}
      </div>

      {/* ── Header / chart divider ─────────────────────────────────────── */}
      <div
        aria-hidden
        style={{
          height: '1px',
          background: 'var(--color-border-subtle)',
          margin: '0 var(--card-padding)',
        }}
      />

      {/* ── Chart area ─────────────────────────────────────────────────── */}
      <div
        style={{
          height: chartHeight === 'auto' ? undefined : chartHeight,
          padding: 'var(--space-5) var(--card-padding)',
        }}
      >
        {children}
      </div>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      {hasFooter && (
        <>
          <div
            aria-hidden
            style={{
              height: '1px',
              background: 'var(--color-border-subtle)',
              margin: '0 var(--card-padding)',
            }}
          />
          <div
            className="flex items-center justify-between"
            style={{ padding: 'var(--space-3) var(--card-padding)' }}
          >
            {dataWindow ? (
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 'var(--text-xs)',
                  color: 'var(--color-text-muted)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {dataWindow}
              </span>
            ) : (
              <span />
            )}
            {footer && <div className="flex items-center gap-2">{footer}</div>}
          </div>
        </>
      )}
    </div>
  )
}
