import { useEffect, useMemo, useRef, useState } from 'react'
import { Line, LineChart, ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { toast } from 'sonner'
import { connectSocket, getSocket } from '../lib/socket'
import type { SessionMetrics, StressPoint } from '../lib/api'
import { usePreferences } from '../contexts/PreferencesContext'

interface LiveStressChartProps {
  sessionId: string | null
  metrics: SessionMetrics | null
}

function stressColor(level: number): string {
  if (level >= 8) return '#f87171'
  if (level >= 6) return '#fbbf24'
  if (level >= 4) return '#a78bfa'
  return '#34d399'
}

export default function LiveStressChart({ sessionId, metrics }: LiveStressChartProps) {
  const { preferences, t } = usePreferences()
  const [series, setSeries] = useState<StressPoint[]>([])
  const [pulse, setPulse] = useState(false)
  const lastLevelRef = useRef<number | null>(null)

  useEffect(() => {
    if (metrics?.stress_series) {
      setSeries(metrics.stress_series)
      const last = metrics.stress_series.at(-1)
      if (last) lastLevelRef.current = last.level
    }
  }, [metrics?.stress_series])

  useEffect(() => {
    if (!sessionId) return
    const socket = connectSocket()

    const onStress = (payload: { session_id: string; level: number; minute: number }) => {
      if (payload.session_id !== sessionId) return
      const point: StressPoint = {
        level: payload.level,
        minute: payload.minute,
        time: new Date().toISOString(),
      }
      setSeries((prev) => [...prev, point])
      setPulse(true)
      setTimeout(() => setPulse(false), 1200)

      if (payload.level >= 8 && preferences.notifications) {
        toast.warning(t.desk.stressHigh, { id: 'stress-peak' })
      } else if (payload.level >= 6 && preferences.notifications) {
        toast.info(t.liveStress.peakDetected, { duration: 3000 })
      }
      lastLevelRef.current = payload.level
    }

    const onMetrics = (payload: SessionMetrics) => {
      if (payload.session_id === sessionId && payload.stress_series.length) {
        setSeries(payload.stress_series)
      }
    }

    socket.on('stress_update', onStress)
    socket.on('metrics_update', onMetrics)
    return () => {
      getSocket().off('stress_update', onStress)
      getSocket().off('metrics_update', onMetrics)
    }
  }, [sessionId, preferences.notifications, t.desk.stressHigh, t.liveStress.peakDetected])

  const chartData = useMemo(
    () =>
      series.map((point, index) => ({
        ...point,
        index: point.minute ?? index,
        fill: stressColor(point.level),
      })),
    [series],
  )

  const currentLevel = chartData.at(-1)?.level ?? metrics?.current.declared_stress ?? 5
  const borderColor = stressColor(currentLevel)

  if (chartData.length === 0) {
    return (
      <div className="rounded-lg bg-theme-card p-3 border border-theme">
        <p className="text-xs text-theme-muted mb-1">{t.liveStress.title}</p>
        <p className="text-sm text-theme-muted">{t.liveStress.waiting}</p>
      </div>
    )
  }

  const lastPoint = chartData[chartData.length - 1]

  return (
    <div
      className={`rounded-lg bg-theme-card p-3 border transition-all duration-500 ${
        pulse ? 'ring-2 ring-offset-0' : 'border-theme'
      }`}
      style={pulse ? { borderColor, boxShadow: `0 0 20px ${borderColor}44` } : undefined}
    >
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-theme-muted">{t.liveStress.title}</p>
        <span className="text-lg font-bold" style={{ color: borderColor }}>
          {currentLevel}/10
        </span>
      </div>
      <div className="h-36">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <XAxis
              dataKey="index"
              tick={{ fill: 'var(--chart-text)', fontSize: 10 }}
              label={{ value: t.liveStress.time, position: 'insideBottom', offset: -2, fill: 'var(--chart-text)', fontSize: 10 }}
            />
            <YAxis domain={[1, 10]} tick={{ fill: 'var(--chart-text)', fontSize: 10 }} width={24} />
            <Tooltip
              contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', fontSize: 12 }}
              formatter={(value) => [`${value ?? 0}/10`, t.metrics.declaredStress]}
            />
            <Line
              type="monotone"
              dataKey="level"
              stroke={borderColor}
              strokeWidth={2.5}
              dot={false}
              isAnimationActive
            />
            <ReferenceDot x={lastPoint.index} y={lastPoint.level} r={5} fill={borderColor} stroke="#fff" strokeWidth={1} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
