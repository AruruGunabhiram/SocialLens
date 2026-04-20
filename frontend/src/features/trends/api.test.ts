import { vi, describe, it, expect, beforeEach } from 'vitest'
import { fetchTimeSeries } from './api'

vi.mock('@/api/axiosClient', () => ({
  axiosClient: { get: vi.fn() },
}))

import { axiosClient } from '@/api/axiosClient'

const mockGet = vi.mocked(axiosClient.get)

function makeResponse(pointsOverride: unknown[] = [], extra: Record<string, unknown> = {}) {
  return {
    data: {
      channelDbId: 1,
      channelId: 'UC123',
      metric: 'VIEWS',
      rangeDays: 30,
      points: pointsOverride,
      ...extra,
    },
  }
}

describe('fetchTimeSeries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── Unified value field ───────────────────────────────────────────────────

  it('returns points unchanged when backend already sends value field', async () => {
    mockGet.mockResolvedValueOnce(
      makeResponse([
        { date: '2024-01-01', value: 1000 },
        { date: '2024-01-02', value: 2000 },
      ])
    )
    const result = await fetchTimeSeries(1, 'VIEWS', 30)
    expect(result.points).toEqual([
      { date: '2024-01-01', value: 1000 },
      { date: '2024-01-02', value: 2000 },
    ])
  })

  it('value field takes priority over the per-metric field when both present', async () => {
    mockGet.mockResolvedValueOnce(makeResponse([{ date: '2024-01-01', value: 9999, views: 1111 }]))
    const result = await fetchTimeSeries(1, 'VIEWS', 30)
    expect(result.points[0].value).toBe(9999)
  })

  // ── Per-metric field mapping ──────────────────────────────────────────────

  it('maps views → value for VIEWS metric when value is absent', async () => {
    mockGet.mockResolvedValueOnce(makeResponse([{ date: '2024-01-01', views: 5000 }]))
    const result = await fetchTimeSeries(1, 'VIEWS', 30)
    expect(result.points[0].value).toBe(5000)
  })

  it('maps subscribers → value for SUBSCRIBERS metric', async () => {
    mockGet.mockResolvedValueOnce(
      makeResponse([{ date: '2024-01-01', subscribers: 300 }], { metric: 'SUBSCRIBERS' })
    )
    const result = await fetchTimeSeries(1, 'SUBSCRIBERS', 30)
    expect(result.points[0].value).toBe(300)
  })

  it('maps uploads → value for UPLOADS metric', async () => {
    mockGet.mockResolvedValueOnce(
      makeResponse([{ date: '2024-01-01', uploads: 10 }], { metric: 'UPLOADS' })
    )
    const result = await fetchTimeSeries(1, 'UPLOADS', 30)
    expect(result.points[0].value).toBe(10)
  })

  it('does not cross-map fields (SUBSCRIBERS metric ignores views field)', async () => {
    // point has `views` but not `subscribers`; value should not be mapped
    mockGet.mockResolvedValueOnce(
      makeResponse([{ date: '2024-01-01', views: 500 }], { metric: 'SUBSCRIBERS' })
    )
    // Zod will fail because the mapped point has no `value`
    await expect(fetchTimeSeries(1, 'SUBSCRIBERS', 30)).rejects.toMatchObject({
      code: 'PARSE_ERROR',
    })
  })

  // ── Ascending sort ────────────────────────────────────────────────────────

  it('returns points in ascending date order when backend sends them out of order', async () => {
    mockGet.mockResolvedValueOnce(
      makeResponse([
        { date: '2024-01-03', value: 300 },
        { date: '2024-01-01', value: 100 },
        { date: '2024-01-02', value: 200 },
      ])
    )
    const result = await fetchTimeSeries(1, 'VIEWS', 30)
    expect(result.points.map((p) => p.date)).toEqual(['2024-01-01', '2024-01-02', '2024-01-03'])
  })

  it('preserves order when points are already sorted', async () => {
    mockGet.mockResolvedValueOnce(
      makeResponse([
        { date: '2024-01-01', value: 100 },
        { date: '2024-01-02', value: 200 },
      ])
    )
    const result = await fetchTimeSeries(1, 'VIEWS', 30)
    expect(result.points.map((p) => p.date)).toEqual(['2024-01-01', '2024-01-02'])
  })

  it('returns an empty points array when backend sends none', async () => {
    mockGet.mockResolvedValueOnce(makeResponse([]))
    const result = await fetchTimeSeries(1, 'VIEWS', 30)
    expect(result.points).toEqual([])
  })

  // ── Response shape passthrough ────────────────────────────────────────────

  it('forwards channelDbId and metric from the backend response', async () => {
    mockGet.mockResolvedValueOnce(makeResponse([], { metric: 'SUBSCRIBERS' }))
    const result = await fetchTimeSeries(1, 'SUBSCRIBERS', 30)
    expect(result.channelDbId).toBe(1)
    expect(result.metric).toBe('SUBSCRIBERS')
  })

  // ── Zod parse failure ─────────────────────────────────────────────────────

  it('gracefully returns empty points when backend response omits the points array', async () => {
    // fetchTimeSeries substitutes [] before Zod validation, so missing points
    // does NOT throw  -  it resolves with an empty points array.
    mockGet.mockResolvedValueOnce({ data: { channelDbId: 1, metric: 'VIEWS' } })
    const result = await fetchTimeSeries(1, 'VIEWS', 30)
    expect(result.points).toEqual([])
  })

  it('throws PARSE_ERROR when a point has a non-numeric value', async () => {
    mockGet.mockResolvedValueOnce(makeResponse([{ date: '2024-01-01', value: 'not-a-number' }]))
    await expect(fetchTimeSeries(1, 'VIEWS', 30)).rejects.toMatchObject({
      code: 'PARSE_ERROR',
    })
  })
})
