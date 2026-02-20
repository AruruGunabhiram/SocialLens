import { useEffect, useMemo, useState } from 'react'
import { useIsFetching } from '@tanstack/react-query'
import { Loader2, RefreshCw } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { channelQueryKeys, useChannelRefreshMutation } from '@/features/channels/queries'
import { cn } from '@/lib/utils'

export function Topbar() {
  const [searchParams, setSearchParams] = useSearchParams()
  const currentChannelId = searchParams.get('channelId') ?? ''
  const [channelInput, setChannelInput] = useState(currentChannelId)

  const { mutateAsync: refreshChannel, isPending: isRefreshing } = useChannelRefreshMutation()
  const isFetchingChannel =
    useIsFetching({ queryKey: channelQueryKeys.analytics(currentChannelId || '__unset__') }) > 0

  useEffect(() => {
    setChannelInput(currentChannelId)
  }, [currentChannelId])

  const statusText = useMemo(() => {
    if (isRefreshing) return 'Refreshing…'
    if (isFetchingChannel) return 'Fetching data…'
    return currentChannelId ? 'Up to date' : 'No channel selected'
  }, [currentChannelId, isFetchingChannel, isRefreshing])

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextId = channelInput.trim()
    const nextParams = new URLSearchParams(searchParams)
    if (nextId) {
      nextParams.set('channelId', nextId)
    } else {
      nextParams.delete('channelId')
    }
    setSearchParams(nextParams, { replace: false })
  }

  const handleRefresh = async () => {
    if (!currentChannelId) return
    try {
      await refreshChannel(currentChannelId)
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
          placeholder="Channel ID"
          className="max-w-xs"
          aria-label="Channel ID"
        />
        <Button type="submit" variant="secondary" disabled={!channelInput.trim()}>
          Load
        </Button>
        <Separator orientation="vertical" className="hidden h-6 lg:block" />
        <Button
          type="button"
          variant="ghost"
          className="gap-2"
          disabled={!currentChannelId || isRefreshing}
          onClick={handleRefresh}
        >
          {isRefreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Refresh
        </Button>
      </form>
      <div
        className={cn(
          'text-sm font-medium',
          isRefreshing || isFetchingChannel ? 'text-primary' : 'text-muted-foreground'
        )}
      >
        {statusText}
      </div>
    </header>
  )
}
