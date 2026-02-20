import axios from 'axios'

import { normalizeHttpError } from './httpError'

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081'

export const axiosClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  withCredentials: false,
  timeout: 30_000,
})

axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    return Promise.reject(normalizeHttpError(error))
  }
)
