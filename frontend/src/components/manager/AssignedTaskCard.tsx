import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import type { AssignedTask } from '../../lib/api'

const PRIORITY_STYLES: Record<string, string> = {
  urgente: 'bg-red-500/20 text-red-300 border-red-500/40',
  haute: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
  moyenne: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  basse: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
}

interface Props {
  task: AssignedTask
  compact?: boolean
  warning?: string | null
}

export default function AssignedTaskCard({ task, compact, warning }: Props) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id })
  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`rounded-xl border bg-theme-card p-3 cursor-grab active:cursor-grabbing transition-all hover:shadow-lg hover:border-violet-400/40 ${
        isDragging ? 'ring-2 ring-violet-400 scale-[1.02]' : 'border-theme'
      } ${compact ? 'p-2' : ''}`}
      title={task.description}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-sm font-medium text-theme leading-snug">📋 {task.title}</p>
        <span className={`text-[10px] px-2 py-0.5 rounded-full border shrink-0 ${PRIORITY_STYLES[task.priority] ?? PRIORITY_STYLES.moyenne}`}>
          {task.priority}
        </span>
      </div>
      {!compact && task.description && (
        <p className="text-xs text-theme-muted line-clamp-2 mb-2">{task.description}</p>
      )}
      <div className="flex flex-wrap gap-2 text-[10px] text-theme-muted">
        <span>⏱️ {Math.round(task.estimated_minutes / 60)}h</span>
        {task.due_date && (
          <span className={task.is_overdue ? 'text-red-400' : ''}>
            📅 {new Date(task.due_date).toLocaleDateString('fr-FR')}
          </span>
        )}
        <span>🧠 {task.difficulty}</span>
      </div>
      {task.progress > 0 && (
        <div className="mt-2 h-1.5 rounded-full bg-theme overflow-hidden">
          <div className="h-full bg-violet-500 rounded-full transition-all" style={{ width: `${task.progress}%` }} />
        </div>
      )}
      {warning && <p className="text-[10px] text-amber-400 mt-2">⚠️ {warning}</p>}
    </div>
  )
}
