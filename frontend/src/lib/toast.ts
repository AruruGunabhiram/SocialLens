import { toast } from 'sonner'

import { isAppError } from '@/api/httpError'

export const toastError = (error: unknown, fallback = 'Something went wrong') => {
  if (isAppError(error)) {
    toast.error(error.message, {
      description: typeof error.details === 'string' ? error.details : undefined,
    })
    return
  }

  if (error instanceof Error) {
    toast.error(error.message)
    return
  }

  toast.error(fallback)
}

export const toastSuccess = (message: string, description?: string) => {
  toast.success(message, { description })
}

export const toastWarning = (message: string, description?: string) => {
  toast.warning(message, { description })
}

export const toastInfo = (message: string, description?: string) => {
  toast.info(message, { description })
}
