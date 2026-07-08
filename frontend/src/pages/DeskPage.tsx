import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { api, type Task } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import TaskList from '../components/TaskList'
import StressSlider from '../components/StressSlider'
import ChatPanel from '../components/ChatPanel'

export default function DeskPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const sessionId = localStorage.getItem('current_session_id')
  const [tasks, setTasks] = useState<Task[]>([])
  const [stress, setStress] = useState(5)
  const [loading, setLoading] = useState(true)

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
      .catch(() => toast.error('Impossible de charger les tâches'))
      .finally(() => setLoading(false))
  }, [sessionId, navigate, loadTasks])

  const handleComplete = async (id: string) => {
    try {
      await api.updateTask(id, { status: 'completed' })
      toast.success('Tâche terminée')
      await loadTasks()
    } catch {
      toast.error('Erreur lors de la mise à jour')
    }
  }

  const handleDelegate = async (id: string) => {
    try {
      await api.updateTask(id, { status: 'delegated' })
      toast.info('Tâche déléguée')
      await loadTasks()
    } catch {
      toast.error('Erreur lors de la délégation')
    }
  }

  const handleReorder = async (reordered: Task[]) => {
    setTasks(reordered)
    await Promise.all(
      reordered.map((task, index) => api.updateTask(task.id, { sort_order: index }))
    )
  }

  const handleStressChange = async (level: number) => {
    setStress(level)
    if (!sessionId) return
    try {
      await api.recordStress(sessionId, level)
    } catch {
      toast.error('Impossible d\'enregistrer le stress')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        Chargement du bureau virtuel...
      </div>
    )
  }

  const pending = tasks.filter((t) => t.status === 'pending' || t.status === 'in_progress').length

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-800 flex flex-col shrink-0">
        <div className="p-4 border-b border-slate-800">
          <p className="text-xs text-violet-400 uppercase tracking-wider">Bureau Virtuel</p>
          <p className="text-white font-medium mt-1">{user?.full_name}</p>
        </div>
        <div className="p-4 space-y-4 flex-1">
          <div className="rounded-lg bg-slate-900 p-3 space-y-1">
            <p className="text-xs text-slate-500">Tâches restantes</p>
            <p className="text-2xl font-bold text-white">{pending}</p>
          </div>
          <StressSlider value={stress} onChange={handleStressChange} />
        </div>
        <div className="p-4 border-t border-slate-800 space-y-2">
          <button
            onClick={() => navigate('/')}
            className="w-full py-2 text-sm rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
          >
            Nouvelle session
          </button>
          <button
            onClick={logout}
            className="w-full py-2 text-sm rounded-lg text-slate-500 hover:text-white"
          >
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Centre */}
      <main className="flex-1 p-6 overflow-y-auto">
        <h1 className="text-xl font-bold text-white mb-6">Mes tâches</h1>
        <TaskList
          tasks={tasks}
          onReorder={handleReorder}
          onComplete={handleComplete}
          onDelegate={handleDelegate}
        />
      </main>

      {/* Chat ARIA placeholder */}
      <aside className="w-72 border-l border-slate-800 shrink-0 hidden lg:flex flex-col">
        <ChatPanel />
      </aside>
    </div>
  )
}
