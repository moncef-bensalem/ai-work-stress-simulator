import { useState } from 'react'
import Button from '../ui/Button'

export interface CreateTaskForm {
  title: string
  description: string
  category: string
  poste: string
  priority: string
  difficulty: string
  estimated_minutes: number
  due_date: string
  assignee_id: string
}

interface Props {
  open: boolean
  onClose: () => void
  onSubmit: (data: CreateTaskForm) => Promise<void>
  postes: Record<string, string>
  employees: { id: string; full_name: string; poste: string }[]
}

const EMPTY: CreateTaskForm = {
  title: '',
  description: '',
  category: 'general',
  poste: 'all',
  priority: 'moyenne',
  difficulty: 'moyen',
  estimated_minutes: 120,
  due_date: '',
  assignee_id: '',
}

export default function CreateTaskModal({ open, onClose, onSubmit, postes, employees }: Props) {
  const [form, setForm] = useState<CreateTaskForm>(EMPTY)
  const [loading, setLoading] = useState(false)

  if (!open) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await onSubmit(form)
      setForm(EMPTY)
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <form onSubmit={handleSubmit} className="glass-card w-full max-w-lg p-6 space-y-4 animate-fade-up">
        <h3 className="text-lg font-semibold text-theme">+ Nouvelle tâche</h3>
        <input
          className="input-field w-full"
          placeholder="Titre"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          required
        />
        <textarea
          className="input-field w-full min-h-[80px]"
          placeholder="Description"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
        <div className="grid grid-cols-2 gap-3">
          <select className="input-field" value={form.poste} onChange={(e) => setForm({ ...form, poste: e.target.value })}>
            {Object.entries(postes).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <select className="input-field" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
            <option value="basse">Basse</option>
            <option value="moyenne">Moyenne</option>
            <option value="haute">Haute</option>
            <option value="urgente">Urgente</option>
          </select>
          <select className="input-field" value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })}>
            <option value="facile">Facile</option>
            <option value="moyen">Moyen</option>
            <option value="difficile">Difficile</option>
          </select>
          <input
            type="number"
            className="input-field"
            placeholder="Minutes estimées"
            value={form.estimated_minutes}
            onChange={(e) => setForm({ ...form, estimated_minutes: Number(e.target.value) })}
          />
          <input
            type="date"
            className="input-field col-span-2"
            value={form.due_date}
            onChange={(e) => setForm({ ...form, due_date: e.target.value })}
          />
          <select
            className="input-field col-span-2"
            value={form.assignee_id}
            onChange={(e) => setForm({ ...form, assignee_id: e.target.value })}
          >
            <option value="">Non assignée (backlog)</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>{emp.full_name} — {emp.poste}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-2 justify-end">
          <Button type="button" variant="ghost" onClick={onClose}>Annuler</Button>
          <Button type="submit" loading={loading}>Créer</Button>
        </div>
      </form>
    </div>
  )
}
