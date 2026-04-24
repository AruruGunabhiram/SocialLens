import axios from 'axios'

import { normalizeHttpError } from './httpError'
import { toastMessage } from '@/lib/toast'

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081'

export const axiosClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  withCredentials: false,
  timeout: 15_000,
})

axiosClient.interceptors.request.use((config) => {
  if (import.meta.env.DEV) {
    console.debug(
      `[api] ${config.method?.toUpperCase()} ${config.baseURL ?? ''}${config.url ?? ''}`
    )
  }
  // TODO: attach Bearer token here when auth is implemented
  // const token = authStore.getToken()
  // if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status

      if (status === 401) {
        window.location.replace('/connect')
        return Promise.reject(normalizeHttpError(error))
      }

      if (status === 403) {
        toastMessage('Access denied', 'warning')
        return Promise.reject({ ...normalizeHttpError(error), globallyHandled: true })
      }

      if (status === 500) {
        toastMessage('Server error — please try again', 'error')
        return Promise.reject({ ...normalizeHttpError(error), globallyHandled: true })
      }

      // Request timeout (ECONNABORTED) or response timeout (ETIMEDOUT)
      if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        toastMessage('Request timed out — the server may be slow', 'error')
        return Promise.reject({ ...normalizeHttpError(error), globallyHandled: true })
      }

      // Network error: request sent but no response received
      if (!error.response) {
        toastMessage('Cannot reach server — check your connection', 'error')
        return Promise.reject({ ...normalizeHttpError(error), globallyHandled: true })
      }
    }

    return Promise.reject(normalizeHttpError(error))
  }
)
