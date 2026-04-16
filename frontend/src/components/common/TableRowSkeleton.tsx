import { Skeleton } from '@/components/ui/skeleton'

interface TableRowSkeletonProps {
  rows?: number
  cols?: number
}

/**
 * Skeleton table rows. Render inside a `<tbody>`.
 * cols ≤ 2 use narrower widths; cols ≥ 3 cycle through a width set.
 */
export function TableRowSkeleton({ rows = 5, cols = 4 }: TableRowSkeletonProps) {
  const widths = ['w-32', 'w-20', 'w-16', 'w-12', 'w-10', 'w-14']

  return (
    <>
      {Array.from({ length: rows }).map((_, ri) => (
        <tr key={ri}>
          {Array.from({ length: cols }).map((_, ci) => (
            <td key={ci} className="py-2 px-4">
              <Skeleton shape="text" className={widths[ci % widths.length]} />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}
