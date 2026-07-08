import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { api, type AssignedTask, type Task } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import { usePreferences } from '../contexts/PreferencesContext'
import { useAriaChat } from '../hooks/useAriaChat'
import { useMetrics } from '../hooks/useMetrics'
import TaskList from '../components/TaskList'
import StressSlider from '../components/StressSlider'
import ChatPanel from '../components/ChatPanel'
import MetricsPanel from '../components/MetricsPanel'
import LiveStressChart from '../components/LiveStressChart'
import UserAssignedTasks from '../components/UserAssignedTasks'
import NotificationBell from '../components/NotificationBell'
import Button from '../components/ui/Button'

export default function DeskPage() {
  const { user, logout } = useAuth()
  const { preferences, t } = usePreferences()
  const navigate = useNavigate()
  const [sessionId] = useState(() => localStorage.getItem('current_session_id'))
  const [tasks, setTasks] = useState<Task[]>([])
  const [assignedTasks, setAssignedTasks] = useState<AssignedTask[]>([])
  const [stress, setStress] = useState(5)
  const [loading, setLoading] = useState(true)
  const [closing, setClosing] = useState(false)
  const stressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const debriefPromptedRef = useRef(false)

  const aria = useAriaChat(sessionId)
  const { metrics, loading: metricsLoading, refresh: refreshMetrics } = useMetrics(sessionId)

  const loadTasks = useCallback(async () => {
    if (!sessionId) return
    const data = await api.getTasks(sessionId)
    setTasks(data)
  }, [sessionId])

  useEffect(() => {
    if (!sessionId) {
      navigate('/')
      return
    }
    loadTasks()
      .catch(() => toast.error(t.desk.loadTasksError))
      .finally(() => setLoading(false))
  }, [sessionId, navigate, loadTasks, t.desk.loadTasksError])

  useEffect(() => {
    if (aria.phase !== 'debriefing' || debriefPromptedRef.current || !preferences.notifications) return
    debriefPromptedRef.current = true
    toast.info(t.desk.debriefToast, { duration: 6000 })
  }, [aria.phase, preferences.notifications, t.desk.debriefToast])

  const handleCloseSession = async () => {
    if (!sessionId) return
    setClosing(true)
    try {
      const report = await api.closeSession(sessionId)
      navigate(`/debrief/${sessionId}`, { state: { report } })
      localStorage.removeItem('current_session_id')
      toast.success(t.desk.sessionClosed)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.desk.closeError)
    } finally {
      setClosing(false)
    }
  }

  const handleComplete = async (id: string) => {
    try {
      await api.updateTask(id, { status: 'completed' })
      toast.success(t.desk.taskDone)
      await loadTasks()
      await aria.loadHistory()
      await refreshMetrics()
    } catch {
      toast.error(t.desk.updateError)
    }
  }

  const handleDelegate = async (id: string) => {
    try {
      await api.updateTask(id, { status: 'delegated' })
      toast.info(t.desk.taskDelegated)
      await loadTasks()
      await aria.loadHistory()
      await refreshMetrics()
    } catch {
      toast.error(t.desk.delegateError)
    }
  }

  const handleReorder = async (reordered: Task[]) => {
    setTasks(reordered)
    await Promise.all(
      reordered.map((task, index) => api.updateTask(task.id, { sort_order: index }))
    )
  }

  const handleStressChange = (level: number) => {
    setStress(level)
    if (!sessionId) return
    if (stressTimerRef.current) clearTimeout(stressTimerRef.current)
    stressTimerRef.current = setTimeout(async () => {
      try {
        await api.recordStress(sessionId, level)
        await refreshMetrics()
        if (level >= 8 && preferences.notifications) {
          toast.warning(t.desk.stressHigh)
        }
      } catch {
        toast.error(t.desk.stressSaveError)
      }
    }, 500)
  }

  useEffect(() => {
    return () => {
      if (stressTimerRef.current) clearTimeout(stressTimerRef.current)
    }
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-base)] flex items-center justify-center text-theme-muted">
        {t.desk.loading}
      </div>
    )
  }

  const pendingAssigned = assignedTasks.filter(
    (task) => !['done', 'validated'].includes(task.status),
  ).length
  const pendingSimulation = tasks.filter(
    (task) => task.status === 'pending' || task.status === 'in_progress',
  ).length
  const pending = pendingAssigned + pendingSimulation

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-theme flex auth-bg">
      <aside className="w-64 border-r border-theme flex flex-col shrink-0 bg-theme-card/30 backdrop-blur-xl">
        <div className="p-4 border-b border-theme flex items-start justify-between gap-2">
          <div>
            <p className="text-xs text-[var(--accent-primary)] uppercase tracking-wider">{t.desk.virtualDesk}</p>
            <p className="text-theme font-medium mt-1">{user?.full_name}</p>
            <p className="text-xs text-theme-muted mt-1">{t.desk.phase} : {aria.phaseLabel}</p>
          </div>
          <NotificationBell />
        </div>
        <div className="p-4 space-y-4 flex-1">
          <div className="rounded-lg bg-theme-card p-3 space-y-1 border border-theme">
            <p className="text-xs text-theme-muted">{t.desk.remainingTasks}</p>
            <p className="text-2xl font-bold text-theme">{pending}</p>
          </div>
          <MetricsPanel metrics={metrics} loading={metricsLoading} />
          <LiveStressChart sessionId={sessionId} metrics={metrics} />
          <StressSlider value={stress} onChange={handleStressChange} />
        </div>
        <div className="p-4 border-t border-theme space-y-2">
          <Button
            type="button"
            className="w-full"
            onClick={handleCloseSession}
            loading={closing}
            variant={aria.phase === 'debriefing' ? 'primary' : 'ghost'}
          >
            {aria.phase === 'debriefing' ? t.desk.viewReport : t.desk.endSimulation}
          </Button>
          <button
            onClick={() => navigate('/')}
            className="w-full py-2 text-sm rounded-lg border border-theme text-theme-muted hover:text-theme"
          >
            {t.desk.newSession}
          </button>
          <button
            onClick={logout}
            className="w-full py-2 text-sm rounded-lg text-theme-muted hover:text-red-400"
          >
            {t.nav.logout}
          </button>
        </div>
      </aside>

      <main className="flex-1 p-6 overflow-y-auto">
        {aria.phase === 'debriefing' && (
          <div className="mb-6 p-4 rounded-xl border border-violet-500/40 bg-violet-500/10">
            <p className="text-sm text-violet-200">{t.desk.debriefBanner}</p>
          </div>
        )}
        <h1 className="text-xl font-bold text-theme mb-2">{t.desk.myTasks}</h1>
        <p className="text-sm text-theme-muted mb-6">{t.desk.managerTasksHint}</p>

        <section className="mb-8">
          <h2 className="text-sm font-semibold text-violet-300 uppercase tracking-wider mb-4">
            {t.desk.managerTasks} ({pendingAssigned})
          </h2>
          <UserAssignedTasks variant="desk" onTasksChange={setAssignedTasks} />
        </section>

        <section className="pt-6 border-t border-theme">
          <h2 className="text-sm font-semibold text-theme-muted uppercase tracking-wider mb-4">
            {t.desk.simulationTasks} ({pendingSimulation})
          </h2>
          <TaskList
            tasks={tasks}
            onReorder={handleReorder}
            onComplete={handleComplete}
            onDelegate={handleDelegate}
          />
        </section>
      </main>

      <aside className="w-80 border-l border-theme shrink-0 hidden lg:flex flex-col min-h-screen">
        <ChatPanel
          messages={aria.messages}
          phase={aria.phase}
          phaseLabel={aria.phaseLabel}
          isTyping={aria.isTyping}
          isConnected={aria.isConnected}
          onSend={aria.sendMessage}
        />
      </aside>
    </div>
  )
}
