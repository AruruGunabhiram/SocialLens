import { describe, it, expect } from 'vitest'
import {
  RefreshStatusSchema,
  ChannelItemSchema,
  VideoRowSchema,
  PageMetaSchema,
  VideosPageResponseSchema,
  ChannelMetricPointSchema,
  ChannelAnalyticsSchema,
  LocalUserSchema,
  AccountStatusSchema,
  OAuthStartResponseSchema,
  RetentionDropEventSchema,
  DiagnosisItemSchema,
  RetentionDiagnosisResponseSchema,
  TimeSeriesPointSchema,
  TimeSeriesResponseSchema,
  YouTubeSyncResponseSchema,
} from './schemas'

// ─── RefreshStatusSchema ──────────────────────────────────────────────────────

describe('RefreshStatusSchema', () => {
  it('accepts all valid enum values', () => {
    for (const v of ['NEVER_RUN', 'SUCCESS', 'FAILED', 'PARTIAL']) {
      expect(RefreshStatusSchema.parse(v)).toBe(v)
    }
  })

  it('rejects an unknown status string', () => {
    expect(() => RefreshStatusSchema.parse('PENDING')).toThrow()
  })
})

// ─── ChannelItemSchema ────────────────────────────────────────────────────────

describe('ChannelItemSchema', () => {
  const valid = { id: 1, channelId: 'UC123', active: true }

  it('parses with only required fields', () => {
    expect(ChannelItemSchema.parse(valid)).toMatchObject(valid)
  })

  it('parses with all optional fields populated', () => {
    const full = {
      ...valid,
      title: 'My Channel',
      handle: '@mychannel',
      description: 'Desc',
      thumbnailUrl: 'https://example.com/thumb.jpg',
      country: 'US',
      publishedAt: '2020-01-01',
      lastSuccessfulRefreshAt: '2024-01-01T00:00:00Z',
      lastRefreshStatus: 'SUCCESS',
      lastRefreshError: null,
      lastSnapshotAt: '2024-01-01',
      snapshotDayCount: 30,
      subscriberCount: 1000,
      viewCount: 50000,
      videoCount: 42,
    }
    const result = ChannelItemSchema.parse(full)
    expect(result.title).toBe('My Channel')
    expect(result.subscriberCount).toBe(1000)
  })

  it('rejects when id is missing', () => {
    expect(() => ChannelItemSchema.parse({ channelId: 'UC123', active: true })).toThrow()
  })

  it('rejects when channelId is missing', () => {
    expect(() => ChannelItemSchema.parse({ id: 1, active: true })).toThrow()
  })

  it('rejects when active is missing', () => {
    expect(() => ChannelItemSchema.parse({ id: 1, channelId: 'UC123' })).toThrow()
  })

  it('strips unknown extra fields', () => {
    const result = ChannelItemSchema.parse({ ...valid, unknownField: 'x' })
    expect(result).not.toHaveProperty('unknownField')
  })

  it('accepts null for nullish optional fields', () => {
    const result = ChannelItemSchema.parse({ ...valid, title: null, country: null })
    expect(result.title).toBeNull()
    expect(result.country).toBeNull()
  })
})

// ─── VideoRowSchema ───────────────────────────────────────────────────────────

describe('VideoRowSchema', () => {
  const valid = { id: 10, videoId: 'dQw4w9WgXcQ' }

  it('parses with only required fields', () => {
    expect(VideoRowSchema.parse(valid)).toMatchObject(valid)
  })

  it('parses optional metric counts', () => {
    const result = VideoRowSchema.parse({
      ...valid,
      viewCount: 999,
      likeCount: 50,
      commentCount: 5,
    })
    expect(result.viewCount).toBe(999)
    expect(result.likeCount).toBe(50)
  })

  it('rejects when id is missing', () => {
    expect(() => VideoRowSchema.parse({ videoId: 'abc' })).toThrow()
  })

  it('rejects when videoId is missing', () => {
    expect(() => VideoRowSchema.parse({ id: 1 })).toThrow()
  })

  it('strips unknown extra fields', () => {
    const result = VideoRowSchema.parse({ ...valid, extra: true })
    expect(result).not.toHaveProperty('extra')
  })
})

