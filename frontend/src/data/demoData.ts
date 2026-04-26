import type { ChannelItem, VideosPageResponse, TimeSeriesResponse } from '@/api/types'
import type { ChannelAnalytics } from '@/features/channels/schemas'

// ─── Date helpers ─────────────────────────────────────────────────────────────

function shiftDate(base: Date, offsetDays: number): string {
  const d = new Date(base)
  d.setUTCDate(d.getUTCDate() + offsetDays)
  return d.toISOString().split('T')[0]
}

function makeDates(count: number): string[] {
  const today = new Date()
  return Array.from({ length: count }, (_, i) => shiftDate(today, i - count + 1))
}

// ─── Timeseries generator ─────────────────────────────────────────────────────

function makeTsPoints(
  dates: string[],
  startValue: number,
  dailyBase: number,
  spikes: Record<number, number> = {},
  noiseAmp = 0,
): Array<{ date: string; value: number }> {
  let val = startValue
  return dates.map((date, i) => {
    const noise = noiseAmp > 0 ? Math.round(((i * 13 + 7) % 11) * noiseAmp - noiseAmp * 5) : 0
    val += dailyBase + noise + (spikes[i] ?? 0)
    return { date, value: Math.round(Math.max(0, val)) }
  })
}

const DATES = makeDates(90) // generate 90-day pool; slice per range request
const D30 = DATES.slice(-30)
const D7 = DATES.slice(-7)

// ─── Demo channel IDs ─────────────────────────────────────────────────────────

export const DEMO_IDS = [-1, -2, -3] as const
export type DemoChannelId = (typeof DEMO_IDS)[number]

// ─── Channel list ─────────────────────────────────────────────────────────────

const today = new Date().toISOString()

export const demoChannels: ChannelItem[] = [
  {
    id: -1,
    channelId: 'UC_demo_techwithttim',
    title: 'TechWithTim',
    handle: 'TechWithTim',
    active: true,
    description: 'Python, machine learning, and software development tutorials.',
    thumbnailUrl: 'https://i.ytimg.com/vi/ttim_ch_thumb/mqdefault.jpg',
    country: 'CA',
    publishedAt: '2017-03-15T00:00:00Z',
    lastSuccessfulRefreshAt: today,
    lastRefreshStatus: 'SUCCESS',
    lastRefreshError: null,
    lastSnapshotAt: today,
    snapshotDayCount: 30,
    subscriberCount: 501800,
    viewCount: 51500000,
    videoCount: 250,
  },
  {
    id: -2,
    channelId: 'UC_demo_fireshipio',
    title: 'Fireship',
    handle: 'Fireship',
    active: true,
    description: 'High-intensity code tutorials and tech explainers.',
    thumbnailUrl: 'https://i.ytimg.com/vi/fire_ch_thumb/mqdefault.jpg',
    country: 'US',
    publishedAt: '2017-09-20T00:00:00Z',
    lastSuccessfulRefreshAt: today,
    lastRefreshStatus: 'SUCCESS',
    lastRefreshError: null,
    lastSnapshotAt: today,
    snapshotDayCount: 30,
    subscriberCount: 2115000,
    viewCount: 325000000,
    videoCount: 890,
  },
  {
    id: -3,
    channelId: 'UC_demo_theprimeagen',
    title: 'ThePrimeagen',
    handle: 'ThePrimeagen',
    active: true,
    description: 'Neovim, Rust, TypeScript, and raw developer opinions.',
    thumbnailUrl: 'https://i.ytimg.com/vi/prim_ch_thumb/mqdefault.jpg',
    country: 'US',
    publishedAt: '2019-01-10T00:00:00Z',
    lastSuccessfulRefreshAt: today,
    lastRefreshStatus: 'SUCCESS',
    lastRefreshError: null,
    lastSnapshotAt: today,
    snapshotDayCount: 30,
    subscriberCount: 352400,
    viewCount: 23800000,
    videoCount: 180,
  },
]

// ─── Timeseries ───────────────────────────────────────────────────────────────

const tsData: Record<
  DemoChannelId,
  Record<'VIEWS' | 'SUBSCRIBERS' | 'UPLOADS', Array<{ date: string; value: number }>>
