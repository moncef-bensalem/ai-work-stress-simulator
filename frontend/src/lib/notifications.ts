import { uuid } from './uuid'

export interface PlatformNotification {
  id: string
  type: string
  title: string
  message: string
  audience: 'user' | 'manager' | 'admin'
  timestamp: string
  read?: boolean
  task_id?: string | null
}

export type TaskNotification = PlatformNotification

export function normalizeNotification(raw: Partial<PlatformNotification>): PlatformNotification {
  return {
    id: raw.id ?? uuid(),
    type: raw.type ?? 'info',
    title: raw.title ?? 'Notification',
    message: raw.message ?? '',
    audience: raw.audience ?? 'user',
    timestamp: raw.timestamp ?? new Date().toISOString(),
    read: raw.read ?? false,
    task_id: raw.task_id ?? null,
  }
}
