import * as React from 'react'

import { cn } from '@/lib/utils'

export type SkeletonShape = 'block' | 'text' | 'circle'

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Visual shape:
   *  block   -  rectangle (cards, chart areas, image placeholders)
   *  text    -  thin strip (text lines, label placeholders)
   *  circle  -  disk (avatars, icon placeholders; size via className, e.g. "h-10 w-10")
   */
  shape?: SkeletonShape
}

/**
 * Per-shape border-radius overrides.
 * Width / height are left to the consumer via className or style prop.
 * The `.skeleton` CSS class (animations.css) supplies the shimmer animation
 * and token-based gradient  -  no hardcoded colors here.
 */
const SHAPE_STYLE: Record<SkeletonShape, React.CSSProperties> = {
  block: { borderRadius: 'var(--radius-sm)' },
  text: { height: '12px', borderRadius: 'var(--radius-full)' },
  circle: { borderRadius: '50%' },
}

function Skeleton({ shape = 'block', className, style, ...props }: SkeletonProps) {
  return (
    <div
      aria-hidden
      className={cn('skeleton', className)}
      style={{ ...SHAPE_STYLE[shape], ...style }}
      {...props}
    />
  )
}
Skeleton.displayName = 'Skeleton'

export { Skeleton }
