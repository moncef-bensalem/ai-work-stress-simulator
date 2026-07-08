import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { api, type ManagerOverview } from '../lib/api'
import { usePreferences } from '../contexts/PreferencesContext'
import { PageHeader } from '../components/layout/DashboardLayout'
import Button from '../components/ui/Button'

function PerformanceBar({ value, label }: { value: number; label: string }) {
  const blocks = Math.max(1, Math.round(value / 10))
  return (
    <div className="flex items-center gap-3">
      <span className="w-24 text-sm text-theme truncate">{label}</span>
      <div className="flex-1 flex gap-0.5">
        {Array.from({ length: 10 }).map((_, i) => (
          <span
            key={i}
            className={`h-3 flex-1 rounded-sm ${i < blocks ? 'bg-violet-500' : 'bg-theme-card border border-theme'}`}
          />
        ))}
      </div>
      <span className="text-xs text-theme-muted w-8 text-right">{value}%</span>
    </div>
  )
}

export default function ManagerDashboardPage() {
  const { t } = usePreferences()
  const [data, setData] = useState<ManagerOverview | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const overview = await api.getManagerOverview()
      setData(overview)
    } catch {
      toast.error(t.common.error)
    } finally {
      setLoading(false)
    }
  }, [t.common.error])

  useEffect(() => {
    load()
    const interval = setInterval(load, 15000)
    return () => clearInterval(interval)
  }, [load])

  if (loading) {
    return (
      <>
        <PageHeader title={t.manager.title} subtitle={t.manager.subtitle} />
        <p className="text-theme-muted">{t.common.loading}</p>
      </>
    )
  }

  return (
    <>
      <PageHeader title={t.manager.title} subtitle={t.manager.subtitle} />
      <div className="grid md:grid-cols-4 gap-4 mb-8">
        <KpiCard label={t.manager.employees} value={data?.total_employees ?? 0} />
        <KpiCard label={t.manager.totalSessions} value={data?.total_sessions ?? 0} />
        <KpiCard label={t.manager.simulationHours} value={data?.total_simulation_hours ?? 0} suffix="h" />
        <KpiCard label={t.manager.teams} value={data?.teams.length ?? 0} />
      </div>

      <div className="grid xl:grid-cols-3 gap-6 mb-8">
        {(data?.teams ?? []).map((team) => (
          <div key={team.id} className="glass-card p-6 xl:col-span-1">
            <h3 className="text-lg font-semibold text-theme mb-4">{team.name}</h3>
            <div className="grid grid-cols-3 gap-3 mb-6 text-center">
              <MetricPill label={t.manager.avgStress} value={`${team.avg_stress_score}%`} color="text-red-400" />
              <MetricPill label={t.manager.fatigue} value={`${team.avg_fatigue}%`} color="text-amber-400" />
              <MetricPill label={t.manager.cognitive} value={`${team.avg_cognitive_load}%`} color="text-violet-400" />
            </div>
            <p className="text-xs uppercase tracking-wider text-theme-muted mb-3">{t.manager.employeesList}</p>
            <div className="space-y-3">
              {team.employees.map((emp) => (
                <PerformanceBar key={emp.id} label={emp.full_name.split(' ')[0]} value={emp.performance_bar} />
              ))}
            </div>
            <p className="text-xs text-theme-muted mt-4">
              {t.manager.hours}: {team.simulation_hours}h · {t.manager.productivity}: {team.avg_productivity}%
            </p>
          </div>
        ))}
      </div>

      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-theme">{t.manager.struggling}</h3>
          <Button type="button" variant="ghost" onClick={load}>
            {t.common.refresh}
          </Button>
        </div>
        {(data?.struggling_employees.length ?? 0) === 0 ? (
          <p className="text-sm text-theme-muted">{t.manager.noStruggling}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-theme-muted text-left border-b border-theme">
                  <th className="pb-2 pr-4">{t.manager.employee}</th>
                  <th className="pb-2 pr-4">{t.manager.avgStress}</th>
                  <th className="pb-2 pr-4">{t.manager.productivity}</th>
                  <th className="pb-2 pr-4">{t.manager.difficulty}</th>
                  <th className="pb-2">{t.manager.sessions}</th>
                </tr>
              </thead>
              <tbody>
                {data?.struggling_employees.map((emp) => (
                  <tr key={emp.id} className="border-b border-theme/50">
                    <td className="py-3 pr-4 text-theme">{emp.full_name}</td>
                    <td className="py-3 pr-4 text-red-400">{emp.avg_stress_score}%</td>
                    <td className="py-3 pr-4 text-emerald-400">{emp.avg_productivity}%</td>
                    <td className="py-3 pr-4">
                      <span className="px-2 py-1 rounded-full text-xs bg-red-500/20 text-red-300">
                        {emp.difficulty_score}
                      </span>
                    </td>
                    <td className="py-3 text-theme-muted">{emp.sessions_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}

function KpiCard({ label, value, suffix = '' }: { label: string; value: number; suffix?: string }) {
  return (
    <div className="glass-card p-5">
      <p className="text-xs uppercase tracking-wider text-theme-muted">{label}</p>
      <p className="text-3xl font-bold text-theme mt-2">
        {value}
        {suffix && <span className="text-lg text-theme-muted">{suffix}</span>}
      </p>
    </div>
  )
}

function MetricPill({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="p-3 rounded-xl bg-theme-card border border-theme">
      <p className="text-[10px] uppercase text-theme-muted">{label}</p>
      <p className={`text-lg font-bold mt-1 ${color}`}>{value}</p>
    </div>
  )
}
