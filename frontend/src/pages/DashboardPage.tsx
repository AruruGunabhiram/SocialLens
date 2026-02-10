import { useState } from 'react'

import { AppShell } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useChannelAnalytics } from '@/hooks/useChannelAnalytics'

function DashboardPage() {
  const [inputValue, setInputValue] = useState('')
  const [channelId, setChannelId] = useState<string>('')

  const { data, isLoading, isError, error, isFetching } = useChannelAnalytics(channelId)

  const handleLoad = () => {
    setChannelId(inputValue.trim())
  }

  const metrics = [
    {
      label: 'Subscribers',
      value: data?.subscriberCount ?? '—',
    },
    {
      label: 'Total Views',
      value: data?.totalViews ?? '—',
    },
    {
      label: 'Video Count',
      value: data?.videoCount ?? '—',
    },
    {
      label: 'Channel ID',
      value: data?.channelId ?? '—',
    },
  ]

  return (
    <AppShell title="SocialLens Dashboard">
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-muted-foreground" htmlFor="channelId">
              Channel ID
            </label>
            <Input
              id="channelId"
              placeholder="Enter channel ID"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="w-72"
            />
          </div>
          <Button onClick={handleLoad} disabled={!inputValue.trim() || isFetching}>
            {isLoading || isFetching ? 'Loading...' : 'Load'}
          </Button>
          {data?.title && (
            <span className="text-sm text-muted-foreground">{data.title}</span>
          )}
        </div>

        {isError && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-destructive">
            {error instanceof Error ? error.message : 'Failed to load analytics'}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map((metric) => (
            <Card key={metric.label}>
              <CardHeader>
                <CardDescription>{metric.label}</CardDescription>
                <CardTitle className="text-3xl font-bold">
                  {typeof metric.value === 'number' ? metric.value.toLocaleString() : metric.value}
                </CardTitle>
              </CardHeader>
            </Card>
          ))}
        </div>

        {!channelId && (
          <p className="text-sm text-muted-foreground">
            Enter a channel ID above and select Load to fetch analytics.
          </p>
        )}
      </div>
    </AppShell>
  )
}

export default DashboardPage
