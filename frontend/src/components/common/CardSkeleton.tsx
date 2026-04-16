import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface CardSkeletonProps {
  className?: string
}

/** Animated skeleton for a stat card (label + value). */
export function CardSkeleton({ className }: CardSkeletonProps) {
  return (
    <Card className={cn('h-full', className)}>
      <CardHeader className="pb-2">
        <Skeleton shape="text" className="w-24" />
      </CardHeader>
      <CardContent className="space-y-2">
        <Skeleton shape="block" className="h-8 w-28" />
        <Skeleton shape="text" className="w-16" />
      </CardContent>
    </Card>
  )
}
