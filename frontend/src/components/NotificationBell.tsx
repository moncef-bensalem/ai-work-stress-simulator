import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNotifications, useNotificationLabel } from '../contexts/NotificationContext'
import { usePreferences } from '../contexts/PreferencesContext'
import type { PlatformNotification } from '../lib/notifications'

const AUDIENCE_ICON: Record<string, string> = {
  user: '👤',
  manager: '📊',
  admin: '⚙️',
}

const TYPE_ICON: Record<string, string> = {
  task_assigned: '📋',
  task_assigned_team: '✅',
  task_completed: '🎯',
  task_started: '▶️',
  task_validated: '✓',
  task_overdue: '⏰',
  task_overdue_team: '⚠️',
  admin_task_activity: '🏢',
  admin_task_completed: '📈',
  admin_task_validated: '✔️',
}

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

export default function NotificationBell() {
  const { notifications, unreadCount, markRead, markAllRead, clearAll } = useNotifications()
  const { t } = usePreferences()
  const [open, setOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [panelPos, setPanelPos] = useState({ top: 0, right: 16 })

  const updatePanelPos = useCallback(() => {
    const btn = buttonRef.current
    if (!btn) return
    const rect = btn.getBoundingClientRect()
    setPanelPos({
      top: rect.bottom + 8,
      right: Math.max(16, window.innerWidth - rect.right),
    })
  }, [])

  useEffect(() => {
    if (!open) return
    updatePanelPos()
    const onScrollOrResize = () => updatePanelPos()
    window.addEventListener('scroll', onScrollOrResize, true)
    window.addEventListener('resize', onScrollOrResize)
    return () => {
      window.removeEventListener('scroll', onScrollOrResize, true)
      window.removeEventListener('resize', onScrollOrResize)
    }
  }, [open, updatePanelPos])

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        panelRef.current?.contains(target) ||
        buttonRef.current?.contains(target)
      ) {
        return
      }
      setOpen(false)
    }
    if (open) document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  const toggle = () => {
    setOpen((prev) => {
      const next = !prev
      if (next) {
        requestAnimationFrame(updatePanelPos)
      }
      return next
    })
  }

  const panel = open
    ? createPortal(
        <div
          ref={panelRef}
          className="fixed w-80 sm:w-96 max-h-[420px] overflow-hidden rounded-xl border border-theme bg-[var(--bg-elevated)] shadow-2xl z-[9999] animate-fade-up"
          style={{ top: panelPos.top, right: panelPos.right }}
          role="dialog"
          aria-label={t.notifications.title}
        >
          <div className="flex items-center justify-between p-4 border-b border-theme">
            <p className="font-semibold text-theme text-sm">{t.notifications.title}</p>
            <div className="flex gap-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="text-xs text-violet-400 hover:text-violet-300"
                >
                  {t.notifications.markAllRead}
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-xs text-theme-muted hover:text-theme"
                >
                  {t.notifications.clear}
                </button>
              )}
            </div>
          </div>

          <div className="overflow-y-auto max-h-[340px]">
            {notifications.length === 0 ? (
              <p className="p-6 text-sm text-theme-muted text-center">{t.notifications.empty}</p>
            ) : (
              notifications.map((note) => (
                <NotificationItem
                  key={note.id}
                  note={note}
                  onRead={() => markRead(note.id)}
                />
              ))
            )}
          </div>
        </div>,
        document.body,
      )
    : null

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        className="relative p-2 rounded-xl border border-theme text-theme-muted hover:text-theme hover:border-violet-400/40 transition-colors"
        aria-label={t.notifications.title}
        aria-expanded={open}
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      {panel}
    </>
  )
}

function NotificationItem({
  note,
  onRead,
}: {
  note: PlatformNotification
  onRead: () => void
}) {
  const typeLabel = useNotificationLabel(note.type)
  const icon = TYPE_ICON[note.type] ?? AUDIENCE_ICON[note.audience] ?? '🔔'

  return (
    <button
      type="button"
      onClick={onRead}
      className={`w-full text-left p-4 border-b border-theme/50 hover:bg-white/5 transition-colors ${
        !note.read ? 'bg-violet-500/5' : ''
      }`}
    >
      <div className="flex gap-3">
        <span className="text-lg shrink-0">{icon}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className={`text-sm font-medium ${!note.read ? 'text-theme' : 'text-theme-muted'}`}>
              {note.title}
            </p>
            {!note.read && <span className="w-2 h-2 rounded-full bg-violet-400 shrink-0 mt-1.5" />}
          </div>
          <p className="text-xs text-theme-muted mt-1 line-clamp-2">{note.message}</p>
          <div className="flex gap-2 mt-2 text-[10px] text-theme-muted">
            <span className="px-1.5 py-0.5 rounded bg-theme-card border border-theme">{typeLabel}</span>
            <span>{formatTime(note.timestamp)}</span>
          </div>
        </div>
      </div>
    </button>
  )
}

function BellIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
      />
    </svg>
  )
}
