import { axiosClient } from '@/api/axiosClient'
import { endpoints } from '@/api/endpoints'
import { normalizeHttpError } from '@/api/httpError'
import { AccountStatusSchema, OAuthStartResponseSchema } from '@/api/schemas'
import type { AccountStatus } from '@/api/types'

/**
 * MVP: The backend requires an explicit userId because there is no auth
 * middleware yet. All requests use userId=1 until a real auth layer exists.
 */
export const MVP_USER_ID = 1

export async function fetchAccountStatus(
  userId: number,
  platform: 'YOUTUBE'
): Promise<AccountStatus> {
  try {
    const { data } = await axiosClient.get(endpoints.account.status, {
      params: { userId, platform },
    })
    return AccountStatusSchema.parse(data)
  } catch (error) {
    throw normalizeHttpError(error)
  }
}

/**
 * Fetches the Google OAuth consent URL from the backend.
 * The caller is responsible for navigating or opening the returned URL.
 * After the user completes OAuth, the backend stores the token; the frontend
 * can detect this by re-querying fetchAccountStatus.
 */
export async function fetchOAuthStartUrl(userId: number): Promise<string> {
  try {
    const { data } = await axiosClient.get(endpoints.oauth.youtubeStart, {
      params: { userId },
    })
    return OAuthStartResponseSchema.parse(data).authUrl
  } catch (error) {
    throw normalizeHttpError(error)
  }
}
