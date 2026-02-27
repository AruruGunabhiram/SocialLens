import { axiosClient } from '@/api/axiosClient'
import { endpoints } from '@/api/endpoints'
import { normalizeHttpError } from '@/api/httpError'
import { TimeSeriesResponseSchema } from '@/api/schemas'
import type { TimeSeriesResponse } from '@/api/types'

export type TrendMetric = 'VIEWS' | 'SUBSCRIBERS' | 'UPLOADS'

export async function fetchTimeSeries(
  channelDbId: number,
  metric: TrendMetric,
  rangeDays: number,
): Promise<TimeSeriesResponse> {
  try {
    const { data } = await axiosClient.get(endpoints.analytics.timeseriesById, {
      params: { channelDbId, metric, rangeDays },
    })
    return TimeSeriesResponseSchema.parse(data)
  } catch (error) {
    throw normalizeHttpError(error)
  }
}
