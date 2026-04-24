import { AlertTriangle, CheckCircle2, Info } from 'lucide-react'

export interface DataCoverageBarProps {
  capturedDays: number
  targetDays?: number
  lastUpdated?: string | null
  isFailed?: boolean
  /** 'full' renders label + bar + message. 'mini' renders only the bar strip. */
  variant?: 'full' | 'mini'
}

function fillColor(capturedDays: number, targetDays: number, isFailed: boolean): string {
  if (isFailed) return 'var(--color-down)'
  if (capturedDays >= targetDays) return 'var(--color-up)'
  if (capturedDays >= 15) return 'var(--chart-1)'
  if (capturedDays >= 8) return 'var(--color-amber-400)'
  return 'var(--color-warn)'
}

type MsgType = 'warn' | 'success' | 'info'

function coverageMessage(
  capturedDays: number,
  targetDays: number,
  isFailed: boolean
): { type: MsgType; text: string } {
  if (isFailed) {
    return {
      type: 'warn',
      text: `Sync failed — data frozen at ${capturedDays} day${capturedDays !== 1 ? 's' : ''}. Retry sync to continue building coverage.`,
    }
  }
  if (capturedDays >= targetDays) {
    return {
      type: 'success',
      text: `Full ${targetDays}-day coverage — trends are reliable`,
    }
  }
  if (capturedDays >= 15) {
    return { type: 'info', text: 'Good data coverage' }
  }
  if (capturedDays >= 7) {
    return {
      type: 'info',
      text: 'Building confidence — keep tracking for better trends',
    }
  }
  return {
    type: 'warn',
    text: `Limited data — trends may not be reliable yet. SocialLens needs ~${targetDays} days of snapshots for confident analysis.`,
  }
}

const MSG_ICON: Record<MsgType, React.ReactNode> = {
  warn: (
    <AlertTriangle
      size={12}
      aria-hidden
      style={{ color: 'var(--color-warn)', flexShrink: 0, marginTop: 1 }}
    />
  ),
  success: (
    <CheckCircle2
      size={12}
      aria-hidden
      style={{ color: 'var(--color-up)', flexShrink: 0, marginTop: 1 }}
    />
  ),
  info: (
    <Info
      size={12}
      aria-hidden
      style={{ color: 'var(--color-text-muted)', flexShrink: 0, marginTop: 1 }}
    />
  ),
}

const MSG_COLOR: Record<MsgType, string> = {
  warn: 'var(--color-warn)',
  success: 'var(--color-up)',
  info: 'var(--color-text-secondary)',
}

export function DataCoverageBar({
  capturedDays,
  targetDays = 30,
  isFailed = false,
  variant = 'full',
}: DataCoverageBarProps) {
  const safeDays = Math.max(0, capturedDays)
  const pct = Math.min(100, (safeDays / targetDays) * 100)
  const color = fillColor(safeDays, targetDays, isFailed)

  if (variant === 'mini') {
    return (
      <div
        role="progressbar"
        aria-valuenow={safeDays}
        aria-valuemin={0}
        aria-valuemax={targetDays}
        aria-label={`Data coverage: ${safeDays} of ${targetDays} days`}
        style={{
          height: 4,
          borderRadius: 'var(--radius-full)',
          background: 'var(--color-surface-2)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            background: color,
            borderRadius: 'var(--radius-full)',
            transition: 'width 0.4s ease',
          }}
        />
      </div>
    )
  }

  const { type, text } = coverageMessage(safeDays, targetDays, isFailed)

  return (
    <div className="space-y-2">
      {/* Label row */}
      <div className="flex items-center justify-between gap-2">
        <span
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-sm)',
            fontWeight: 500,
            color: 'var(--color-text-secondary)',
          }}
        >
          Data Coverage
        </span>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontVariantNumeric: 'tabular-nums',
            fontSize: 'var(--text-sm)',
            color: 'var(--color-text-secondary)',
          }}
        >
          {safeDays} / {targetDays} days
        </span>
      </div>

      {/* Bar */}
      <div
        role="progressbar"
        aria-valuenow={safeDays}
        aria-valuemin={0}
        aria-valuemax={targetDays}
        aria-label={`Data coverage: ${safeDays} of ${targetDays} days`}
        style={{
          height: 6,
          borderRadius: 'var(--radius-full)',
          background: 'var(--color-surface-2)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            minWidth: safeDays > 0 ? 6 : 0,
            background: color,
            borderRadius: 'var(--radius-full)',
            transition: 'width 0.4s ease',
          }}
        />
      </div>

      {/* Message */}
      <div className="flex items-start gap-1.5">
        {MSG_ICON[type]}
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-xs)',
            color: MSG_COLOR[type],
            lineHeight: 'var(--leading-relaxed)',
          }}
        >
          {text}
        </p>
      </div>
    </div>
  )
}
