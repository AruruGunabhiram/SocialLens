/**
 * Unit tests for normalizeHttpError().
 *
 * No network calls, no axios module mocking needed.
 * axios.isAxiosError() only checks `payload.isAxiosError === true`, so we
 * construct minimal fake objects that satisfy the type guards directly.
 */
import { ZodError } from 'zod'
import type { AxiosError } from 'axios'

import { normalizeHttpError, isAppError } from './httpError'
import type { AppError } from './httpError'

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Build a minimal fake AxiosError.
 * `errorCode` maps to `error.code` (e.g. 'ERR_BAD_REQUEST').
 * Omit it to exercise the HTTP_{status} fallback code path.
 */
function fakeAxiosError(
  status: number,
  responseData: Record<string, unknown> = {},
  responseHeaders: Record<string, string> = {},
  errorCode?: string
): AxiosError {
  return {
    isAxiosError: true,
    name: 'AxiosError',
    message: `Request failed with status code ${status}`,
    code: errorCode,
    response: { status, data: responseData, headers: responseHeaders },
    toJSON: () => ({}),
  } as unknown as AxiosError
}

/** Build a ZodError with one known issue. */
function fakeZodError(issueMessage = 'Required'): ZodError {
  return new ZodError([
    {
      code: 'invalid_type',
      expected: 'number',
      received: 'undefined',
      path: ['points', 0, 'value'],
      message: issueMessage,
    },
  ])
}

// ── Axios 404 ──────────────────────────────────────────────────────────────

describe('normalizeHttpError – axios 404', () => {
  it('captures status 404', () => {
    const err = fakeAxiosError(404, { message: 'Channel not found', code: 'CHANNEL_NOT_FOUND' })
    expect(normalizeHttpError(err).status).toBe(404)
  })

  it('uses the backend response message', () => {
    const err = fakeAxiosError(404, { message: 'Channel not found', code: 'CHANNEL_NOT_FOUND' })
    expect(normalizeHttpError(err).message).toBe('Channel not found')
  })

  it('uses the backend response code when present', () => {
    const err = fakeAxiosError(404, { message: 'Channel not found', code: 'CHANNEL_NOT_FOUND' })
    expect(normalizeHttpError(err).code).toBe('CHANNEL_NOT_FOUND')
  })

  it('falls back to HTTP_404 when neither response.data.code nor error.code is set', () => {
    // no code in data, no errorCode argument → HTTP_404 fallback
    const err = fakeAxiosError(404, { message: 'Not found' })
    expect(normalizeHttpError(err).code).toBe('HTTP_404')
  })

  it('falls back to axios message when response body has no message', () => {
    const err = fakeAxiosError(404, {})
    expect(normalizeHttpError(err).message).toBe('Request failed with status code 404')
  })
})

// ── Axios 429 (rate limit) ─────────────────────────────────────────────────

describe('normalizeHttpError – axios 429', () => {
  it('captures status 429', () => {
    const err = fakeAxiosError(429, { message: 'Rate limit exceeded. Retry after 60 s.' })
    expect(normalizeHttpError(err).status).toBe(429)
  })

  it('preserves the rate-limit message from the backend', () => {
    const err = fakeAxiosError(429, { message: 'Rate limit exceeded. Retry after 60 s.' })
    expect(normalizeHttpError(err).message).toBe('Rate limit exceeded. Retry after 60 s.')
  })

  it('uses HTTP_429 fallback code when backend sends none', () => {
    const err = fakeAxiosError(429, { message: 'Too many requests' }) // no data.code, no errorCode
    expect(normalizeHttpError(err).code).toBe('HTTP_429')
  })

  it('captures x-request-id from response headers', () => {
    const err = fakeAxiosError(429, {}, { 'x-request-id': 'req-abc-123' })
    expect(normalizeHttpError(err).requestId).toBe('req-abc-123')
  })
})

// ── Zod validation failure ─────────────────────────────────────────────────

describe('normalizeHttpError – ZodError', () => {
  it('returns "Unsupported response format" as the user-visible message', () => {
    const result = normalizeHttpError(fakeZodError('Expected number, received undefined'))
    expect(result.message).toBe('Unsupported response format')
  })

  it('sets code to PARSE_ERROR', () => {
    const result = normalizeHttpError(fakeZodError())
    expect(result.code).toBe('PARSE_ERROR')
  })

  it('includes the first Zod issue message as a safe details summary', () => {
    const result = normalizeHttpError(fakeZodError('Expected number, received undefined'))
    // details is a safe schema summary — no raw data values from the response
    expect(result.details).toBe('Expected number, received undefined')
  })

  it('defaults details to "unexpected shape" when ZodError has no issues', () => {
    const result = normalizeHttpError(new ZodError([]))
    expect(result.details).toBe('unexpected shape')
  })

  it('does NOT leak the raw ZodError object (no issues array on result)', () => {
    const result = normalizeHttpError(fakeZodError())
    expect(result).not.toHaveProperty('issues')
  })
})

// ── Other inputs ───────────────────────────────────────────────────────────

describe('normalizeHttpError – other inputs', () => {
  it('passes through an already-normalized AppError unchanged', () => {
    const appErr: AppError = { status: 403, message: 'Forbidden', code: 'FORBIDDEN' }
    expect(normalizeHttpError(appErr)).toEqual(appErr)
  })

  it('wraps a generic Error with its message', () => {
    const result = normalizeHttpError(new Error('network timeout'))
    expect(result.message).toBe('network timeout')
    expect(result.status).toBeUndefined()
  })

  it('returns a fallback message for unknown thrown values (strings, numbers, etc.)', () => {
    expect(normalizeHttpError('something weird')).toEqual({ message: 'Request failed' })
    expect(normalizeHttpError(42)).toEqual({ message: 'Request failed' })
    expect(normalizeHttpError(null)).toEqual({ message: 'Request failed' })
  })
})

// ── isAppError type guard ──────────────────────────────────────────────────

describe('isAppError', () => {
  it('returns true for objects with a message string', () => {
    expect(isAppError({ message: 'oops' })).toBe(true)
  })

  it('returns false for null, primitives, and objects without message', () => {
    expect(isAppError(null)).toBe(false)
    expect(isAppError('string')).toBe(false)
    expect(isAppError({ code: 'X' })).toBe(false)
  })
})