> = {
  [-1]: {
    VIEWS:       makeTsPoints(DATES, 48_200_000, 110_000, { 42: 1_200_000 }, 8000),
    SUBSCRIBERS: makeTsPoints(DATES, 497_200,    130,     { 42: 3500 },      10),
    UPLOADS:     makeTsPoints(DATES, 248,        0,       { 5: 1, 18: 1, 35: 1, 60: 1, 78: 1 }),
  },
  [-2]: {
    VIEWS:       makeTsPoints(DATES, 310_000_000, 500_000, { 38: 8_000_000 }, 30000),
    SUBSCRIBERS: makeTsPoints(DATES, 2_088_000,   900,     { 38: 12_000 },    60),
    UPLOADS:     makeTsPoints(DATES, 885,         0,       { 3: 1, 9: 1, 15: 1, 21: 1, 27: 1, 33: 1, 39: 1, 45: 1, 51: 1, 57: 1 }),
  },
  [-3]: {
    VIEWS:       makeTsPoints(DATES, 22_500_000, 43_000, { 55: 400_000 }, 5000),
    SUBSCRIBERS: makeTsPoints(DATES, 348_200,    140,    { 55: 1800 },    8),
    UPLOADS:     makeTsPoints(DATES, 178,        0,      { 10: 1, 22: 1, 45: 1, 68: 1, 82: 1 }),
  },
}

export function getDemoTimeSeries(
  channelDbId: number,
  metric: 'VIEWS' | 'SUBSCRIBERS' | 'UPLOADS',
  rangeDays: number,
): TimeSeriesResponse {
  const id = channelDbId as DemoChannelId
  const allPoints = tsData[id]?.[metric] ?? []
  const points = allPoints.slice(-Math.min(rangeDays, allPoints.length))
  return {
    channelDbId,
    channelId: demoChannels.find((c) => c.id === channelDbId)?.channelId ?? '',
    metric,
    rangeDays,
    points,
  }
}

// ─── Analytics (for ChannelOverviewPage) ─────────────────────────────────────

function makeMetricTimeseries(id: DemoChannelId): ChannelAnalytics['timeseries'] {
  const viewPts = tsData[id].VIEWS.slice(-30)
  const subPts = tsData[id].SUBSCRIBERS.slice(-30)
  return D30.map((date, i) => ({
    date,
    views: viewPts[i]?.value,
    subscribers: subPts[i]?.value,
  }))
}

export const demoAnalytics: Record<DemoChannelId, ChannelAnalytics> = {
  [-1]: {
    channelId: 'UC_demo_techwithttim',
    title: 'TechWithTim',
    subscriberCount: 501800,
    totalViews: 51500000,
    videoCount: 250,
    likeCount: 1850000,
    commentCount: 420000,
    lastRefreshedAt: today,
    timeseries: makeMetricTimeseries(-1),
  },
  [-2]: {
    channelId: 'UC_demo_fireshipio',
    title: 'Fireship',
    subscriberCount: 2115000,
    totalViews: 325000000,
    videoCount: 890,
    likeCount: 12000000,
    commentCount: 2800000,
    lastRefreshedAt: today,
    timeseries: makeMetricTimeseries(-2),
  },
  [-3]: {
    channelId: 'UC_demo_theprimeagen',
    title: 'ThePrimeagen',
    subscriberCount: 352400,
    totalViews: 23800000,
    videoCount: 180,
    likeCount: 980000,
    commentCount: 210000,
    lastRefreshedAt: today,
    timeseries: makeMetricTimeseries(-3),
  },
}

// ─── Videos ───────────────────────────────────────────────────────────────────

function yt(id: string) {
  return `https://i.ytimg.com/vi/${id}/mqdefault.jpg`
}

function daysAgo(n: number) {
  return shiftDate(new Date(), -n) + 'T12:00:00Z'
}

