import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { api, type SessionSummary, type UserBadge, type UserStats } from '../lib/api'
import { toast } from 'sonner'
import { PageHeader } from '../components/layout/DashboardLayout'
import Button from '../components/ui/Button'
import FaceCaptureModal from '../components/FaceCaptureModal'
import BadgeGrid from '../components/BadgeGrid'
import SessionCalendar from '../components/SessionCalendar'
import UserAssignedTasks from '../components/UserAssignedTasks'

const MODES = [
  { id: 'bienveillante', label: 'Bienveillante', desc: 'ARIA encourage et soutient', color: 'border-emerald-500/40 bg-emerald-500/10' },
  { id: 'exigeante', label: 'Exigeante', desc: 'ARIA pousse à la productivité', color: 'border-amber-500/40 bg-amber-500/10' },
  { id: 'toxique', label: 'Toxique', desc: 'Pression psychologique maximale', color: 'border-red-500/40 bg-red-500/10' },
] as const

export default function HomePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [displayName, setDisplayName] = useState(user?.full_name ?? '')
  const [mode, setMode] = useState<string>('bienveillante')
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState<UserStats | null>(null)
  const [sessions, setSessions] = useState<SessionSummary[]>([])
  const [badges, setBadges] = useState<UserBadge[]>([])
  const [calendarYear, setCalendarYear] = useState(() => new Date().getFullYear())
  const [calendarMonth, setCalendarMonth] = useState(() => new Date().getMonth() + 1)
  const [calendarDays, setCalendarDays] = useState<{ date: string; sessions: SessionSummary[] }[]>([])
  const [faceRegistered, setFaceRegistered] = useState<boolean | null>(null)
  const [faceModalOpen, setFaceModalOpen] = useState(false)

  useEffect(() => {
    Promise.all([api.getUserStats(), api.getUserSessions(), api.getFaceStatus(), api.getUserBadges()])
      .then(([s, sess, face, badgeData]) => {
        setStats(s)
        setSessions(sess)
        setFaceRegistered(face.registered)
        setBadges(badgeData.badges)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    api.getSessionCalendar(calendarYear, calendarMonth)
      .then((cal) => setCalendarDays(cal.days))
      .catch(() => {})
  }, [calendarYear, calendarMonth])

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const session = await api.startSession(displayName, mode)
      localStorage.setItem('current_session_id', session.id)
      toast.success('Session démarrée — ARIA vous attend')
      navigate('/desk')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Impossible de démarrer')
    } finally {
      setLoading(false)
    }
  }

  const handleRegisterFace = async (descriptor: number[]) => {
    await api.registerFace(descriptor)
    setFaceRegistered(true)
    setFaceModalOpen(false)
    toast.success('Visage enregistré — vous pouvez vous connecter avec la caméra')
  }

  const handleOpenSession = (session: SessionSummary) => {
    if (session.ended_at) {
      navigate(`/debrief/${session.id}`)
      return
    }
    localStorage.setItem('current_session_id', session.id)
    navigate('/desk')
  }

  return (
    <>
      <PageHeader
        title={`Bonjour, ${user?.full_name?.split(' ')[0] ?? 'Utilisateur'}`}
        subtitle="Tableau de bord utilisateur — lancez une simulation ou consultez vos statistiques"
      />
      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        <StatCard label="Sessions" value={stats?.total_sessions ?? 0} accent="text-violet-400" />
        <StatCard label="Tâches accomplies" value={stats?.completed_tasks ?? 0} accent="text-emerald-400" />
        <StatCard label="Stress moyen" value={stats?.average_stress ?? 0} suffix="/10" accent="text-amber-400" />
      </div>

      <div className="glass-card p-6 mb-8">
        <h3 className="font-semibold text-white mb-4">Mes tâches</h3>
        <UserAssignedTasks />
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        <form onSubmit={handleStart} className="lg:col-span-3 glass-card p-8 space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-white mb-1">Nouvelle simulation</h2>
            <p className="text-sm text-slate-500">Configurez votre session avec ARIA</p>
          </div>
          <div className="space-y-2">
            <label className="text-sm text-slate-400">Nom affiché</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="input-field"
              required
            />
          </div>
          <div className="space-y-3">
            <label className="text-sm text-slate-400">Personnalité ARIA</label>
            <div className="grid sm:grid-cols-3 gap-3">
              {MODES.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMode(m.id)}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    mode === m.id ? `${m.color} ring-1 ring-white/10` : 'border-slate-800 hover:border-slate-600'
                  }`}
                >
                  <p className="font-medium text-white text-sm">{m.label}</p>
                  <p className="text-xs text-slate-500 mt-1">{m.desc}</p>
                </button>
              ))}
            </div>
          </div>
          <Button type="submit" loading={loading} className="w-full sm:w-auto px-8">
            Commencer la simulation →
          </Button>
        </form>

        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card p-6">
            <h3 className="font-semibold text-white mb-2">Reconnaissance faciale</h3>
            <p className="text-sm text-slate-500 mb-4">
              {faceRegistered
                ? 'Votre visage est enregistré. Vous pouvez vous connecter avec un selfie sur la page de connexion.'
                : 'Enregistrez votre visage une fois pour vous connecter rapidement avec la caméra.'}
            </p>
            <Button type="button" variant="ghost" onClick={() => setFaceModalOpen(true)}>
              {faceRegistered ? 'Mettre à jour mon visage' : 'Enregistrer mon visage'}
            </Button>
          </div>

          <div className="glass-card p-6">
            <h3 className="font-semibold text-white mb-4">Badges</h3>
            <BadgeGrid badges={badges} />
          </div>

          <div className="glass-card p-6">
            <h3 className="font-semibold text-white mb-4">Calendrier des simulations</h3>
            <SessionCalendar
              year={calendarYear}
              month={calendarMonth}
              days={calendarDays}
              onMonthChange={(y, m) => {
                setCalendarYear(y)
                setCalendarMonth(m)
              }}
              onSelectSession={handleOpenSession}
            />
          </div>

          <div className="glass-card p-6">
            <h3 className="font-semibold text-white mb-4">Sessions récentes</h3>
            {sessions.length === 0 ? (
              <p className="text-sm text-slate-500">Aucune session pour le moment.</p>
            ) : (
              <ul className="space-y-3">
                {sessions.slice(0, 5).map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => handleOpenSession(s)}
                      className="w-full text-left p-3 rounded-lg bg-slate-900/60 border border-slate-800 hover:border-violet-500/40 hover:bg-slate-900 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-white">{s.display_name}</p>
                        {s.ended_at ? (
                          s.stress_score != null ? (
                            <span className="text-xs font-medium text-violet-400">{s.stress_score}/100</span>
                          ) : (
                            <span className="text-xs text-slate-500">Terminée</span>
                          )
                        ) : (
                          <span className="text-xs text-amber-400">En cours</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-1 capitalize">
                        {s.mode} · {s.phase} · {s.tasks_completed}/{s.tasks_total} tâches
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <FaceCaptureModal
        open={faceModalOpen}
        mode="register"
        onClose={() => setFaceModalOpen(false)}
        onCapture={handleRegisterFace}
      />
    </>
  )
}

function StatCard({
  label,
  value,
  suffix = '',
  accent,
}: {
  label: string
  value: number
  suffix?: string
  accent: string
}) {
  return (
    <div className="glass-card p-6">
      <p className="text-xs uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`text-3xl font-bold mt-2 ${accent}`}>
        {value}
        {suffix && <span className="text-lg text-slate-500">{suffix}</span>}
      </p>
    </div>
  )
}
