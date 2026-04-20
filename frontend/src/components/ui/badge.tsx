import * as React from 'react'

import { cn } from '@/lib/utils'

export type BadgeVariant =
  | 'default'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'outline'
  | 'pill'

/** Shared base layout + typography  -  no colors here. */
const BASE: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 'var(--text-xs)',
  fontWeight: 500,
  letterSpacing: 'var(--tracking-widest)',
  textTransform: 'uppercase',
  borderRadius: 'var(--radius-full)',
  padding: '2px 8px',
  gap: 'var(--space-1)',
}

/** Per-variant color + border overrides  -  all via CSS tokens. */
const VARIANTS: Record<BadgeVariant, React.CSSProperties> = {
  /** Accent-colored badge (Explorer = amber, Studio = blue via --accent token). */
  default: {
    background: 'var(--accent-glow)',
    color: 'var(--accent)',
    border: '1px solid color-mix(in srgb, var(--accent) 30%, transparent)',
  },
  /** Neutral/informational badge. */
  secondary: {
    background: 'var(--color-neutral-muted)',
    color: 'var(--color-neutral)',
    border: '1px solid color-mix(in srgb, var(--color-neutral) 30%, transparent)',
  },
  /** Positive / growth state. */
  success: {
    background: 'var(--color-up-muted)',
    color: 'var(--color-up)',
    border: '1px solid color-mix(in srgb, var(--color-up) 30%, transparent)',
  },
  /** Warning / estimated data state. */
  warning: {
    background: 'var(--color-warn-muted)',
    color: 'var(--color-warn)',
    border: '1px solid color-mix(in srgb, var(--color-warn) 30%, transparent)',
  },
  /** Negative / drop state. */
  danger: {
    background: 'var(--color-down-muted)',
    color: 'var(--color-down)',
    border: '1px solid color-mix(in srgb, var(--color-down) 30%, transparent)',
  },
  /** Ghost badge  -  transparent background, subtle border. */
  outline: {
    background: 'transparent',
    color: 'var(--color-text-secondary)',
    border: '1px solid var(--color-border-base)',
  },
  /**
   * Active pill  -  used for chart time-range selectors and filter groups.
   * Not uppercase; tracking is normal so short labels like "28D" read cleanly.
   */
  pill: {
    background: 'var(--color-surface-3)',
    color: 'var(--color-text-primary)',
    border: '1px solid var(--color-border-strong)',
    letterSpacing: 'var(--tracking-normal)',
    textTransform: 'none',
    padding: '3px 10px',
  },
}

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: BadgeVariant
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = 'default', style, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('inline-flex items-center', className)}
      style={{ ...BASE, ...VARIANTS[variant], ...style }}
      {...props}
    />
  )
)
Badge.displayName = 'Badge'

export { Badge }
