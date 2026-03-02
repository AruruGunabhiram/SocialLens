import { useEffect, useMemo, useState } from 'react'
import { Loader2, RefreshCw, Zap, ZapOff } from 'lucide-react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import {
  useChannelQuery,
  useChannelSyncMutation,
  useChannelRefreshByIdMutation,
  useIsChannelFetchingById,
} from '@/features/channels/queries'
import { cn } from '@/lib/utils'
import { useReduceMotion } from '@/lib/ReduceMotionContext'

/**
 * Returns the effective channelDbId for the current page.
 * Checks path params first (/channels/:channelDbId), then falls back to
 * the legacy ?channelDbId= search param.
 */
function useEffectiveChannelDbId(): number | undefined {
  const { channelDbId: fromPath } = useParams<{ channelDbId?: string }>()
  const [searchParams] = useSearchParams()
  const fromSearch = searchParams.get('channelDbId')
  const raw = fromPath ?? fromSearch
  const id = raw ? Number(raw) : NaN
  return Number.isFinite(id) && id > 0 ? id : undefined
}

export function Topbar() {
  const navigate = useNavigate()
  const channelDbId = useEffectiveChannelDbId()
  const [channelInput, setChannelInput] = useState('')

  const { mutateAsync: syncChannel, isPending: isSyncing } = useChannelSyncMutation()
  const { mutateAsync: refreshChannel, isPending: isRefreshing } = useChannelRefreshByIdMutation()
  const isFetchingChannel = useIsChannelFetchingById(channelDbId)

  // Fetch lightweight channel metadata for display (title, channelId for refresh)
  const { data: channelInfo } = useChannelQuery(channelDbId)

  useEffect(() => {
    if (!channelDbId) setChannelInput('')
  }, [channelDbId])

  const statusText = useMemo(() => {
    if (isSyncing) return 'Syncing channel…'
    if (isRefreshing) return 'Refreshing…'
    if (isFetchingChannel) return 'Fetching data…'
    if (channelDbId && channelInfo?.title) return channelInfo.title

    if (channelDbId) return 'Up to date'
    return 'No channel loaded'
  }, [channelDbId, channelInfo?.title, isFetchingChannel, isRefreshing, isSyncing])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const identifier = channelInput.trim()
    if (!identifier) return

    try {
      const syncResult = await syncChannel(identifier)
      // Navigate to the new channel-detail route
      navigate(`/channels/${syncResult.channelDbId}`)
    } catch {
      // Error toast handled in mutation onError
    }
  }

  const handleRefresh = async () => {
    if (!channelDbId) return
    try {
      await refreshChannel({ channelDbId })
    } catch {
      // Error toast handled in mutation onError
    }
  }

  const isActive = isSyncing || isRefreshing || isFetchingChannel
  const { reduceMotion, toggle: toggleMotion } = useReduceMotion()

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b bg-card/80 px-4 backdrop-blur">
      <form className="flex flex-1 items-center gap-3" onSubmit={handleSubmit}>
        <Input
          value={channelInput}
          onChange={(event) => setChannelInput(event.target.value)}
          placeholder="@handle or UC... or channel URL"
          className="max-w-xs"
          aria-label="Channel identifier"
          disabled={isSyncing}
        />
        <Button type="submit" variant="secondary" disabled={!channelInput.trim() || isSyncing}>
          {isSyncing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Load'}
        </Button>
        <Separator orientation="vertical" className="hidden h-6 lg:block" />
        <Button
          type="button"
          variant="ghost"
          className="gap-2"
          disabled={!channelDbId || isRefreshing || isSyncing}
          onClick={handleRefresh}
        >
          {isRefreshing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Refresh
        </Button>
      </form>
      <div className="flex shrink-0 items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={toggleMotion}
          aria-label={reduceMotion ? 'Enable animations' : 'Reduce motion'}
          aria-pressed={reduceMotion}
          title={reduceMotion ? 'Enable animations' : 'Reduce motion'}
          className="text-muted-foreground"
        >
          {reduceMotion ? <ZapOff className="h-4 w-4" /> : <Zap className="h-4 w-4" />}
        </Button>
        <Separator orientation="vertical" className="h-6" />
        <div
          className={cn(
            'max-w-[220px] truncate text-sm font-medium',
            isActive ? 'text-primary' : 'text-muted-foreground'
          )}
          title={statusText}
        >
          {statusText}
        </div>
      </div>
    </header>
  )
}
