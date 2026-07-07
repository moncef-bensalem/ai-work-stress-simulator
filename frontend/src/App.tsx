import { useEffect, useState } from 'react'

interface HealthStatus {
  status: string
  service: string
}

function App() {
  const [apiStatus, setApiStatus] = useState<HealthStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/health')
      .then((res) => {
        if (!res.ok) throw new Error('Backend inaccessible')
        return res.json()
      })
      .then((data: HealthStatus) => setApiStatus(data))
      .catch(() => setError('Backend non connecté — lancez le serveur FastAPI'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
      <div className="max-w-lg w-full rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
        <div className="mb-6">
          <p className="text-sm font-medium text-violet-400 uppercase tracking-wider">
            ESPRIT — Sprint 0
          </p>
          <h1 className="mt-2 text-3xl font-bold text-white">
            AI Work Stress Simulator
          </h1>
          <p className="mt-3 text-slate-400 leading-relaxed">
            Plateforme interactive de sensibilisation à l'aliénation numérique
            sous supervision de l'IA managériale ARIA.
          </p>
        </div>

        <div className="space-y-3">
          <StatusRow
            label="Frontend React"
            status="ok"
            detail="Vite + TypeScript + Tailwind CSS"
          />
          <StatusRow
            label="Backend FastAPI"
            status={loading ? 'loading' : error ? 'error' : 'ok'}
            detail={
              loading
                ? 'Vérification en cours...'
                : error ?? `Service : ${apiStatus?.service}`
            }
          />
          <StatusRow
            label="Base de données"
            status="pending"
            detail="PostgreSQL — Sprint 1"
          />
        </div>

        <p className="mt-8 text-center text-xs text-slate-500">
          Version 0.1.0 — Environnement de développement initialisé
        </p>
      </div>
    </div>
  )
}

function StatusRow({
  label,
  status,
  detail,
}: {
  label: string
  status: 'ok' | 'error' | 'loading' | 'pending'
  detail: string
}) {
  const colors = {
    ok: 'bg-emerald-500',
    error: 'bg-red-500',
    loading: 'bg-amber-500 animate-pulse',
    pending: 'bg-slate-600',
  }

  return (
    <div className="flex items-center gap-3 rounded-lg bg-slate-800/50 px-4 py-3">
      <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${colors[status]}`} />
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-200">{label}</p>
        <p className="text-xs text-slate-400 truncate">{detail}</p>
      </div>
    </div>
  )
}

export default App
