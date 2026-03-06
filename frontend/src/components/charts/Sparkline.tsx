import { useId, useMemo } from 'react'

import { cn } from '@/lib/utils'

export interface SparklineProps {
  /** Array of numeric data points (30–60 values recommended). */
  data: number[]
  /** SVG height in px. Default: 40. */
  height?: number
  className?: string
}

/**
 * Minimal SVG sparkline.
 * Stroke: var(--accent) @ 60% opacity, stroke-width 1.5px (non-scaling).
 * Fill: gradient from accent @ 20% → transparent.
 * No axes, no labels — data-ink only.
 */
export function Sparkline({ data, height = 40, className }: SparklineProps) {
  const uid = useId()
  const gradId = `sparkline-fill-${uid.replace(/:/g, '')}`

  const paths = useMemo(() => {
    if (data.length < 2) return null

    const min = Math.min(...data)
    const max = Math.max(...data)
    const range = max - min || 1
    const W = 100 // viewBox logical width
    const pad = 2 // vertical padding (logical units)

    const pts = data.map((v, i) => {
      const x = (i / (data.length - 1)) * W
      const y = pad + (1 - (v - min) / range) * (height - 2 * pad)
      return [x, y] as [number, number]
    })

    const line = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x} ${y}`).join(' ')
    const fill = line + ` L${pts[pts.length - 1][0]} ${height} L${pts[0][0]} ${height} Z`

    return { line, fill }
  }, [data, height])

  if (!paths) return null

  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 100 ${height}`}
      preserveAspectRatio="none"
      aria-hidden
      className={cn('overflow-visible', className)}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.20" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={paths.fill} fill={`url(#${gradId})`} />
      <path
        d={paths.line}
        fill="none"
        stroke="var(--accent)"
        strokeOpacity="0.6"
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}
