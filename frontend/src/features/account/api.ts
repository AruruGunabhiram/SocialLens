import { axiosClient } from '@/api/axiosClient'
import { endpoints } from '@/api/endpoints'
import { normalizeHttpError } from '@/api/httpError'
import {
  AccountStatusSchema,
  BudgetStatusSchema,
  ConnectedAccountDetailSchema,
  LocalUserSchema,
  OAuthStartResponseSchema,
} from '@/api/schemas'
import type { AccountStatus, BudgetStatus, ConnectedAccountDetail, LocalUser } from '@/api/types'

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

/** Returns full connected account details (channelId, scopes, expiry, created). */
export async function fetchAccountDetail(
  userId: number,
  platform: 'YOUTUBE'
): Promise<ConnectedAccountDetail> {
  try {
    const { data } = await axiosClient.get(endpoints.account.detail, {
      params: { userId, platform },
    })
    return ConnectedAccountDetailSchema.parse(data)
  } catch (error) {
    throw normalizeHttpError(error)
  }
}

/** Clears stored tokens and marks the connected account as DISCONNECTED. */
export async function disconnectAccount(userId: number, platform: 'YOUTUBE'): Promise<void> {
  try {
    await axiosClient.post(endpoints.account.disconnect, null, {
      params: { userId, platform },
    })
  } catch (error) {
    throw normalizeHttpError(error)
  }
}

/** Returns the current YouTube Data API call budget for the day. */
export async function fetchBudgetStatus(): Promise<BudgetStatus> {
  try {
    const { data } = await axiosClient.get(endpoints.jobs.budget)
    return BudgetStatusSchema.parse(data)
  } catch (error) {
    throw normalizeHttpError(error)
  }
}

/** Clears all stored snapshots and indexed videos (channels are preserved). */
export async function clearAllData(): Promise<{
  videosDeleted: number
  channelSnapshotsDeleted: number
}> {
  try {
    const { data } = await axiosClient.post(endpoints.admin.clearData)
    return data as { videosDeleted: number; channelSnapshotsDeleted: number }
  } catch (error) {
    throw normalizeHttpError(error)
  }
}
