import { Link, useParams, useSearchParams } from 'react-router-dom'

import { DataTable } from '@/components/common/DataTable'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { SkeletonBlock } from '@/components/common/SkeletonBlock'
import { Separator } from '@/components/ui/separator'

import { ChannelHeader } from '../components/ChannelHeader'
import { ChannelStats } from '../components/ChannelStats'
import { ChannelChart } from '../components/ChannelChart'
import { useChannelAnalyticsByIdQuery, useChannelQuery } from '../queries'

export default function ChannelOverviewPage() {
  // Support both /channels/:channelDbId (path param) and /channel?channelDbId= (legacy)
  const { channelDbId: channelDbIdParam } = useParams<{ channelDbId?: string }>()
  const [searchParams] = useSearchParams()
  const channelDbIdStr = channelDbIdParam ?? searchParams.get('channelDbId')
  const channelDbId = channelDbIdStr ? Number(channelDbIdStr) : undefined

  // Analytics data (chart, stats, video list details)
  const {
    data,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useChannelAnalyticsByIdQuery(channelDbId)

  // Channel detail from /channels/:id — provides authoritative freshness timestamps
  const { data: channelDetail } = useChannelQuery(channelDbId)

  const legacyChannelId = searchParams.get('channelId') ?? ''

  const detailsRows =
    data && channelDbId
      ? [
          { label: 'Database ID', value: String(channelDbId) },
          { label: 'Channel ID', value: data.channelId ?? legacyChannelId ?? '—' },
          { label: 'Title', value: data.title ?? '—' },
          { label: 'Videos', value: data.videoCount ?? '—' },
          {
            label: 'Status',
            value: channelDetail?.lastRefreshStatus ?? '—',
          },
        ]
      : []

  if (!channelDbId) {
    return (
      <EmptyState
        title="No channel loaded"
        description="Use the top bar to enter a channel identifier (@handle, UC..., or URL) and click Load."
      />
    )
  }

  if (isError) {
    const requiresAuth = error.status === 401 || error.status === 403
    return (
      <ErrorState
        title={requiresAuth ? 'Connect account' : 'Unable to load channel analytics'}
        description={
          requiresAuth
            ? 'Authentication required. Connect your YouTube account, then retry.'
            : error.message
        }
        actionLabel={requiresAuth ? 'Connect YouTube account' : 'Retry'}
        onAction={() => refetch()}
        status={error.status}
        code={error.code}
      />
    )
  }

  return (
    <div className="space-y-6">
      {channelDbIdParam && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link to="/channels" className="hover:text-foreground transition-colors">
            Channels
          </Link>
          <span>/</span>
          <span className="text-foreground font-medium truncate">
            {data?.title ?? channelDetail?.title ?? channelDbIdStr}
          </span>
        </div>
      )}

      {/* ChannelHeader now reads freshness from /channels/:id, not analytics */}
      <ChannelHeader
        title={data?.title ?? channelDetail?.title ?? 'Channel overview'}
        channelId={data?.channelId ?? channelDetail?.channelId ?? legacyChannelId}
        lastSuccessfulRefreshAt={channelDetail?.lastSuccessfulRefreshAt}
        lastSnapshotAt={channelDetail?.lastSnapshotAt}
        lastRefreshStatus={channelDetail?.lastRefreshStatus}
      />

      <ChannelStats data={data} loading={isLoading || isFetching} />

      <div className="grid gap-4 lg:grid-cols-2">
        <ChannelChart data={data} />
        <div className="space-y-3 rounded-lg border bg-card/60 p-4 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">Channel details</h2>
              <p className="text-sm text-muted-foreground">
                Basic metadata and freshness state.
              </p>
            </div>
            {channelDbIdParam && (
              <Link
                to={`/channels/${channelDbId}/videos`}
                className="shrink-0 rounded-md border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                View videos →
              </Link>
            )}
          </div>
          <Separator />
          {isLoading ? (
            <SkeletonBlock lines={5} />
          ) : (
            <DataTable
              columns={[
                { header: 'Field', accessor: (row) => row.label },
                { header: 'Value', accessor: (row) => row.value },
              ]}
              data={detailsRows}
              emptyMessage="No details available."
            />
          )}
        </div>
      </div>
    </div>
  )
}