// ─── PageMetaSchema ───────────────────────────────────────────────────────────

describe('PageMetaSchema', () => {
  const valid = { page: 0, size: 20, totalItems: 100, totalPages: 5 }

  it('parses a valid page meta object', () => {
    expect(PageMetaSchema.parse(valid)).toEqual(valid)
  })

  it('rejects when totalItems is missing', () => {
    const { totalItems: _, ...rest } = valid
    expect(() => PageMetaSchema.parse(rest)).toThrow()
  })

  it('rejects when totalPages is missing', () => {
    const { totalPages: _, ...rest } = valid
    expect(() => PageMetaSchema.parse(rest)).toThrow()
  })
})

// ─── VideosPageResponseSchema ─────────────────────────────────────────────────

describe('VideosPageResponseSchema', () => {
  const valid = {
    items: [{ id: 1, videoId: 'abc' }],
    page: { page: 0, size: 20, totalItems: 1, totalPages: 1 },
  }

  it('parses a valid page response', () => {
    const result = VideosPageResponseSchema.parse(valid)
    expect(result.items).toHaveLength(1)
    expect(result.page.totalItems).toBe(1)
  })

  it('accepts an empty items array', () => {
    const result = VideosPageResponseSchema.parse({ ...valid, items: [] })
    expect(result.items).toEqual([])
  })

  it('rejects when items array is missing', () => {
    expect(() => VideosPageResponseSchema.parse({ page: valid.page })).toThrow()
  })
})

// ─── YouTubeSyncResponseSchema ────────────────────────────────────────────────

describe('YouTubeSyncResponseSchema', () => {
  const valid = {
    identifier: '@mkbhd',
    channelDbId: 1,
    channelId: 'UCBcRF18a7Qf58cMRHoN34oA',
    resolved: {
      channelId: 'UCBcRF18a7Qf58cMRHoN34oA',
      resolvedFrom: 'HANDLE',
      normalizedInput: '@mkbhd',
    },
    result: {
      videosFetched: 50,
      videosSaved: 50,
      videosUpdated: 0,
      pagesFetched: 2,
      pageSize: 25,
    },
    timing: {
      startedAt: '2024-01-01T00:00:00Z',
      finishedAt: '2024-01-01T00:00:05Z',
      durationMs: 5000,
    },
  }

  it('parses a valid sync response', () => {
    const result = YouTubeSyncResponseSchema.parse(valid)
    expect(result.channelDbId).toBe(1)
    expect(result.result.videosFetched).toBe(50)
  })

  it('accepts optional enrichment fields on result', () => {
    const result = YouTubeSyncResponseSchema.parse({
      ...valid,
      result: { ...valid.result, videosEnriched: 50, enrichmentErrors: 0 },
    })
    expect(result.result.videosEnriched).toBe(50)
  })

  it('accepts optional warnings array', () => {
    const result = YouTubeSyncResponseSchema.parse({ ...valid, warnings: ['slow API'] })
    expect(result.warnings).toEqual(['slow API'])
  })

  it('rejects when channelDbId is missing', () => {
    const { channelDbId: _, ...rest } = valid
    expect(() => YouTubeSyncResponseSchema.parse(rest)).toThrow()
  })
})

// ─── ChannelMetricPointSchema (passthrough) ───────────────────────────────────

describe('ChannelMetricPointSchema', () => {
  it('parses a point with just a date', () => {
    const result = ChannelMetricPointSchema.parse({ date: '2024-01-01' })
    expect(result.date).toBe('2024-01-01')
  })

  it('parses optional metric fields', () => {
    const result = ChannelMetricPointSchema.parse({
      date: '2024-01-01',
      views: 1000,
      subscribers: 500,
      uploads: 3,
    })
    expect(result.views).toBe(1000)
    expect(result.subscribers).toBe(500)
  })

  it('preserves unknown extra fields (passthrough)', () => {
    const result = ChannelMetricPointSchema.parse({ date: '2024-01-01', customField: 'keep' })
    expect((result as Record<string, unknown>).customField).toBe('keep')
  })

  it('rejects when date is missing', () => {
    expect(() => ChannelMetricPointSchema.parse({ views: 100 })).toThrow()
  })
})

