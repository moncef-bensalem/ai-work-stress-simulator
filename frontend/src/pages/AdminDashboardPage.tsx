import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  api,
  type AdminAnalytics,
  type AdminLive,
  type AdminStats,
  type AdminUser,
} from '../lib/api'
import { usePreferences } from '../contexts/PreferencesContext'
import { PageHeader } from '../components/layout/DashboardLayout'
import Button from '../components/ui/Button'

const MODE_COLORS: Record<string, string> = {
  bienveillante: '#34d399',
  exigeante: '#fbbf24',
  toxique: '#f87171',
}

const DAY_LABELS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']

export default function AdminDashboardPage() {
  const { t } = usePreferences()
  const [tab, setTab] = useState<'live' | 'analytics'>('live')
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null)
  const [live, setLive] = useState<AdminLive | null>(null)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ email: '', full_name: '', password: '', role: 'user' })

  const load = useCallback(async () => {
    try {
      const [s, a, l, u] = await Promise.all([
        api.getAdminStats(),
        api.getAdminAnalytics(),
        api.getAdminLive(),
        api.getAdminUsers(),
      ])
      setStats(s)
      setAnalytics(a)
      setLive(l)
      setUsers(u)
    } catch {
      toast.error(t.common.error)
    } finally {
      setLoading(false)
    }
  }, [t.common.error])

  useEffect(() => {
    load()
    const interval = setInterval(async () => {
      try {
        const [s, l] = await Promise.all([api.getAdminStats(), api.getAdminLive()])
        setStats(s)
        setLive(l)
      } catch {
        /* ignore polling errors */
      }
    }, 10000)
    return () => clearInterval(interval)
  }, [load])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.createAdminUser(form)
      toast.success('OK')
      setForm({ email: '', full_name: '', password: '', role: 'user' })
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.common.error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('?')) return
    try {
      await api.deleteAdminUser(id)
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.common.error)
    }
  }

  if (loading) {
    return (
      <>
        <PageHeader title={t.admin.title} />
        <p className="text-theme-muted">{t.common.loading}</p>
      </>
    )
  }

  const radarData = analytics?.radar_by_mode.map((r) => ({
    mode: r.mode,
    Productivité: r.productivity,
    Cognitive: r.cognitive_load,
    Fatigue: r.fatigue,
    Stress: r.stress,
    Complétion: r.completion,
  })) ?? []

  return (
    <>
      <PageHeader title={t.admin.title} subtitle={t.admin.subtitle} />
      <div className="flex flex-wrap gap-2 mb-6">
        <TabButton active={tab === 'live'} onClick={() => setTab('live')}>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse-live inline-block" />
          {t.admin.live}
        </TabButton>
        <TabButton active={tab === 'analytics'} onClick={() => setTab('analytics')}>
          {t.admin.analytics}
        </TabButton>
        <Button variant="ghost" className="ml-auto" onClick={load}>
          {t.common.refresh}
        </Button>
      </div>

      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <KpiCard label={t.admin.users} value={stats?.total_users ?? 0} trend="up" />
        <KpiCard label={t.admin.totalSessions} value={stats?.total_sessions ?? 0} />
        <KpiCard label={t.admin.activeSessions} value={live?.active_sessions ?? 0} highlight />
        <KpiCard label={t.admin.connectedUsers} value={live?.connected_count ?? 0} highlight />
        <KpiCard label={t.admin.avgStress} value={stats?.average_stress ?? 0} suffix="/10" />
        <KpiCard label={t.admin.avgScore} value={analytics?.avg_stress_score ?? 0} suffix="/100" />
        <KpiCard label={t.admin.completion} value={analytics?.completion_rate ?? 0} suffix="%" />
      </div>

      {tab === 'live' && live && (
        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2 glass-card p-6">
            <h3 className="font-semibold text-theme mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse-live" />
              {t.admin.timeline}
            </h3>
            <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
              {live.timeline.map((ev) => (
                <div key={ev.id} className="flex gap-3 p-3 rounded-xl border border-theme bg-theme-card/50">
                  <EventDot type={ev.type} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-theme">{ev.label}</p>
                    <p className="text-xs text-theme-muted truncate">{ev.user} · {ev.meta}</p>
                  </div>
                  <time className="text-xs text-theme-muted shrink-0">
                    {ev.timestamp ? new Date(ev.timestamp).toLocaleTimeString() : '—'}
                  </time>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="glass-card p-6">
              <h3 className="font-semibold text-theme mb-4">{t.admin.openSessions}</h3>
              {live.open_sessions.length === 0 ? (
                <p className="text-sm text-theme-muted">—</p>
              ) : (
                <ul className="space-y-3">
                  {live.open_sessions.map((s) => (
                    <li key={s.id} className="p-3 rounded-xl border border-theme">
                      <p className="text-sm font-medium text-theme">{s.display_name}</p>
                      <p className="text-xs text-theme-muted">{s.user_name} · {s.mode} · {s.phase}</p>
                      <p className="text-xs text-[var(--accent-primary)] mt-1">{s.elapsed_minutes} min</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="glass-card p-6">
              <h3 className="font-semibold text-theme mb-4">{t.admin.connected}</h3>
              {live.connected_users.length === 0 ? (
                <p className="text-sm text-theme-muted">—</p>
              ) : (
                <ul className="space-y-2">
                  {live.connected_users.map((u) => (
                    <li key={u.email} className="flex items-center gap-3">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse-live" />
                      <div>
                        <p className="text-sm text-theme">{u.full_name}</p>
                        <p className="text-xs text-theme-muted">{u.email}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === 'analytics' && analytics && (
        <div className="space-y-6 mb-8">
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="glass-card p-6">
              <h3 className="font-semibold text-theme mb-1">{t.admin.modes}</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analytics.mode_distribution}
                      dataKey="count"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={4}
                    >
                      {analytics.mode_distribution.map((entry) => (
                        <Cell key={entry.mode} fill={MODE_COLORS[entry.mode] ?? '#8b5cf6'} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="glass-card p-6">
              <h3 className="font-semibold text-theme mb-1">{t.admin.trend}</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analytics.sessions_trend}>
                    <CartesianGrid stroke={varGrid()} strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fill: varText(), fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
                    <YAxis tick={{ fill: varText(), fontSize: 10 }} />
                    <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }} />
                    <Area type="monotone" dataKey="sessions" stroke="#8b5cf6" fill="#8b5cf633" />
                    <Line type="monotone" dataKey="avg_stress" stroke="#f87171" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="glass-card p-6">
            <h3 className="font-semibold text-theme mb-1">{t.admin.radar}</h3>
            <div className="grid md:grid-cols-3 gap-4 h-72">
              {radarData.map((data) => (
                <ResponsiveContainer key={data.mode} width="100%" height="100%">
                  <RadarChart data={[
                    { metric: 'Prod.', value: data.Productivité },
                    { metric: 'Cog.', value: data.Cognitive },
                    { metric: 'Fat.', value: data.Fatigue },
                    { metric: 'Stress', value: data.Stress },
                    { metric: 'Compl.', value: data.Complétion },
                  ]}>
                    <PolarGrid stroke={varGrid()} />
                    <PolarAngleAxis dataKey="metric" tick={{ fill: varText(), fontSize: 10 }} />
                    <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar
                      dataKey="value"
                      stroke={MODE_COLORS[data.mode] ?? '#8b5cf6'}
                      fill={MODE_COLORS[data.mode] ?? '#8b5cf6'}
                      fillOpacity={0.35}
                    />
                    <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }} />
                  </RadarChart>
                </ResponsiveContainer>
              ))}
            </div>
            <div className="flex justify-center gap-4 mt-2 text-xs text-theme-muted capitalize">
              {radarData.map((d) => (
                <span key={d.mode} style={{ color: MODE_COLORS[d.mode] }}>{d.mode}</span>
              ))}
            </div>
          </div>

          <div className="glass-card p-6">
            <h3 className="font-semibold text-theme mb-1">{t.admin.heatmap}</h3>
            <p className="text-xs text-theme-muted mb-4">{t.admin.heatmapDesc}</p>
            <HeatmapGrid cells={analytics.heatmap} />
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <form onSubmit={handleCreate} className="glass-card p-6 space-y-4 lg:col-span-1">
          <h3 className="font-semibold text-theme">{t.admin.addUser}</h3>
          <input className="input-field" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <input className="input-field" placeholder="Nom" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
          <input className="input-field" type="password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          <select className="input-field" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
          <Button type="submit" className="w-full">{t.admin.create}</Button>
        </form>

        <div className="glass-card p-6 lg:col-span-2 overflow-x-auto">
          <h3 className="font-semibold text-theme mb-4">{t.admin.users} ({users.length})</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-theme-muted border-b border-theme">
                <th className="pb-3 pr-4">Nom</th>
                <th className="pb-3 pr-4">Email</th>
                <th className="pb-3 pr-4">{t.admin.role}</th>
                <th className="pb-3 pr-4">{t.admin.sessions}</th>
                <th className="pb-3">{t.admin.delete}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-theme/50">
                  <td className="py-3 pr-4 text-theme">{u.full_name}</td>
                  <td className="py-3 pr-4 text-theme-muted">{u.email}</td>
                  <td className="py-3 pr-4">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${u.role === 'admin' ? 'bg-violet-500/20 text-violet-300' : 'bg-slate-700/50 text-theme-muted'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-theme-muted">{u.sessions_count}</td>
                  <td className="py-3">
                    <button type="button" onClick={() => handleDelete(u.id)} className="text-red-400 hover:text-red-300 text-xs">
                      {t.admin.delete}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}

function varGrid() {
  return getComputedStyle(document.documentElement).getPropertyValue('--chart-grid').trim() || '#334155'
}

function varText() {
  return getComputedStyle(document.documentElement).getPropertyValue('--chart-text').trim() || '#64748b'
}

function KpiCard({ label, value, suffix = '', highlight, trend }: {
  label: string
  value: number
  suffix?: string
  highlight?: boolean
  trend?: 'up' | 'down'
}) {
  return (
    <div className={`admin-kpi p-5 ${highlight ? 'ring-1 ring-[var(--accent-primary)]/30' : ''}`}>
      <p className="text-xs text-theme-muted uppercase tracking-wider">{label}</p>
      <p className="text-3xl font-bold text-theme mt-2">
        {value}{suffix && <span className="text-lg text-theme-muted">{suffix}</span>}
      </p>
      {trend && <p className="text-xs text-emerald-400 mt-1">● live</p>}
    </div>
  )
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-all ${
        active
          ? 'bg-[color-mix(in_srgb,var(--accent-primary)_20%,transparent)] text-theme border border-[var(--accent-primary)]/40'
          : 'text-theme-muted border border-theme hover:text-theme'
      }`}
    >
      {children}
    </button>
  )
}

function EventDot({ type }: { type: string }) {
  const colors: Record<string, string> = {
    session_start: 'bg-violet-400',
    session_end: 'bg-emerald-400',
    task_event: 'bg-cyan-400',
    stress: 'bg-amber-400',
  }
  return <span className={`w-3 h-3 rounded-full shrink-0 mt-1 ${colors[type] ?? 'bg-slate-400'}`} />
}

function HeatmapGrid({ cells }: { cells: { day: number; hour: number; value: number; sessions: number }[] }) {
  const maxVal = Math.max(...cells.map((c) => c.sessions || c.value), 1)

  return (
    <div className="overflow-x-auto">
      <div className="inline-grid gap-0.5" style={{ gridTemplateColumns: 'auto repeat(7, 1fr)' }}>
        <div />
        {DAY_LABELS.map((d) => (
          <div key={d} className="text-[10px] text-theme-muted text-center pb-1">{d}</div>
        ))}
        {Array.from({ length: 24 }, (_, hour) => (
          <div key={`row-${hour}`} className="contents">
            <div className="text-[10px] text-theme-muted pr-2 flex items-center">{hour}h</div>
            {DAY_LABELS.map((_, day) => {
              const cell = cells.find((c) => c.day === day && c.hour === hour)
              const intensity = ((cell?.sessions ?? 0) + (cell?.value ?? 0) / 10) / maxVal
              return (
                <div
                  key={`${day}-${hour}`}
                  title={`${DAY_LABELS[day]} ${hour}h — stress ${cell?.value ?? 0}, sessions ${cell?.sessions ?? 0}`}
                  className="w-6 h-4 rounded-sm"
                  style={{
                    background: `color-mix(in srgb, var(--accent-primary) ${Math.round(intensity * 90)}%, transparent)`,
                  }}
                />
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
