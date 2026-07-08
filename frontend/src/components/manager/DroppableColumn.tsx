import { useDroppable } from '@dnd-kit/core'
import type { ReactNode } from 'react'

interface Props {
  id: string
  label: string
  children: ReactNode
  className?: string
  highlight?: boolean
}

export default function DroppableColumn({ id, label, children, className = '', highlight }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id })

  return (
    <div
      ref={setNodeRef}
      className={`rounded-xl border p-4 min-h-[200px] transition-all ${
        isOver || highlight
          ? 'border-violet-400 bg-violet-500/10 ring-2 ring-violet-400/30'
          : 'border-theme bg-theme-card/40'
      } ${className}`}
    >
      <p className="text-xs uppercase tracking-wider text-theme-muted mb-3 font-semibold">{label}</p>
      <div className="space-y-2">{children}</div>
    </div>
  )
}
