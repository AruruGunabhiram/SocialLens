import { axiosClient } from '@/api/axiosClient'
import { endpoints } from '@/api/endpoints'
import { normalizeHttpError } from '@/api/httpError'
import { TimeSeriesResponseSchema } from '@/api/schemas'
import type { TimeSeriesResponse } from '@/api/types'

export type TrendMetric = 'VIEWS' | 'SUBSCRIBERS' | 'UPLOADS'

export async function fetchTimeSeries(
  channelDbId: number,
  metric: TrendMetric,
  rangeDays: number
): Promise<TimeSeriesResponse> {
  try {
    const { data } = await axiosClient.get(endpoints.analytics.timeseriesById, {
      params: { channelDbId, metric, rangeDays },
    })

    // Defensive metric-field mapping: if the backend sends per-metric fields
    // (e.g. { views, subscribers, uploads }) instead of the unified `value`
    // field, extract the right one so Zod validation succeeds.
    const metricFieldMap: Record<TrendMetric, string> = {
      VIEWS: 'views',
      SUBSCRIBERS: 'subscribers',
      UPLOADS: 'uploads',
    }
    const fieldName = metricFieldMap[metric]
    const rawPoints = Array.isArray(data?.points) ? (data.points as Record<string, unknown>[]) : []
    const mappedPoints = rawPoints.map((pt) => {
      if (typeof pt.value === 'number') return pt
      const extracted = pt[fieldName]
      return typeof extracted === 'number' ? { ...pt, value: extracted } : pt
    })
    const parsed = TimeSeriesResponseSchema.parse({ ...data, points: mappedPoints })

    // Guarantee ascending order by date (backend sorts, but be defensive)
    const points = [...parsed.points].sort((a, b) => a.date.localeCompare(b.date))

    return { ...parsed, points }
  } catch (error) {
    throw normalizeHttpError(error)
  }
}
