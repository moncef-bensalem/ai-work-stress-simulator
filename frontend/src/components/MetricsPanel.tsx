import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { SessionMetrics } from '../lib/api'
import { usePreferences } from '../contexts/PreferencesContext'

interface MetricsPanelProps {
  metrics: SessionMetrics | null
  loading: boolean
}

function MetricCard({
  label,
  value,
  suffix,
  color,
}: {
  label: string
  value: number | undefined
  suffix?: string
  color: string
}) {
  return (
    <div className="rounded-lg bg-theme-card p-3 border border-theme">
      <p className="text-xs text-theme-muted">{label}</p>
      <p className={`text-xl font-bold ${color}`}>
        {value ?? '—'}
        {suffix && value !== undefined ? suffix : ''}
      </p>
    </div>
  )
}

export default function MetricsPanel({ metrics, loading }: MetricsPanelProps) {
  const { t } = usePreferences()

  if (loading && !metrics) {
    return (
      <div className="rounded-lg bg-theme-card p-4 text-xs text-theme-muted border border-theme">
        {t.metrics.loading}
      </div>
    )
  }

  if (!metrics) {
    return (
      <div className="rounded-lg bg-theme-card p-4 text-xs text-theme-muted border border-theme">
        {t.metrics.unavailable}
      </div>
    )
  }

  const { current, stress_series, history } = metrics

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs text-[var(--accent-primary)] uppercase tracking-wider mb-2">{t.metrics.title}</p>
        <div className="grid grid-cols-2 gap-2">
          <MetricCard label={t.metrics.productivity} value={current.productivity} suffix="%" color="text-emerald-400" />
          <MetricCard label={t.metrics.cognitiveLoad} value={current.cognitive_load} suffix="%" color="text-amber-400" />
          <MetricCard label={t.metrics.fatigue} value={current.fatigue} suffix="%" color="text-red-400" />
          <MetricCard label={t.metrics.declaredStress} value={current.declared_stress} suffix="/10" color="text-violet-400" />
        </div>
      </div>

      {stress_series.length > 0 && (
        <div className="rounded-lg bg-theme-card p-3 border border-theme">
          <p className="text-xs text-theme-muted mb-2">{t.metrics.stressOverTime}</p>
          <div className="h-28">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stress_series}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                <XAxis dataKey="minute" tick={{ fill: 'var(--chart-text)', fontSize: 10 }} />
                <YAxis domain={[1, 10]} tick={{ fill: 'var(--chart-text)', fontSize: 10 }} width={24} />
                <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', fontSize: 12 }} />
                <Line type="monotone" dataKey="level" stroke="#a78bfa" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {history.length > 1 && (
        <div className="rounded-lg bg-theme-card p-3 border border-theme">
          <p className="text-xs text-theme-muted mb-2">{t.metrics.sessionEvolution}</p>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                <XAxis dataKey="minute" tick={{ fill: 'var(--chart-text)', fontSize: 10 }} />
                <YAxis domain={[0, 100]} tick={{ fill: 'var(--chart-text)', fontSize: 10 }} width={28} />
                <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', fontSize: 12 }} />
                <Area type="monotone" dataKey="productivity" stackId="1" stroke="#34d399" fill="#34d39933" />
                <Area type="monotone" dataKey="cognitive_load" stackId="2" stroke="#fbbf24" fill="#fbbf2433" />
                <Area type="monotone" dataKey="fatigue" stackId="3" stroke="#f87171" fill="#f8717133" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
}
