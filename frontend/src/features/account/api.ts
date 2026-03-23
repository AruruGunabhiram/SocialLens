import { axiosClient } from '@/api/axiosClient'
import { endpoints } from '@/api/endpoints'
import { normalizeHttpError } from '@/api/httpError'
import { AccountStatusSchema, LocalUserSchema, OAuthStartResponseSchema } from '@/api/schemas'
import type { AccountStatus, LocalUser } from '@/api/types'

/**
 * Returns the implicit "current user" for local-dev.
 * The backend creates the user on first call if the table is empty, so there
 * is no fragile assumption about which id the user has.
 */
export async function fetchCurrentUser(): Promise<LocalUser> {
  try {
    const { data } = await axiosClient.get(endpoints.users.me)
    return LocalUserSchema.parse(data)
  } catch (error) {
    throw normalizeHttpError(error)
  }
}

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
