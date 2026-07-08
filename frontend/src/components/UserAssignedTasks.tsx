import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { api, type AssignedTask } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import { usePreferences } from '../contexts/PreferencesContext'
import { useTaskSocket } from '../hooks/useTaskSocket'
import Button from './ui/Button'

const STATUS_OPTIONS = [
  { value: 'todo', label: 'À faire' },
  { value: 'in_progress', label: 'En cours' },
  { value: 'waiting', label: 'En attente' },
  { value: 'done', label: 'Terminée' },
]

const PRIORITY_COLORS: Record<string, string> = {
  urgente: 'border-red-500/50 bg-red-500/10',
  haute: 'border-orange-500/50 bg-orange-500/10',
  moyenne: 'border-amber-500/50 bg-amber-500/10',
  basse: 'border-emerald-500/50 bg-emerald-500/10',
}

interface UserAssignedTasksProps {
  variant?: 'home' | 'desk'
  onTasksChange?: (tasks: AssignedTask[]) => void
  showEmpty?: boolean
}

export default function UserAssignedTasks({
  variant = 'home',
  onTasksChange,
  showEmpty = true,
}: UserAssignedTasksProps) {
  const { user } = useAuth()
  const { t, preferences } = usePreferences()
  const [tasks, setTasks] = useState<AssignedTask[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const data = await api.getUserAssignedTasks()
      setTasks(data)
      onTasksChange?.(data)
      if (preferences.notifications && variant === 'home') {
        data.filter((task) => task.is_overdue).forEach((task) => {
          toast.warning(t.userTasks.overdue, { description: task.title, id: `overdue-${task.id}` })
        })
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false)
    }
  }, [onTasksChange, preferences.notifications, t.userTasks.overdue, variant])

  useTaskSocket({
    onTaskUpdate: load,
    enabled: !!user?.id,
  })

  useEffect(() => {
    load()
  }, [load])

  const updateStatus = async (taskId: string, status: string) => {
    try {
      await api.updateUserTaskStatus(taskId, status)
      toast.success(t.userTasks.statusUpdated)
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.common.error)
    }
  }

  if (loading) {
    return <p className="text-sm text-theme-muted">{t.common.loading}</p>
  }

  if (tasks.length === 0) {
    if (!showEmpty) return null
    return <p className="text-sm text-theme-muted">{t.userTasks.empty}</p>
  }

  const isDesk = variant === 'desk'

  return (
    <div className={isDesk ? 'space-y-4' : 'space-y-3'}>
      {tasks.map((task) => {
        const done = task.status === 'done' || task.status === 'validated'
        return (
          <div
            key={task.id}
            className={`rounded-xl border p-4 transition-all hover:shadow-md ${
              isDesk ? 'bg-slate-800/50 border-slate-700' : 'bg-theme-card'
            } ${PRIORITY_COLORS[task.priority] ?? 'border-theme'} ${done ? 'opacity-70' : ''}`}
          >
            <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
              <div className="min-w-0">
                <p className={`font-medium ${isDesk ? 'text-white' : 'text-theme'} ${done ? 'line-through' : ''}`}>
                  📋 {task.title}
                </p>
                <p className={`text-xs mt-1 ${isDesk ? 'text-slate-400' : 'text-theme-muted'}`}>{task.description}</p>
              </div>
              <span className="text-xs px-2 py-1 rounded-full border border-theme shrink-0 capitalize">
                {task.status_label}
              </span>
            </div>
            <div className={`flex flex-wrap gap-3 text-xs mb-3 ${isDesk ? 'text-slate-400' : 'text-theme-muted'}`}>
              <span className="capitalize">🔴 {task.priority}</span>
              {task.due_date && (
                <span className={task.is_overdue ? 'text-red-400' : ''}>
                  📅 {new Date(task.due_date).toLocaleDateString('fr-FR')}
                </span>
              )}
              <span>⏱️ {Math.round(task.estimated_minutes / 60)}h</span>
              <span>🧠 {task.difficulty}</span>
              {task.poste_label && <span>👤 {task.poste_label}</span>}
            </div>
            <div className={`h-2 rounded-full mb-3 overflow-hidden ${isDesk ? 'bg-slate-900' : 'bg-theme'}`}>
              <div
                className="h-full bg-gradient-to-r from-violet-500 to-cyan-500 rounded-full transition-all"
                style={{ width: `${task.progress}%` }}
              />
            </div>
            {!done && (
              <div className="flex flex-wrap gap-2">
                {STATUS_OPTIONS.filter((s) => s.value !== task.status).map((s) => (
                  <Button
                    key={s.value}
                    type="button"
                    variant="ghost"
                    className="text-xs py-1 px-2"
                    onClick={() => updateStatus(task.id, s.value)}
                  >
                    → {s.label}
                  </Button>
                ))}
              </div>
            )}
            {task.status === 'validated' && (
              <p className="text-xs text-emerald-400">✓ {t.userTasks.validated}</p>
            )}
          </div>
        )
      })}
    </div>
  )
}