const TECHWITHTTIM_VIDEOS = [
  { id: 1,  videoId: 'ttim_v00001', title: 'Python Full Course for Beginners',               views: 4_800_000, likes: 142_000, publishedAt: daysAgo(420) },
  { id: 2,  videoId: 'ttim_v00002', title: 'Build a REST API with FastAPI',                   views: 2_300_000, likes:  68_000, publishedAt: daysAgo(310) },
  { id: 3,  videoId: 'ttim_v00003', title: 'Machine Learning for Beginners',                  views: 3_100_000, likes:  91_000, publishedAt: daysAgo(280) },
  { id: 4,  videoId: 'ttim_v00004', title: 'Django Tutorial - Build a Web App',               views: 1_900_000, likes:  57_000, publishedAt: daysAgo(250) },
  { id: 5,  videoId: 'ttim_v00005', title: 'Neural Networks from Scratch in Python',          views: 2_700_000, likes:  83_000, publishedAt: daysAgo(220) },
  { id: 6,  videoId: 'ttim_v00006', title: 'Python Data Structures and Algorithms',           views: 1_600_000, likes:  48_000, publishedAt: daysAgo(190) },
  { id: 7,  videoId: 'ttim_v00007', title: 'React + Python: Full Stack Project',              views: 980_000,   likes:  29_000, publishedAt: daysAgo(165) },
  { id: 8,  videoId: 'ttim_v00008', title: 'GPT-4 API Tutorial in Python',                   views: 2_200_000, likes:  66_000, publishedAt: daysAgo(140) },
  { id: 9,  videoId: 'ttim_v00009', title: 'Async Python Explained',                          views: 760_000,   likes:  22_000, publishedAt: daysAgo(120) },
  { id: 10, videoId: 'ttim_v00010', title: 'Python Type Hints - Complete Guide',               views: 540_000,   likes:  16_000, publishedAt: daysAgo(100) },
  { id: 11, videoId: 'ttim_v00011', title: 'Build a Discord Bot with Python',                 views: 1_400_000, likes:  42_000, publishedAt: daysAgo(85)  },
  { id: 12, videoId: 'ttim_v00012', title: 'Pandas Tutorial - Data Analysis in Python',       views: 1_100_000, likes:  33_000, publishedAt: daysAgo(72)  },
  { id: 13, videoId: 'ttim_v00013', title: 'Deploy Python App to AWS',                        views: 430_000,   likes:  13_000, publishedAt: daysAgo(60)  },
  { id: 14, videoId: 'ttim_v00014', title: 'PostgreSQL + Python - Full Tutorial',             views: 620_000,   likes:  18_500, publishedAt: daysAgo(48)  },
  { id: 15, videoId: 'ttim_v00015', title: 'Python Web Scraping with BeautifulSoup',          views: 870_000,   likes:  26_000, publishedAt: daysAgo(38)  },
  { id: 16, videoId: 'ttim_v00016', title: 'Intro to Rust for Python Developers',             views: 390_000,   likes:  12_000, publishedAt: daysAgo(28)  },
  { id: 17, videoId: 'ttim_v00017', title: 'LangChain + Python - Build an AI Agent',         views: 1_800_000, likes:  54_000, publishedAt: daysAgo(18)  },
  { id: 18, videoId: 'ttim_v00018', title: 'Python vs JavaScript in 2026',                    views: 920_000,   likes:  27_600, publishedAt: daysAgo(12)  },
  { id: 19, videoId: 'ttim_v00019', title: 'How I Built a SaaS in 30 Days with Python',      views: 560_000,   likes:  16_800, publishedAt: daysAgo(6)   },
  { id: 20, videoId: 'ttim_v00020', title: 'Python 3.14 - What\'s New?',                      views: 210_000,   likes:   6_300, publishedAt: daysAgo(2)   },
]

