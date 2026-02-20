import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

type SkeletonBlockProps = {
  lines?: number
  className?: string
}

export function SkeletonBlock({ lines = 3, className }: SkeletonBlockProps) {
  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton key={index} className="h-4 w-full" />
      ))}
    </div>
  )
}
