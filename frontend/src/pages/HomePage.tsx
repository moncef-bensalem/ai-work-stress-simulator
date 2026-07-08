import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../lib/api'
import { toast } from 'sonner'

const MODES = [
  { id: 'bienveillante', label: 'Bienveillante', desc: 'ARIA encourage et soutient' },
  { id: 'exigeante', label: 'Exigeante', desc: 'ARIA pousse à la productivité' },
  { id: 'toxique', label: 'Toxique', desc: 'ARIA exerce une pression maximale' },
] as const

export default function HomePage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [displayName, setDisplayName] = useState(user?.full_name ?? '')
  const [mode, setMode] = useState<string>('bienveillante')
  const [loading, setLoading] = useState(false)

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const session = await api.startSession(displayName, mode)
      localStorage.setItem('current_session_id', session.id)
      toast.success('Session démarrée — ARIA vous attend')
      navigate('/desk')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Impossible de démarrer la session')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <div className="flex justify-between items-center mb-8">
          <div>
            <p className="text-violet-400 text-sm font-medium uppercase tracking-wider">ESPRIT — Sprint 1</p>
            <h1 className="text-3xl font-bold text-white mt-1">AI Work Stress Simulator</h1>
          </div>
          <button onClick={logout} className="text-sm text-slate-400 hover:text-white">
            Déconnexion
          </button>
        </div>

        <form onSubmit={handleStart} className="bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-6">
          <div>
            <label className="block text-sm text-slate-400 mb-2">Votre nom pour cette session</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-3">Mode ARIA (personnalité du manager IA)</label>
            <div className="space-y-2">
              {MODES.map((m) => (
                <label
                  key={m.id}
                  className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                    mode === m.id ? 'border-violet-500 bg-violet-500/10' : 'border-slate-700 hover:border-slate-600'
                  }`}
                >
                  <input
                    type="radio"
                    name="mode"
                    value={m.id}
                    checked={mode === m.id}
                    onChange={() => setMode(m.id)}
                    className="mt-1"
                  />
                  <div>
                    <p className="text-white font-medium">{m.label}</p>
                    <p className="text-sm text-slate-400">{m.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-medium disabled:opacity-50"
          >
            {loading ? 'Démarrage...' : 'Commencer la simulation'}
          </button>
        </form>
      </div>
    </div>
  )
}
