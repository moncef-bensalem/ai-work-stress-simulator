import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
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
import { toast } from 'sonner'
import { PageHeader } from '../components/layout/DashboardLayout'
import Button from '../components/ui/Button'
import BadgeGrid from '../components/BadgeGrid'
import { usePreferences } from '../contexts/PreferencesContext'
import { api, type SessionReport } from '../lib/api'

const SCORE_COLOR_CLASS: Record<string, string> = {
  Faible: 'text-emerald-400',
  'Modéré': 'text-amber-400',
  'Élevé': 'text-orange-400',
  Critique: 'text-red-400',
}

export default function DebriefPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const { t } = usePreferences()
  const cachedReport = (location.state as { report?: SessionReport } | null)?.report
  const [report, setReport] = useState<SessionReport | null>(cachedReport ?? null)
  const [loading, setLoading] = useState(!cachedReport)
  const [pdfLoading, setPdfLoading] = useState(false)

  useEffect(() => {
    if (!sessionId) {
      navigate('/')
      return
    }
    if (cachedReport) return

    api
      .getSessionReport(sessionId)
      .then(setReport)
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : t.debrief.notFound)
        navigate('/')
      })
      .finally(() => setLoading(false))
  }, [sessionId, navigate, cachedReport, t.debrief.notFound])

  const handleDownloadPdf = async () => {
    if (!sessionId) return
    setPdfLoading(true)
    try {
      await api.downloadReportPdf(sessionId)
      toast.success(t.debrief.pdfSuccess)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.debrief.pdfError)
    } finally {
      setPdfLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-base)] flex items-center justify-center text-theme-muted">
        {t.debrief.loading}
      </div>
    )
  }

  if (!report) return null

  const stressLabel =
    t.stressLabels[report.stress_label as keyof typeof t.stressLabels] ?? report.stress_label
  const scoreColor = SCORE_COLOR_CLASS[report.stress_label] ?? 'text-violet-400'

  return (
    <>
      <PageHeader
        title={t.debrief.title}
        subtitle={`${t.debrief.subtitle} ${report.mode_label}`}
      />
      <div className="flex flex-wrap gap-3 mb-8">
        <Button onClick={handleDownloadPdf} loading={pdfLoading}>
          {t.debrief.downloadPdf}
        </Button>
        <Link to="/">
          <Button variant="ghost">{t.debrief.backDashboard}</Button>
        </Link>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-1 glass-card p-8 flex flex-col items-center justify-center text-center">
          <p className="text-xs uppercase tracking-wider text-theme-muted mb-2">{t.debrief.stressScore}</p>
          <p className={`text-6xl font-bold ${scoreColor}`}>{report.stress_score}</p>
          <p className="text-theme-muted mt-1">/ 100</p>
          <p className={`mt-3 font-medium ${scoreColor}`}>{stressLabel}</p>
          <p className="text-xs text-theme-muted mt-4">
            {t.debrief.duration} : {report.elapsed_minutes} min · {t.debrief.finalPhase} : {report.phase_label}
          </p>
        </div>

        <div className="lg:col-span-2 glass-card p-6">
          <h3 className="font-semibold text-theme mb-4">{t.debrief.behavioralMetrics}</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <MetricBox label={t.debrief.productivity} value={`${report.metrics.productivity}%`} color="text-emerald-400" />
            <MetricBox label={t.debrief.cognitiveLoad} value={`${report.metrics.cognitive_load}%`} color="text-amber-400" />
            <MetricBox label={t.debrief.fatigue} value={`${report.metrics.fatigue}%`} color="text-red-400" />
            <MetricBox label={t.debrief.declaredStress} value={`${report.metrics.declared_stress}/10`} color="text-violet-400" />
            <MetricBox
              label={t.debrief.tasksCompleted}
              value={`${report.metrics.tasks_completed}/${report.metrics.tasks_total}`}
              color="text-cyan-400"
            />
            <MetricBox label={t.debrief.chatMessages} value={`${report.metrics.chat_messages}`} color="text-slate-300" />
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        {report.stress_series.length > 0 && (
          <div className="glass-card p-6">
            <h3 className="font-semibold text-theme mb-4">{t.debrief.stressEvolution}</h3>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={report.stress_series}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                  <XAxis dataKey="minute" tick={{ fill: 'var(--chart-text)', fontSize: 11 }} />
                  <YAxis domain={[1, 10]} tick={{ fill: 'var(--chart-text)', fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }} />
                  <Line type="monotone" dataKey="level" stroke="#a78bfa" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {report.history.length > 1 && (
          <div className="glass-card p-6">
            <h3 className="font-semibold text-theme mb-4">{t.debrief.metricsEvolution}</h3>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={report.history}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                  <XAxis dataKey="minute" tick={{ fill: 'var(--chart-text)', fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fill: 'var(--chart-text)', fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }} />
                  <Area type="monotone" dataKey="productivity" stroke="#34d399" fill="#34d39933" />
                  <Area type="monotone" dataKey="cognitive_load" stroke="#fbbf24" fill="#fbbf2433" />
                  <Area type="monotone" dataKey="fatigue" stroke="#f87171" fill="#f8717133" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {report.behavior_analysis && (
        <div className="glass-card p-8 mb-8 border border-violet-500/30">
          <h3 className="font-semibold text-theme mb-2">{t.behavior.title}</h3>
          <p className="text-sm text-theme-muted mb-4">{t.behavior.subtitle}</p>
          <ul className="space-y-2 mb-6">
            {report.behavior_analysis.observations.map((obs, i) => (
              <li key={i} className="flex gap-2 text-sm text-theme-muted">
                <span className="text-violet-400 shrink-0">•</span>
                {obs}
              </li>
            ))}
          </ul>
          <div className="p-4 rounded-xl bg-violet-500/10 border border-violet-500/30 mb-4">
            <p className="text-sm text-theme leading-relaxed">{report.behavior_analysis.coaching}</p>
          </div>
          <p className="text-sm">
            <span className="font-medium text-theme">{t.behavior.advice}: </span>
            <span className="text-theme-muted">{report.behavior_analysis.advice}</span>
          </p>
        </div>
      )}

      {(report.badges_earned?.length ?? 0) > 0 && (
        <div className="glass-card p-8 mb-8">
          <h3 className="font-semibold text-theme mb-4">{t.badges.earned}</h3>
          <BadgeGrid badges={report.badges_earned ?? []} />
        </div>
      )}

      <div className="glass-card p-8 mb-6">
        <h3 className="font-semibold text-theme mb-2">{t.debrief.recommendations}</h3>
        <p className="text-sm text-theme-muted mb-6">{t.debrief.recommendationsDesc}</p>
        <ul className="space-y-4">
          {report.recommendations.map((rec, i) => (
            <li key={i} className="flex gap-3 p-4 rounded-xl bg-theme-card border border-theme">
              <span className="text-violet-400 font-bold shrink-0">{i + 1}.</span>
              <p className="text-sm text-theme-muted leading-relaxed">{rec}</p>
            </li>
          ))}
        </ul>
      </div>

      <p className="text-xs text-theme-muted text-center">{report.disclaimer}</p>
    </>
  )
}

function MetricBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="p-4 rounded-xl bg-theme-card border border-theme">
      <p className="text-xs text-theme-muted">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
    </div>
  )
}
