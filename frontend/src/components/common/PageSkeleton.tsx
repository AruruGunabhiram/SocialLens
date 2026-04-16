import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { CardSkeleton } from './CardSkeleton'

interface PageSkeletonProps {
  /** Number of stat card skeletons to show in the header row. Default: 3. */
  statCards?: number
  /** Show a chart area skeleton. Default: true. */
  showChart?: boolean
  /** Number of table row skeletons. Default: 5. */
  tableRows?: number
}

/**
 * Full-page skeleton for initial page load.
 * Header title bar → stat cards → chart area → table rows.
 */
export function PageSkeleton({
  statCards = 3,
  showChart = true,
  tableRows = 5,
}: PageSkeletonProps) {
  return (
    <div className="space-y-6" aria-busy aria-label="Loading page">
      {/* Title bar */}
      <div className="space-y-2">
        <Skeleton shape="block" className="h-7 w-48" />
        <Skeleton shape="text" className="w-64" />
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: statCards }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>

      {/* Chart area */}
      {showChart && <Skeleton shape="block" style={{ height: 320, width: '100%' }} />}

      {/* Table */}
      <Card>
        <CardHeader className="pb-2">
          <Skeleton shape="text" className="w-32" />
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full">
            <tbody className="divide-y divide-border">
              {Array.from({ length: tableRows }).map((_, ri) => (
                <tr key={ri}>
                  {[56, 160, 80, 48, 48].map((w, ci) => (
                    <td key={ci} className="py-3 px-4">
                      <Skeleton shape="text" style={{ width: w }} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