// ─── ChannelAnalyticsSchema (passthrough) ────────────────────────────────────

describe('ChannelAnalyticsSchema', () => {
  it('parses with only channelId required', () => {
    const result = ChannelAnalyticsSchema.parse({ channelId: 'UC123' })
    expect(result.channelId).toBe('UC123')
  })

  it('parses with all optional fields', () => {
    const result = ChannelAnalyticsSchema.parse({
      channelId: 'UC123',
      title: 'Test',
      subscriberCount: 1000,
      totalViews: 50000,
      videoCount: 42,
    })
    expect(result.subscriberCount).toBe(1000)
  })

  it('preserves unknown extra fields (passthrough)', () => {
    const result = ChannelAnalyticsSchema.parse({ channelId: 'UC123', extra: 'stays' })
    expect((result as Record<string, unknown>).extra).toBe('stays')
  })

  it('rejects when channelId is missing', () => {
    expect(() => ChannelAnalyticsSchema.parse({ title: 'No ID' })).toThrow()
  })
})

// ─── LocalUserSchema ──────────────────────────────────────────────────────────

describe('LocalUserSchema', () => {
  const valid = { id: 1, email: 'user@example.com', name: 'Alice' }

  it('parses a valid user', () => {
    expect(LocalUserSchema.parse(valid)).toEqual(valid)
  })

  it('rejects when email is missing', () => {
    expect(() => LocalUserSchema.parse({ id: 1, name: 'Alice' })).toThrow()
  })

  it('rejects when name is missing', () => {
    expect(() => LocalUserSchema.parse({ id: 1, email: 'user@example.com' })).toThrow()
  })

  it('strips unknown extra fields', () => {
    const result = LocalUserSchema.parse({ ...valid, role: 'admin' })
    expect(result).not.toHaveProperty('role')
  })
})

// ─── AccountStatusSchema ──────────────────────────────────────────────────────

describe('AccountStatusSchema', () => {
  const valid = { userId: 1, platform: 'YOUTUBE', connected: true }

  it('parses a valid account status', () => {
    expect(AccountStatusSchema.parse(valid)).toMatchObject(valid)
  })

  it('accepts optional accountStatus field', () => {
    const result = AccountStatusSchema.parse({ ...valid, accountStatus: 'ACTIVE' })
    expect(result.accountStatus).toBe('ACTIVE')
  })

  it('rejects when connected is missing', () => {
    expect(() => AccountStatusSchema.parse({ userId: 1, platform: 'YOUTUBE' })).toThrow()
  })
})

// ─── OAuthStartResponseSchema ─────────────────────────────────────────────────

describe('OAuthStartResponseSchema', () => {
  it('parses a valid auth URL', () => {
    const result = OAuthStartResponseSchema.parse({ authUrl: 'https://accounts.google.com/...' })
    expect(result.authUrl).toContain('https://')
  })

  it('rejects when authUrl is missing', () => {
    expect(() => OAuthStartResponseSchema.parse({})).toThrow()
  })
})

// ─── RetentionDropEventSchema ─────────────────────────────────────────────────

describe('RetentionDropEventSchema', () => {
  const valid = {
    startProgress: 0.1,
    endProgress: 0.3,
    dropMagnitude: 0.2,
    slope: -5.0,
    severity: 'HIGH' as const,
  }

  it('parses a valid drop event', () => {
    expect(RetentionDropEventSchema.parse(valid)).toEqual(valid)
  })

  it('accepts all severity enum values', () => {
    for (const severity of ['LOW', 'MEDIUM', 'HIGH']) {
      expect(RetentionDropEventSchema.parse({ ...valid, severity })).toBeDefined()
    }
  })

  it('rejects an invalid severity value', () => {
    expect(() => RetentionDropEventSchema.parse({ ...valid, severity: 'CRITICAL' })).toThrow()
  })

  it('rejects when slope is missing', () => {
    const { slope: _, ...rest } = valid
    expect(() => RetentionDropEventSchema.parse(rest)).toThrow()
  })
})