const FIRESHIP_VIDEOS = [
  { id: 21, videoId: 'fire_v00001', title: 'React in 100 Seconds',                            views: 5_200_000, likes: 185_000, publishedAt: daysAgo(500) },
  { id: 22, videoId: 'fire_v00002', title: 'TypeScript in 100 Seconds',                       views: 4_100_000, likes: 145_000, publishedAt: daysAgo(460) },
  { id: 23, videoId: 'fire_v00003', title: 'Next.js in 100 Seconds',                          views: 3_800_000, likes: 132_000, publishedAt: daysAgo(420) },
  { id: 24, videoId: 'fire_v00004', title: '100+ Web Dev Things You Should Know',             views: 8_600_000, likes: 310_000, publishedAt: daysAgo(390) },
  { id: 25, videoId: 'fire_v00005', title: 'Node.js in 100 Seconds',                          views: 3_300_000, likes: 118_000, publishedAt: daysAgo(360) },
  { id: 26, videoId: 'fire_v00006', title: 'Docker in 100 Seconds',                           views: 2_900_000, likes: 104_000, publishedAt: daysAgo(330) },
  { id: 27, videoId: 'fire_v00007', title: 'Kubernetes Explained in 6 Minutes',               views: 2_200_000, likes:  80_000, publishedAt: daysAgo(300) },
  { id: 28, videoId: 'fire_v00008', title: 'CSS in 100 Seconds',                              views: 2_700_000, likes:  97_000, publishedAt: daysAgo(270) },
  { id: 29, videoId: 'fire_v00009', title: 'SQL vs NoSQL Explained',                          views: 1_900_000, likes:  68_000, publishedAt: daysAgo(240) },
  { id: 30, videoId: 'fire_v00010', title: 'Git in 100 Seconds',                              views: 3_500_000, likes: 127_000, publishedAt: daysAgo(210) },
  { id: 31, videoId: 'fire_v00011', title: 'Every JavaScript Framework Explained',            views: 4_800_000, likes: 172_000, publishedAt: daysAgo(180) },
  { id: 32, videoId: 'fire_v00012', title: 'Supabase in 100 Seconds',                         views: 1_600_000, likes:  57_000, publishedAt: daysAgo(150) },
  { id: 33, videoId: 'fire_v00013', title: 'Rust in 100 Seconds',                             views: 2_400_000, likes:  87_000, publishedAt: daysAgo(120) },
  { id: 34, videoId: 'fire_v00014', title: 'WebAssembly in 100 Seconds',                      views: 1_200_000, likes:  44_000, publishedAt: daysAgo(95)  },
  { id: 35, videoId: 'fire_v00015', title: 'Claude API in 100 Seconds',                       views: 2_100_000, likes:  76_000, publishedAt: daysAgo(70)  },
  { id: 36, videoId: 'fire_v00016', title: 'I Tried Every AI Coding Tool',                    views: 3_900_000, likes: 141_000, publishedAt: daysAgo(50)  },
  { id: 37, videoId: 'fire_v00017', title: 'Bun vs Node.js - Which is Faster?',               views: 2_600_000, likes:  94_000, publishedAt: daysAgo(35)  },
  { id: 38, videoId: 'fire_v00018', title: 'Tailwind CSS in 100 Seconds',                     views: 1_800_000, likes:  66_000, publishedAt: daysAgo(22)  },
  { id: 39, videoId: 'fire_v00019', title: 'htmx in 100 Seconds',                             views: 1_500_000, likes:  55_000, publishedAt: daysAgo(10)  },
  { id: 40, videoId: 'fire_v00020', title: 'The Last React Tutorial You\'ll Ever Need',       views: 4_200_000, likes: 152_000, publishedAt: daysAgo(3)   },
]

