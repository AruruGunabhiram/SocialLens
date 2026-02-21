import { useEffect, useMemo, useState } from 'react'
import { Loader2, RefreshCw } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import {
  useChannelSyncMutation,
  useChannelRefreshByIdMutation,
  useIsChannelFetchingById,
} from '@/features/channels/queries'
import { cn } from '@/lib/utils'

export function Topbar() {
  const [searchParams, setSearchParams] = useSearchParams()
  const currentChannelDbId = searchParams.get('channelDbId')
  const currentChannelId = searchParams.get('channelId') ?? ''
  const [channelInput, setChannelInput] = useState('')

  const { mutateAsync: syncChannel, isPending: isSyncing } = useChannelSyncMutation()
  const { mutateAsync: refreshChannel, isPending: isRefreshing } = useChannelRefreshByIdMutation()
  const isFetchingChannel = useIsChannelFetchingById(currentChannelDbId ? Number(currentChannelDbId) : undefined)

  useEffect(() => {
    // Clear input when navigating away from channel
    if (!currentChannelDbId) {
      setChannelInput('')
    }
  }, [currentChannelDbId])

  const statusText = useMemo(() => {
    if (isSyncing) return 'Syncing channel…'
    if (isRefreshing) return 'Refreshing…'
    if (isFetchingChannel) return 'Fetching data…'
    return currentChannelDbId ? 'Up to date' : 'No channel loaded'
  }, [currentChannelDbId, isFetchingChannel, isRefreshing, isSyncing])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const identifier = channelInput.trim()
    if (!identifier) return

    try {
      // Call sync endpoint
      const syncResult = await syncChannel(identifier)

      // Update URL with channelDbId and channelId
      const nextParams = new URLSearchParams()
      nextParams.set('channelDbId', String(syncResult.channelDbId))
      nextParams.set('channelId', syncResult.channelId)
      setSearchParams(nextParams, { replace: false })
    } catch {
      // Error toast handled in mutation onError
    }
  }

  const handleRefresh = async () => {
    if (!currentChannelDbId || !currentChannelId) return
    try {
      await refreshChannel({
        channelDbId: Number(currentChannelDbId),
        channelId: currentChannelId,
      })
    } catch {
      // Error toast handled in mutation onError
    }
  }

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
          disabled={!currentChannelDbId || isRefreshing || isSyncing}
          onClick={handleRefresh}
        >
          {isRefreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Refresh
        </Button>
      </form>
      <div
        className={cn(
          'text-sm font-medium',
          isRefreshing || isFetchingChannel || isSyncing ? 'text-primary' : 'text-muted-foreground'
        )}
      >
        {statusText}
      </div>
    </header>
  )
}