// ─── DiagnosisItemSchema ──────────────────────────────────────────────────────

describe('DiagnosisItemSchema', () => {
  const valid = {
    label: 'Hook drop',
    severity: 'MEDIUM' as const,
    evidence: 'Viewers leave at 0:30',
    recommendation: 'Tighten the intro',
  }

  it('parses a valid diagnosis item', () => {
    expect(DiagnosisItemSchema.parse(valid)).toEqual(valid)
  })

  it('rejects when recommendation is missing', () => {
    const { recommendation: _, ...rest } = valid
    expect(() => DiagnosisItemSchema.parse(rest)).toThrow()
  })
})

// ─── RetentionDiagnosisResponseSchema ────────────────────────────────────────

describe('RetentionDiagnosisResponseSchema', () => {
  const valid = {
    videoId: 'dQw4w9WgXcQ',
    summary: 'Two major drop events detected',
    dropEvents: [],
    diagnoses: [],
  }

  it('parses a valid response with empty arrays', () => {
    const result = RetentionDiagnosisResponseSchema.parse(valid)
    expect(result.videoId).toBe('dQw4w9WgXcQ')
    expect(result.dropEvents).toEqual([])
  })

  it('rejects when summary is missing', () => {
    const { summary: _, ...rest } = valid
    expect(() => RetentionDiagnosisResponseSchema.parse(rest)).toThrow()
  })
})

// ─── TimeSeriesPointSchema ────────────────────────────────────────────────────

describe('TimeSeriesPointSchema', () => {
  it('parses a valid date+value point', () => {
    const result = TimeSeriesPointSchema.parse({ date: '2024-03-15', value: 12345 })
    expect(result).toEqual({ date: '2024-03-15', value: 12345 })
  })

  it('rejects when date is missing', () => {
    expect(() => TimeSeriesPointSchema.parse({ value: 100 })).toThrow()
  })

  it('rejects when value is missing', () => {
    expect(() => TimeSeriesPointSchema.parse({ date: '2024-03-15' })).toThrow()
  })

  it('rejects when value is a string', () => {
    expect(() => TimeSeriesPointSchema.parse({ date: '2024-03-15', value: '100' })).toThrow()
  })

  it('strips unknown extra fields', () => {
    const result = TimeSeriesPointSchema.parse({ date: '2024-03-15', value: 100, extra: 'x' })
    expect(result).not.toHaveProperty('extra')
  })
})

// ─── TimeSeriesResponseSchema (passthrough) ───────────────────────────────────

describe('TimeSeriesResponseSchema', () => {
  const valid = {
    channelDbId: 1,
    channelId: 'UC123',
    metric: 'VIEWS',
    rangeDays: 30,
    points: [{ date: '2024-01-01', value: 1000 }],
  }

  it('parses a fully-populated valid response', () => {
    const result = TimeSeriesResponseSchema.parse(valid)
    expect(result.points).toHaveLength(1)
    expect(result.metric).toBe('VIEWS')
  })

  it('parses with only points (all other fields are nullish)', () => {
    const result = TimeSeriesResponseSchema.parse({ points: [] })
    expect(result.points).toEqual([])
    expect(result.channelDbId).toBeUndefined()
  })

  it('rejects when points array is missing', () => {
    expect(() => TimeSeriesResponseSchema.parse({ channelDbId: 1, metric: 'VIEWS' })).toThrow()
  })

  it('rejects when a point has a non-numeric value', () => {
    expect(() =>
      TimeSeriesResponseSchema.parse({
        ...valid,
        points: [{ date: '2024-01-01', value: 'not-a-number' }],
      })
    ).toThrow()
  })

  it('preserves unknown extra fields (passthrough)', () => {
    const result = TimeSeriesResponseSchema.parse({ ...valid, extraMeta: 'keep' })
    expect((result as Record<string, unknown>).extraMeta).toBe('keep')
  })

  it('accepts null for nullish fields', () => {
    const result = TimeSeriesResponseSchema.parse({ ...valid, channelDbId: null, metric: null })
    expect(result.channelDbId).toBeNull()
    expect(result.metric).toBeNull()
  })
})