const PRIMEAGEN_VIDEOS = [
  { id: 41, videoId: 'prim_v00001', title: 'Why I Use Neovim in 2026',                       views: 820_000, likes: 38_000, publishedAt: daysAgo(480) },
  { id: 42, videoId: 'prim_v00002', title: 'Vim Motions for Complete Beginners',              views: 1_400_000, likes: 64_000, publishedAt: daysAgo(440) },
  { id: 43, videoId: 'prim_v00003', title: 'Rust vs Go - My Honest Opinion',                 views: 960_000, likes: 44_000, publishedAt: daysAgo(400) },
  { id: 44, videoId: 'prim_v00004', title: 'The Only Git Tutorial You Need',                  views: 1_100_000, likes: 51_000, publishedAt: daysAgo(365) },
  { id: 45, videoId: 'prim_v00005', title: 'TypeScript Is Actually Good',                     views: 720_000, likes: 33_000, publishedAt: daysAgo(330) },
  { id: 46, videoId: 'prim_v00006', title: 'Stop Using VS Code',                              views: 1_800_000, likes: 83_000, publishedAt: daysAgo(295) },
  { id: 47, videoId: 'prim_v00007', title: 'Data Structures Every Dev Must Know',             views: 640_000, likes: 29_000, publishedAt: daysAgo(260) },
  { id: 48, videoId: 'prim_v00008', title: 'My Neovim Config Tour 2026',                      views: 490_000, likes: 23_000, publishedAt: daysAgo(225) },
  { id: 49, videoId: 'prim_v00009', title: 'Why Most Developers Write Slow Code',             views: 1_300_000, likes: 60_000, publishedAt: daysAgo(195) },
  { id: 50, videoId: 'prim_v00010', title: 'Learning Rust the Hard Way',                      views: 580_000, likes: 27_000, publishedAt: daysAgo(168) },
  { id: 51, videoId: 'prim_v00011', title: 'HTTP/2 vs HTTP/3 Explained',                      views: 410_000, likes: 19_000, publishedAt: daysAgo(145) },
  { id: 52, videoId: 'prim_v00012', title: 'How I Read Code',                                 views: 870_000, likes: 40_000, publishedAt: daysAgo(120) },
  { id: 53, videoId: 'prim_v00013', title: 'The Problem with Modern JavaScript',              views: 1_600_000, likes: 74_000, publishedAt: daysAgo(98)  },
  { id: 54, videoId: 'prim_v00014', title: 'tmux - The Most Underrated Dev Tool',             views: 390_000, likes: 18_000, publishedAt: daysAgo(78)  },
  { id: 55, videoId: 'prim_v00015', title: 'My 2026 Dev Setup Tour',                          views: 1_900_000, likes: 88_000, publishedAt: daysAgo(58)  },
  { id: 56, videoId: 'prim_v00016', title: 'I Rewrote My Server in Rust - Was It Worth It?', views: 760_000, likes: 35_000, publishedAt: daysAgo(42)  },
  { id: 57, videoId: 'prim_v00017', title: 'Algorithms You Actually Use at Work',             views: 530_000, likes: 24_000, publishedAt: daysAgo(29)  },
  { id: 58, videoId: 'prim_v00018', title: 'The Correct Way to Learn a Language',             views: 680_000, likes: 31_000, publishedAt: daysAgo(16)  },
  { id: 59, videoId: 'prim_v00019', title: 'Bun 2.0 Is Actually Impressive',                  views: 430_000, likes: 20_000, publishedAt: daysAgo(8)   },
  { id: 60, videoId: 'prim_v00020', title: 'I Tried Claude Code for a Week',                  views: 920_000, likes: 42_000, publishedAt: daysAgo(2)   },
]

function toVideoRows(raw: typeof TECHWITHTTIM_VIDEOS) {
  return raw.map(({ id, videoId, title, views, likes, publishedAt }) => ({
    id,
    videoId,
    title,
    publishedAt,
    thumbnailUrl: yt(videoId),
    viewCount: views,
    likeCount: likes,
    commentCount: Math.round(likes * 0.12),
  }))
}

const allVideos: Record<DemoChannelId, ReturnType<typeof toVideoRows>> = {
  [-1]: toVideoRows(TECHWITHTTIM_VIDEOS),
  [-2]: toVideoRows(FIRESHIP_VIDEOS),
  [-3]: toVideoRows(PRIMEAGEN_VIDEOS),
}

export function getDemoVideos(
  channelDbId: number,
  page: number,
  size: number,
  sort = 'publishedAt',
  dir = 'desc',
  q = '',
): VideosPageResponse {
  const id = channelDbId as DemoChannelId
  let items = [...(allVideos[id] ?? [])]

  if (q) {
    const lq = q.toLowerCase()
    items = items.filter((v) => v.title?.toLowerCase().includes(lq))
  }

  items.sort((a, b) => {
    const aVal = sort === 'viewCount' ? (a.viewCount ?? 0) : (a.publishedAt ?? '')
    const bVal = sort === 'viewCount' ? (b.viewCount ?? 0) : (b.publishedAt ?? '')
    if (aVal < bVal) return dir === 'asc' ? -1 : 1
    if (aVal > bVal) return dir === 'asc' ? 1 : -1
    return 0
  })

  const totalItems = items.length
  const totalPages = Math.max(1, Math.ceil(totalItems / size))
  const start = page * size
  return {
    items: items.slice(start, start + size),
    page: { page, size, totalItems, totalPages },
  }
}

// Re-export D7/D30 for convenience (unused externally but keeps types clean)
export { D7, D30 }
