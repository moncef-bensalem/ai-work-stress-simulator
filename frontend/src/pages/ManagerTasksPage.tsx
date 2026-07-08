import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { toast } from 'sonner'
import { api, type AssignedTask, type ManagerTaskBoard } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import { usePreferences } from '../contexts/PreferencesContext'
import { useTaskSocket } from '../hooks/useTaskSocket'
import { PageHeader } from '../components/layout/DashboardLayout'
import Button from '../components/ui/Button'
import AssignedTaskCard from '../components/manager/AssignedTaskCard'
import DroppableColumn from '../components/manager/DroppableColumn'
import CreateTaskModal, { type CreateTaskForm } from '../components/manager/CreateTaskModal'

export default function ManagerTasksPage() {
  const { user } = useAuth()
  const { t } = usePreferences()
  const [board, setBoard] = useState<ManagerTaskBoard | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'assign' | 'kanban'>('assign')
  const [posteFilter, setPosteFilter] = useState('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [activeTask, setActiveTask] = useState<AssignedTask | null>(null)

  const load = useCallback(async () => {
    try {
      const data = await api.getManagerTaskBoard()
      setBoard(data)
    } catch {
      toast.error(t.common.error)
    } finally {
      setLoading(false)
    }
  }, [t.common.error])

  useTaskSocket({
    onTaskUpdate: load,
    enabled: !!user?.id,
  })

  useEffect(() => {
    load()
  }, [load])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const filteredAvailable = useMemo(() => {
    if (!board) return []
    if (posteFilter === 'all') return board.available_tasks
    return board.available_tasks.filter((t) => t.poste === posteFilter || t.poste === 'all')
  }, [board, posteFilter])

  const findTask = (id: string): AssignedTask | undefined => {
    if (!board) return undefined
    const all = [
      ...board.available_tasks,
      ...board.employees.flatMap((e) => e.tasks),
      ...Object.values(board.kanban).flat(),
    ]
    return all.find((t) => t.id === id)
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveTask(findTask(String(event.active.id)) ?? null)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveTask(null)
    const { active, over } = event
    if (!over) return
    const taskId = String(active.id)
    const overId = String(over.id)

    try {
      if (overId.startsWith('user-')) {
        const userId = overId.replace('user-', '')
        const task = findTask(taskId)
        const emp = board?.employees.find((e) => e.id === userId)
        if (task && emp && task.poste !== 'all' && task.poste !== emp.poste) {
          toast.warning(t.managerTasks.posteWarning)
          return
        }
        await api.assignManagerTask(taskId, userId)
        toast.success(t.managerTasks.assignedSuccess)
      } else if (overId === 'backlog') {
        await api.assignManagerTask(taskId, null)
        toast.success(t.managerTasks.unassignedSuccess)
      } else if (overId.startsWith('kanban-')) {
        const col = overId.replace('kanban-', '')
        const status = col === 'done' ? 'done' : col === 'in_progress' ? 'in_progress' : 'todo'
        await api.updateManagerTask(taskId, { status })
        toast.success(t.managerTasks.statusUpdated)
      }
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.common.error)
    }
  }

  const handleCreate = async (form: CreateTaskForm) => {
    await api.createManagerTask({
      title: form.title,
      description: form.description,
      category: form.category,
      poste: form.poste,
      priority: form.priority,
      difficulty: form.difficulty,
      estimated_minutes: form.estimated_minutes,
      due_date: form.due_date ? new Date(form.due_date).toISOString() : undefined,
      assignee_id: form.assignee_id || undefined,
    })
    toast.success(t.managerTasks.createdSuccess)
    await load()
  }

  const handleValidate = async (taskId: string) => {
    try {
      await api.validateManagerTask(taskId)
      toast.success(t.managerTasks.validatedSuccess)
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.common.error)
    }
  }

  if (loading) {
    return (
      <>
        <PageHeader title={t.managerTasks.title} subtitle={t.managerTasks.subtitle} />
        <p className="text-theme-muted">{t.common.loading}</p>
      </>
    )
  }

  const stats = board?.stats

  return (
    <>
      <PageHeader title={t.managerTasks.title} subtitle={t.managerTasks.subtitle} />
      <div className="flex flex-wrap gap-3 mb-6">
        <Button onClick={() => setModalOpen(true)}>+ {t.managerTasks.newTask}</Button>
        <Button variant="ghost" onClick={load}>{t.common.refresh}</Button>
        <div className="flex gap-1 ml-auto">
          {(['assign', 'kanban'] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === key ? 'bg-violet-500/20 text-violet-300 border border-violet-400/40' : 'text-theme-muted border border-theme'
              }`}
            >
              {key === 'assign' ? t.managerTasks.tabAssign : t.managerTasks.tabKanban}
            </button>
          ))}
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-8">
          <Stat label={t.managerTasks.statTotal} value={stats.total} />
          <Stat label={t.managerTasks.statTodo} value={stats.todo} />
          <Stat label={t.managerTasks.statProgress} value={stats.in_progress} />
          <Stat label={t.managerTasks.statDone} value={stats.done} />
          <Stat label={t.managerTasks.statOverdue} value={stats.overdue} accent="text-red-400" />
          <Stat label={t.managerTasks.statTeamProgress} value={`${stats.team_progress}%`} accent="text-emerald-400" />
        </div>
      )}

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        {tab === 'assign' ? (
          <div className="grid xl:grid-cols-12 gap-6">
            <div className="xl:col-span-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-theme">{t.managerTasks.available}</h3>
                <select
                  className="input-field text-xs py-1"
                  value={posteFilter}
                  onChange={(e) => setPosteFilter(e.target.value)}
                >
                  <option value="all">{t.managerTasks.allPostes}</option>
                  {Object.entries(board?.postes ?? {}).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <DroppableColumn id="backlog" label={t.managerTasks.backlog}>
                {filteredAvailable.map((task) => (
                  <AssignedTaskCard key={task.id} task={task} />
                ))}
                {filteredAvailable.length === 0 && (
                  <p className="text-xs text-theme-muted">{t.managerTasks.noAvailable}</p>
                )}
              </DroppableColumn>
            </div>
            <div className="xl:col-span-8 grid md:grid-cols-2 gap-4">
              {board?.employees.map((emp) => (
                <DroppableColumn
                  key={emp.id}
                  id={`user-${emp.id}`}
                  label={`👤 ${emp.full_name}`}
                  className="min-h-[240px]"
                >
                  <p className="text-xs text-theme-muted -mt-2 mb-2">{emp.poste_label}</p>
                  {emp.tasks.map((task) => (
                    <AssignedTaskCard key={task.id} task={task} compact />
                  ))}
                  {emp.tasks.length === 0 && (
                    <p className="text-xs text-theme-muted italic">{t.managerTasks.dropHere}</p>
                  )}
                </DroppableColumn>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-4">
            {(['todo', 'in_progress', 'done'] as const).map((col) => (
              <DroppableColumn
                key={col}
                id={`kanban-${col}`}
                label={
                  col === 'todo' ? t.managerTasks.kanbanTodo :
                  col === 'in_progress' ? t.managerTasks.kanbanProgress :
                  t.managerTasks.kanbanDone
                }
              >
                {(board?.kanban[col] ?? []).map((task) => (
                  <div key={task.id} className="space-y-2">
                    <AssignedTaskCard task={task} compact />
                    {task.status === 'done' && (
                      <Button type="button" className="w-full text-xs py-1" onClick={() => handleValidate(task.id)}>
                        ✓ {t.managerTasks.validate}
                      </Button>
                    )}
                  </div>
                ))}
              </DroppableColumn>
            ))}
          </div>
        )}
        <DragOverlay>
          {activeTask ? (
            <div className="rotate-2 scale-105">
              <AssignedTaskCard task={activeTask} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <CreateTaskModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleCreate}
        postes={board?.postes ?? {}}
        employees={board?.employees.map((e) => ({ id: e.id, full_name: e.full_name, poste: e.poste })) ?? []}
      />
    </>
  )
}

function Stat({ label, value, accent = 'text-theme' }: { label: string; value: string | number; accent?: string }) {
  return (
    <div className="glass-card p-4 text-center">
      <p className="text-[10px] uppercase text-theme-muted">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${accent}`}>{value}</p>
    </div>
  )
}
