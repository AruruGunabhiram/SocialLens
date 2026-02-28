import { lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'

import { AppShell } from './layout/AppShell'

const ChannelOverviewPage = lazy(() => import('@/features/channels/pages/ChannelOverviewPage'))
const ChannelsListPage    = lazy(() => import('@/features/channels/pages/ChannelsListPage'))
const ChannelVideosPage   = lazy(() => import('@/features/channels/pages/ChannelVideosPage'))
const InsightsPage        = lazy(() => import('@/features/insights/pages/InsightsPage'))
const TrendsPage          = lazy(() => import('@/features/trends/pages/TrendsPage'))
const VideosPage          = lazy(() => import('@/features/videos/pages/VideosPage'))
const DashboardPage       = lazy(() => import('@/pages/DashboardPage'))
const NotFoundPage        = lazy(() => import('@/pages/NotFoundPage'))

export function AppRouter() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Navigate to="/channels" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />

        {/* Channels feature */}
        <Route path="/channels" element={<ChannelsListPage />} />
        <Route path="/channels/:channelDbId" element={<ChannelOverviewPage />} />
        <Route path="/channels/:channelDbId/videos" element={<ChannelVideosPage />} />
        <Route path="/channels/:channelDbId/insights" element={<InsightsPage />} />
        <Route path="/channels/:channelDbId/trends" element={<TrendsPage />} />

        {/* Legacy route — kept for backward-compat with search-param based links */}
        <Route path="/channel" element={<ChannelOverviewPage />} />

        <Route path="/videos" element={<VideosPage />} />
        <Route path="/trends" element={<TrendsPage />} />
        <Route path="/insights" element={<InsightsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}

export default AppRouter
