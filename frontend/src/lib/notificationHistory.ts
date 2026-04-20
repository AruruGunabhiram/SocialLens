export type NotifType = 'success' | 'error' | 'warning' | 'info'

export type NotificationEntry = {
  id: string
  message: string
  description?: string
  type: NotifType
  timestamp: number
}

const MAX = 5
const entries: NotificationEntry[] = []
const listeners = new Set<() => void>()

export function addNotification(entry: Omit<NotificationEntry, 'id' | 'timestamp'>): void {
  entries.unshift({
    ...entry,
    id: Math.random().toString(36).slice(2),
    timestamp: Date.now(),
  })
  if (entries.length > MAX) entries.splice(MAX)
  listeners.forEach((fn) => fn())
}

export function getNotifications(): NotificationEntry[] {
  return [...entries]
}

export function subscribeNotifications(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
