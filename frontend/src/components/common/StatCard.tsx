import { ReactNode } from 'react'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

type StatCardProps = {
  label: string
  value: ReactNode
  description?: string
  icon?: ReactNode
  loading?: boolean
  className?: string
}

export function StatCard({ label, value, description, icon, loading, className }: StatCardProps) {
  return (
    <Card className={cn('h-full', className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardDescription className="flex items-center gap-2">
          {icon}
          <span>{label}</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-1">
        {loading ? (
          <Skeleton className="h-8 w-28" />
        ) : (
          <CardTitle className="text-3xl font-bold leading-tight">{value}</CardTitle>
        )}
        {description && (
          <p className="text-sm text-muted-foreground" aria-label={`${label}-description`}>
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
