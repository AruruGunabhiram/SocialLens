import { Navigate, Route, Routes } from 'react-router-dom'

import { AppShell } from './layout/AppShell'
import ChannelOverviewPage from '@/features/channels/pages/ChannelOverviewPage'
import ChannelsListPage from '@/features/channels/pages/ChannelsListPage'
import ChannelVideosPage from '@/features/channels/pages/ChannelVideosPage'
import InsightsPage from '@/features/insights/pages/InsightsPage'
import TrendsPage from '@/features/trends/pages/TrendsPage'
import VideosPage from '@/features/videos/pages/VideosPage'
import DashboardPage from '@/pages/DashboardPage'
import NotFoundPage from '@/pages/NotFoundPage'

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
