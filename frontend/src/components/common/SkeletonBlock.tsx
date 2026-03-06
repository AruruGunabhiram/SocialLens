import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

interface SkeletonBlockProps {
  /** Number of text-line skeletons to render. Default: 3. */
  lines?: number
  /** Width of the last line (shorter = more natural). Default: "60%". */
  lastLineWidth?: string
  className?: string
}

/**
 * Convenience wrapper for a block of text-line skeletons.
 * For single shapes use <Skeleton> directly.
 */
export function SkeletonBlock({ lines = 3, lastLineWidth = '60%', className }: SkeletonBlockProps) {
  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          shape="text"
          style={{ width: i === lines - 1 ? lastLineWidth : '100%' }}
        />
      ))}
    </div>
  )
}
