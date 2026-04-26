import { lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'

import { AppShell } from './layout/AppShell'

const ChannelOverviewPage = lazy(() => import('@/features/channels/pages/ChannelOverviewPage'))
const ChannelsListPage = lazy(() => import('@/features/channels/pages/ChannelsListPage'))
const ChannelVideosPage = lazy(() => import('@/features/channels/pages/ChannelVideosPage'))
const TrendsPage = lazy(() => import('@/features/trends/pages/TrendsPage'))
const GlobalTrendsPage = lazy(() => import('@/features/trends/pages/GlobalTrendsPage'))
const InsightsPage = lazy(() => import('@/features/insights/pages/InsightsPage'))
const VideosPage = lazy(() => import('@/features/videos/pages/VideosPage'))
const DashboardPage = lazy(() => import('@/pages/DashboardPage'))
const CopilotPage = lazy(() => import('@/pages/CopilotPage'))
const SettingsPage = lazy(() => import('@/pages/SettingsPage'))
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'))
const ChangelogPage = lazy(() => import('@/pages/ChangelogPage'))
const OAuthCallbackPage = lazy(() => import('@/pages/OAuthCallbackPage'))

export function AppRouter() {
  return (
    <Routes>
      {/* Standalone OAuth callback  -  no app shell, renders in the new tab opened by window.open */}
      <Route path="/oauth/callback" element={<OAuthCallbackPage />} />

      <Route element={<AppShell />}>
        <Route index element={<DashboardPage />} />
        {/* Legacy redirects */}
        <Route path="/channel" element={<Navigate to="/channels" replace />} />
        <Route path="/dashboard" element={<Navigate to="/" replace />} />
        <Route path="/videos" element={<VideosPage />} />
        <Route path="/trends" element={<GlobalTrendsPage />} />
        <Route path="/insights" element={<InsightsPage />} />
        <Route path="/copilot" element={<CopilotPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/changelog" element={<ChangelogPage />} />

        {/* Channels feature */}
        <Route path="/channels" element={<ChannelsListPage />} />
        <Route path="/channels/:channelDbId" element={<ChannelOverviewPage />} />
        <Route path="/channels/:channelDbId/videos" element={<ChannelVideosPage />} />
        <Route path="/channels/:channelDbId/trends" element={<TrendsPage />} />

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}

export default AppRouter
