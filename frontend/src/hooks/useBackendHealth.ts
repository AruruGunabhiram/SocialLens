import { useQuery } from '@tanstack/react-query'
import { axiosClient } from '@/api/axiosClient'
import { endpoints } from '@/api/endpoints'

/**
 * Polls GET /health and maps the response to a human-readable status.
 *
 * - 'checking'    – initial load in progress
 * - 'operational' – backend responded with HTTP 200 and body "OK"
 * - 'degraded'    – request failed, timed out, or returned an unexpected body
 *
 * Refreshes every 60 s in the background so the footer stays current during
 * long-lived sessions.
 */
export type BackendStatus = 'checking' | 'operational' | 'degraded'

export function useBackendHealth(): BackendStatus {
  const { data, isLoading, isError } = useQuery<string>({
    queryKey: ['backend-health'],
    queryFn: async () => {
      const { data } = await axiosClient.get<string>(endpoints.health.check)
      return data
    },
    refetchInterval: 60_000,
    retry: 1,
    staleTime: 30_000,
    // Don't let the global 500 interceptor show a toast for a background health check
    meta: { silent: true },
  })

  if (isLoading) return 'checking'
  if (isError || data !== 'OK') return 'degraded'
  return 'operational'
}
