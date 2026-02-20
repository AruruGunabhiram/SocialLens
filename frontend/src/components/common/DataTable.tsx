import { ReactNode } from 'react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

type Column<T> = {
  header: string
  accessor: (row: T) => ReactNode
  className?: string
}

type DataTableProps<T> = {
  title?: string
  columns: Column<T>[]
  data: T[]
  emptyMessage?: string
  className?: string
}

export function DataTable<T>({
  title,
  columns,
  data,
  emptyMessage = 'No data available',
  className,
}: DataTableProps<T>) {
  return (
    <Card className={cn(className)}>
      {title && (
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent>
        {data.length === 0 ? (
          <div className="text-sm text-muted-foreground">{emptyMessage}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[320px] text-left text-sm">
              <thead className="text-muted-foreground">
                <tr>
                  {columns.map((column) => (
                    <th key={column.header} className="pb-2 pr-4 font-medium">
                      {column.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.map((row, rowIdx) => (
                  <tr key={rowIdx} className="align-middle">
                    {columns.map((column) => (
                      <td
                        key={column.header}
                        className={cn('py-2 pr-4 text-foreground', column.className)}
                      >
                        {column.accessor(row)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
