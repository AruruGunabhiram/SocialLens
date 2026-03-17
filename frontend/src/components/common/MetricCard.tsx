import { ArrowDown, ArrowUp, Minus } from 'lucide-react'

import { Sparkline } from '@/components/charts/Sparkline'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MetricCardProps {
  /** UPPERCASE label shown above the value. */
  label: string
  /** Formatted primary value string, e.g. "2.4M" or "12,345". */
  value?: string
  /** Secondary context line below the delta, e.g. "last 30 days". */
  sublabel?: string
  /**
   * Delta as a decimal percentage.
   * Positive = up (green), negative = down (red), 0 / undefined = flat (neutral).
   * Example: 0.124 → "+12.4%"
   */
  delta?: number
  /** Label appended after the delta badge, e.g. "vs last 30d". */
  deltaLabel?: string
  /** 30–60 data points for the sparkline. Omit to hide sparkline. */
  sparklineData?: number[]
  /** Show shimmer skeleton instead of content. */
  loading?: boolean
  /**
   * Locked Studio-only metric: value is blurred with a lock overlay.
   * Pass a fake plausible `value` to render behind the blur.
   */
  locked?: boolean
  className?: string
}

// ---------------------------------------------------------------------------
// Delta badge
// ---------------------------------------------------------------------------

interface DeltaBadgeProps {
  delta: number
}

function DeltaBadge({ delta }: DeltaBadgeProps) {
  const isUp = delta > 0
  const isDown = delta < 0
  const formatted = `${isUp ? '+' : ''}${(delta * 100).toFixed(1)}%`

  const bg = isUp
    ? 'var(--color-up-muted)'
    : isDown
      ? 'var(--color-down-muted)'
      : 'var(--color-neutral-muted)'

  const color = isUp ? 'var(--color-up)' : isDown ? 'var(--color-down)' : 'var(--color-neutral)'

  const Icon = isUp ? ArrowUp : isDown ? ArrowDown : Minus

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '2px',
        padding: '2px 6px',
        borderRadius: 'var(--radius-sm)',
        background: bg,
        color,
        fontFamily: 'var(--font-mono)',
        fontSize: 'var(--text-xs)',
        fontWeight: 500,
        letterSpacing: 'var(--tracking-normal)',
        fontVariantNumeric: 'tabular-nums',
        lineHeight: 1,
      }}
    >
      <Icon size={10} strokeWidth={2.5} aria-hidden />
      {formatted}
    </span>
  )
}

// ---------------------------------------------------------------------------
// MetricCard
// ---------------------------------------------------------------------------

/**
 * KPI MetricCard — spec §5.5.
 *
 * Token-first: all colors via CSS variables, no hardcoded hex.
 * Numbers use DM Mono + tabular-nums.
 * Supports: loading skeleton, locked blur overlay, optional sparkline.
 */
export function MetricCard({
  label,
  value,
  sublabel,
  delta,
  deltaLabel,
  sparklineData,
  loading = false,
  locked = false,
  className,
}: MetricCardProps) {
  const showDelta = delta !== undefined
  const showSparkline = Boolean(sparklineData && sparklineData.length >= 2)

  return (
    <article
      aria-busy={loading}
      aria-label={label}
      className={cn('transition-card', className)}
      style={{
        position: 'relative',
        padding: 'var(--card-padding)',
        background: 'var(--color-surface-0)',
        border: '1px solid var(--color-border-base)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-sm)',
        overflow: 'hidden',
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLElement
        el.style.background = 'var(--color-surface-1)'
        el.style.borderColor = 'var(--color-border-strong)'
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLElement
        el.style.background = 'var(--color-surface-0)'
        el.style.borderColor = 'var(--color-border-base)'
      }}
    >
      {/* ---- Label row ---- */}
      <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-3)' }}>
        {loading ? (
          <Skeleton shape="text" style={{ width: '80px' }} />
        ) : (
          <span
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-xs)',
              fontWeight: 500,
              letterSpacing: 'var(--tracking-widest)',
              textTransform: 'uppercase',
              color: 'var(--color-text-muted)',
            }}
          >
            {label}
          </span>
        )}
      </div>

      {/* ---- Primary value ---- */}
      <div style={{ marginBottom: 'var(--space-2)' }}>
        {loading ? (
          <Skeleton shape="block" style={{ width: '120px', height: '32px' }} />
        ) : (
          <span
            className={locked ? 'metric-value-locked' : undefined}
            style={{
              display: 'block',
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-metric-md)',
              fontWeight: 500,
              color: 'var(--color-text-primary)',
              lineHeight: 'var(--leading-tight)',
              fontVariantNumeric: 'tabular-nums',
              ...(locked
                ? { filter: 'blur(8px)', opacity: 0.4, userSelect: 'none', pointerEvents: 'none' }
                : {}),
            }}
          >
            {value ?? '--'}
          </span>
        )}
      </div>

      {/* ---- Delta row ---- */}
      {(showDelta || loading) && (
        <div
          className="flex items-center gap-2"
          style={{ marginBottom: sublabel || showSparkline ? 'var(--space-3)' : 0 }}
        >
          {loading ? (
            <Skeleton shape="text" style={{ width: '60px', height: '16px' }} />
          ) : (
            <>
              {showDelta && delta !== undefined && <DeltaBadge delta={delta} />}
              {deltaLabel && (
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 'var(--text-sm)',
                    color: 'var(--color-text-secondary)',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {deltaLabel}
                </span>
              )}
            </>
          )}
        </div>
      )}

      {/* ---- Sublabel ---- */}
      {sublabel && !loading && (
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-xs)',
            color: 'var(--color-text-muted)',
            marginBottom: showSparkline ? 'var(--space-3)' : 0,
          }}
        >
          {sublabel}
        </p>
      )}

      {/* ---- Sparkline ---- */}
      {showSparkline && !loading && sparklineData && (
        <div style={{ height: '40px' }}>
          <Sparkline data={sparklineData} height={40} />
        </div>
      )}
      {loading && (
        <Skeleton
          shape="block"
          style={{ width: '100%', height: '40px', marginTop: 'var(--space-3)' }}
        />
      )}

      {/* ---- Locked overlay ---- */}
      {locked && !loading && (
        <>
          {/* gradient fade */}
          <div
            aria-hidden
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(to bottom, transparent 30%, var(--color-surface-0))',
              pointerEvents: 'none',
            }}
          />
          {/* lock message */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--space-1)',
            }}
          >
            <LockIcon />
            <span
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 'var(--text-xs)',
                fontWeight: 500,
                color: 'var(--color-text-secondary)',
                letterSpacing: 'var(--tracking-wide)',
                textTransform: 'uppercase',
              }}
            >
              Owner-only metric
            </span>
          </div>
        </>
      )}
    </article>
  )
}

// ---------------------------------------------------------------------------
// Inline lock SVG (avoids extra Lucide import at this size)
// ---------------------------------------------------------------------------

function LockIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--color-text-muted)"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}
