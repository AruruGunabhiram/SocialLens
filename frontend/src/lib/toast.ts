import { toast } from 'sonner'

import { isAppError } from '@/api/httpError'
import { addNotification } from './notificationHistory'

export const toastLoading = (message: string): string | number => toast.loading(message)

export const toastDismiss = (id?: string | number): void => toast.dismiss(id)

export const toastError = (error: unknown, fallback = 'Something went wrong') => {
  const opts = { duration: 6000, closeButton: true as const }

  if (isAppError(error)) {
    const description = typeof error.details === 'string' ? error.details : undefined
    toast.error(error.message, { ...opts, description })
    addNotification({ message: error.message, description, type: 'error' })
    return
  }

  if (error instanceof Error) {
    toast.error(error.message, opts)
    addNotification({ message: error.message, type: 'error' })
    return
  }

  toast.error(fallback, opts)
  addNotification({ message: fallback, type: 'error' })
}

export const toastSuccess = (message: string, description?: string) => {
  toast.success(message, { description, duration: 4000 })
  addNotification({ message, description, type: 'success' })
}

export const toastWarning = (message: string, description?: string) => {
  toast.warning(message, { description, duration: 4000 })
  addNotification({ message, description, type: 'warning' })
}

export const toastInfo = (message: string, description?: string) => {
  toast.info(message, { description, duration: 4000 })
  addNotification({ message, description, type: 'info' })
}
