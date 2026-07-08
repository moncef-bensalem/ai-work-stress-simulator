const CATEGORY_COLORS: Record<string, string> = {
  validation: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  tri: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  redaction: 'bg-green-500/20 text-green-300 border-green-500/30',
  delegation: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  urgent: 'bg-red-500/20 text-red-300 border-red-500/30',
}

function Countdown({ deadline }: { deadline: string | null }) {
  if (!deadline) return null
  const diff = new Date(deadline).getTime() - Date.now()
  const minutes = Math.max(0, Math.floor(diff / 60000))
  const seconds = Math.max(0, Math.floor((diff % 60000) / 1000))
  const urgent = diff < 5 * 60 * 1000
  return (
    <span className={`text-xs font-mono ${urgent ? 'text-red-400' : 'text-slate-400'}`}>
      {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
    </span>
  )
}

interface TaskCardProps {
  task: {
    id: string
    title: string
    description: string
    category: string
    status: string
    deadline: string | null
  }
  onComplete: (id: string) => void
  onDelegate: (id: string) => void
}

export default function TaskCard({ task, onComplete, onDelegate }: TaskCardProps) {
  const done = task.status === 'completed' || task.status === 'delegated'
  const colorClass = CATEGORY_COLORS[task.category] ?? 'bg-slate-500/20 text-slate-300 border-slate-500/30'

  return (
    <div className={`rounded-xl border border-slate-700 bg-slate-800/50 p-4 ${done ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className={`text-xs px-2 py-0.5 rounded-full border ${colorClass}`}>
          {task.category}
        </span>
        <Countdown deadline={task.deadline} />
      </div>
      <h3 className={`font-medium text-white mb-1 ${done ? 'line-through' : ''}`}>{task.title}</h3>
      <p className="text-sm text-slate-400 mb-4">{task.description}</p>
      {!done && (
        <div className="flex gap-2">
          <button
            onClick={() => onComplete(task.id)}
            className="flex-1 py-2 text-sm rounded-lg bg-emerald-600/80 hover:bg-emerald-600 text-white"
          >
            Terminer
          </button>
          <button
            onClick={() => onDelegate(task.id)}
            className="flex-1 py-2 text-sm rounded-lg bg-slate-700 hover:bg-slate-600 text-white"
          >
            Déléguer
          </button>
        </div>
      )}
      {task.status === 'completed' && (
        <p className="text-xs text-emerald-400">Terminée</p>
      )}
      {task.status === 'delegated' && (
        <p className="text-xs text-purple-400">Déléguée</p>
      )}
    </div>
  )
}
