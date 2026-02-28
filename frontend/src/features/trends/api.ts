import { ZodError } from 'zod'

import { axiosClient } from '@/api/axiosClient'
import { endpoints } from '@/api/endpoints'
import { normalizeHttpError } from '@/api/httpError'
import { TimeSeriesResponseSchema } from '@/api/schemas'
import type { AppError } from '@/api/httpError'
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

    // Backend already extracts the requested metric into a unified `value` field.
    // Parse against the stable contract: { channelDbId, channelId, metric, rangeDays, points: [{date, value}] }
    const parsed = TimeSeriesResponseSchema.parse(data)

    // Guarantee ascending order by date (backend sorts, but be defensive)
    const points = [...parsed.points].sort((a, b) => a.date.localeCompare(b.date))

    return { ...parsed, points }
  } catch (error) {
    if (error instanceof ZodError) {
      throw {
        message: 'Unsupported response format',
        code: 'PARSE_ERROR',
        details: error.issues[0]?.message ?? 'unexpected shape',
      } satisfies AppError
    }
    throw normalizeHttpError(error)
  }
}
