import { axiosClient } from '@/api/axiosClient'
import { endpoints } from '@/api/endpoints'
import { normalizeHttpError } from '@/api/httpError'
import { RetentionDiagnosisResponseSchema } from '@/api/schemas'
import type { RetentionDiagnosisResponse } from '@/api/types'

export type RetentionDiagnosisRequest = {
  userId: number
  videoId: string
  startDate?: string // YYYY-MM-DD  -  defaults to 28 days ago on backend
  endDate?: string // YYYY-MM-DD  -  defaults to today on backend
}

export async function fetchRetentionDiagnosis(
  req: RetentionDiagnosisRequest
): Promise<RetentionDiagnosisResponse> {
  try {
    const { data } = await axiosClient.post(endpoints.creator.retentionDiagnosis, req)
    return RetentionDiagnosisResponseSchema.parse(data)
  } catch (error) {
    throw normalizeHttpError(error)
  }
}
