import { axiosClient } from '@/api/axiosClient'
import { endpoints } from '@/api/endpoints'
import { RetentionDiagnosisResponseSchema } from '@/api/schemas'
import type { RetentionDiagnosisResponse } from '@/api/types'

export type { RetentionDiagnosisResponse }

export interface RetentionDiagnosisRequest {
  userId: number
  channelId: string
  videoId: string
  startDate?: string // YYYY-MM-DD
  endDate?: string // YYYY-MM-DD
}

export async function diagnoseRetention(
  req: RetentionDiagnosisRequest
): Promise<RetentionDiagnosisResponse> {
  const { data } = await axiosClient.post(endpoints.creator.retentionDiagnosis, req)
  return RetentionDiagnosisResponseSchema.parse(data)
}

/**
 * Extract an 11-character YouTube video ID from a URL or bare ID.
 * Returns null if the input cannot be resolved.
 */
export function extractVideoId(input: string): string | null {
  const trimmed = input.trim()
  // youtu.be/VIDEO_ID
  const shortMatch = trimmed.match(/youtu\.be\/([A-Za-z0-9_-]{11})/)
  if (shortMatch) return shortMatch[1]
  // youtube.com/watch?v=VIDEO_ID or shorts/VIDEO_ID or embed/VIDEO_ID
  const longMatch = trimmed.match(/(?:[?&/]v=|\/(?:shorts|embed)\/)([A-Za-z0-9_-]{11})/)
  if (longMatch) return longMatch[1]
  // bare 11-char ID
  if (/^[A-Za-z0-9_-]{11}$/.test(trimmed)) return trimmed
  return null
}
