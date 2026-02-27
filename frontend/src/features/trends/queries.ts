import { useQuery } from '@tanstack/react-query'

import { fetchTimeSeries, type TrendMetric } from './api'
import type { AppError } from '@/api/httpError'
import type { TimeSeriesResponse } from '@/api/types'

export const timeseriesQueryKeys = {
  timeseries: (channelDbId: number, metric: TrendMetric, rangeDays: number) =>
    ['timeseries', channelDbId, metric, rangeDays] as const,
}

export function useTimeSeries(
  channelDbId: number | undefined,
  metric: TrendMetric,
  rangeDays: number,
) {
  return useQuery<TimeSeriesResponse, AppError>({
    queryKey: timeseriesQueryKeys.timeseries(channelDbId ?? -1, metric, rangeDays),
    queryFn: () => fetchTimeSeries(channelDbId!, metric, rangeDays),
    enabled: Boolean(channelDbId),
    staleTime: 2 * 60 * 1000,
  })
}
