import { useQuery } from '@tanstack/react-query'

import { fetchTimeSeries, type TrendMetric } from './api'
import type { AppError } from '@/api/httpError'
import type { TimeSeriesResponse } from '@/api/types'
import { useDemoMode } from '@/lib/DemoModeContext'
import { getDemoTimeSeries } from '@/data/demoData'

export const timeseriesQueryKeys = {
  timeseries: (channelDbId: number, metric: TrendMetric, rangeDays: number) =>
    ['timeseries', channelDbId, metric, rangeDays] as const,
}

export function useTimeSeries(
  channelDbId: number | undefined,
  metric: TrendMetric,
  rangeDays: number
) {
  const { isDemoMode } = useDemoMode()
  return useQuery<TimeSeriesResponse, AppError>({
    queryKey: isDemoMode
      ? ['demo', 'timeseries', channelDbId, metric, rangeDays]
      : timeseriesQueryKeys.timeseries(channelDbId ?? -1, metric, rangeDays),
    queryFn: isDemoMode && channelDbId != null
      ? () => Promise.resolve(getDemoTimeSeries(channelDbId, metric, rangeDays))
      : () => fetchTimeSeries(channelDbId!, metric, rangeDays),
    enabled: isDemoMode ? channelDbId != null : Boolean(channelDbId),
    staleTime: 2 * 60 * 1000,
  })
}
