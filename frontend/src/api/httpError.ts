import axios, { AxiosError } from 'axios'
import { ZodError } from 'zod'

export type AppError = {
  status?: number
  code?: string
  message: string
  details?: unknown
  requestId?: string
}

export const isAppError = (value: unknown): value is AppError => {
  return typeof value === 'object' && value !== null && 'message' in value
}

const extractAxiosError = (error: AxiosError): AppError => {
  const status = error.response?.status
  const code =
    (error.response?.data as { code?: string } | undefined)?.code ||
    error.code ||
    (status ? `HTTP_${status}` : undefined)
  const message =
    (error.response?.data as { message?: string } | undefined)?.message ||
    error.message ||
    'Request failed'
  const requestId =
    (error.response?.headers as Record<string, string | undefined> | undefined)?.['x-request-id'] ||
    (error.response?.data as { requestId?: string } | undefined)?.requestId

  return {
    status,
    code,
    message,
    details: error.response?.data,
    requestId,
  }
}

export function normalizeHttpError(error: unknown): AppError {
  // Must be checked before isAppError: ZodError has a `message` property and
  // would otherwise pass the isAppError guard, leaking a raw ZodError object.
  if (error instanceof ZodError) {
    return {
      message: 'Unsupported response format',
      code: 'PARSE_ERROR',
      details: error.issues[0]?.message ?? 'unexpected shape',
    }
  }

  if (axios.isAxiosError(error)) {
    return extractAxiosError(error)
  }

  // Already normalized by the response interceptor  -  pass through unchanged
  if (isAppError(error)) {
    return error
  }

  if (error instanceof Error) {
    return {
      message: error.message,
    }
  }

  return {
    message: 'Request failed',
  }
}
