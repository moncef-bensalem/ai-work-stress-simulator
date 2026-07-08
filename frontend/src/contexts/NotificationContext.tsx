import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { toast } from 'sonner'
import { useAuth } from './AuthContext'
import { usePreferences } from './PreferencesContext'
import { connectSocket, resetSocket } from '../lib/socket'
import { normalizeNotification, type PlatformNotification } from '../lib/notifications'
import { speakAria } from '../lib/ariaSpeech'
import type { AssignedTask } from '../lib/api'

const STORAGE_KEY = 'platform_notifications'

interface NotificationContextType {
  notifications: PlatformNotification[]
  unreadCount: number
  markRead: (id: string) => void
  markAllRead: () => void
  clearAll: () => void
  onTaskUpdate?: (task: AssignedTask, event: string) => void
  setTaskUpdateHandler: (handler: ((task: AssignedTask, event: string) => void) | undefined) => void
}

const NotificationContext = createContext<NotificationContextType | null>(null)

function loadStored(userId: string): PlatformNotification[] {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}:${userId}`)
    if (!raw) return []
    return JSON.parse(raw) as PlatformNotification[]
  } catch {
    return []
  }
}

function saveStored(userId: string, items: PlatformNotification[]) {
  localStorage.setItem(`${STORAGE_KEY}:${userId}`, JSON.stringify(items.slice(0, 50)))
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const { preferences } = usePreferences()
  const [notifications, setNotifications] = useState<PlatformNotification[]>([])
  const taskHandlerRef = useRef<
    ((task: AssignedTask, event: string) => void) | undefined
  >(undefined)

  useEffect(() => {
    if (!user?.id) {
      setNotifications([])
      return
    }
    setNotifications(loadStored(user.id))
  }, [user?.id])

  const pushNotification = useCallback(
    (raw: Partial<PlatformNotification>) => {
      if (!user?.id) return
      const note = normalizeNotification(raw)
      setNotifications((prev) => {
        const next = [note, ...prev.filter((n) => n.id !== note.id)].slice(0, 50)
        saveStored(user.id, next)
        return next
      })

      if (preferences.notifications) {
        toast.info(`🔔 ${note.title}`, { description: note.message, duration: 7000 })
        const speech = `${note.title}. ${note.message}`
        speakAria(speech, preferences.language, preferences.aria_volume)
      }
    },
    [user?.id, preferences.notifications, preferences.language, preferences.aria_volume],
  )

  const pushNotificationRef = useRef(pushNotification)
  pushNotificationRef.current = pushNotification

  useEffect(() => {
    if (!user?.id) return
    const token = localStorage.getItem('access_token')
    if (!token) return

    resetSocket()
    const socket = connectSocket()

    const join = () => {
      socket.emit('join_user_inbox', { token, user_id: user.id })
      if (user.role === 'manager' || user.role === 'admin') {
        socket.emit('join_manager_board', { token, manager_id: user.id })
      }
      if (user.role === 'admin') {
        socket.emit('join_admin_hub', { token })
      }
    }

    if (socket.connected) join()
    socket.on('connect', join)

    const onPlatformNotification = (payload: Partial<PlatformNotification>) => {
      pushNotificationRef.current(payload)
    }

    const onTaskUpdate = (payload: { event: string; task: AssignedTask }) => {
      taskHandlerRef.current?.(payload.task, payload.event)
    }

    socket.on('platform_notification', onPlatformNotification)
    socket.on('task_notification', onPlatformNotification)
    socket.on('assigned_task_update', onTaskUpdate)

    return () => {
      socket.off('connect', join)
      socket.off('platform_notification', onPlatformNotification)
      socket.off('task_notification', onPlatformNotification)
      socket.off('assigned_task_update', onTaskUpdate)
    }
  }, [user?.id, user?.role])

  const markRead = useCallback(
    (id: string) => {
      if (!user?.id) return
      setNotifications((prev) => {
        const next = prev.map((n) => (n.id === id ? { ...n, read: true } : n))
        saveStored(user.id, next)
        return next
      })
    },
    [user?.id],
  )

  const markAllRead = useCallback(() => {
    if (!user?.id) return
    setNotifications((prev) => {
      const next = prev.map((n) => ({ ...n, read: true }))
      saveStored(user.id, next)
      return next
    })
  }, [user?.id])

  const clearAll = useCallback(() => {
    if (!user?.id) return
    setNotifications([])
    localStorage.removeItem(`${STORAGE_KEY}:${user.id}`)
  }, [user?.id])

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications],
  )

  const setTaskUpdateHandler = useCallback(
    (handler: ((task: AssignedTask, event: string) => void) | undefined) => {
      taskHandlerRef.current = handler
    },
    [],
  )

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      markRead,
      markAllRead,
      clearAll,
      setTaskUpdateHandler,
    }),
    [notifications, unreadCount, markRead, markAllRead, clearAll, setTaskUpdateHandler],
  )

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const ctx = useContext(NotificationContext)
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider')
  return ctx
}

export function useNotificationLabel(type: string): string {
  const { t } = usePreferences()
  const labels = t.notifications.types as Record<string, string>
  return labels[type] ?? type
}
