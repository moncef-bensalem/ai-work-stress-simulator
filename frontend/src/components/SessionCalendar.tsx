import { useMemo, useState } from 'react'
import type { CalendarDay, SessionSummary } from '../lib/api'
import { usePreferences } from '../contexts/PreferencesContext'

interface SessionCalendarProps {
  year: number
  month: number
  days: CalendarDay[]
  onSelectSession: (session: SessionSummary) => void
  onMonthChange: (year: number, month: number) => void
}

const WEEKDAYS_FR = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

export default function SessionCalendar({
  year,
  month,
  days,
  onSelectSession,
  onMonthChange,
}: SessionCalendarProps) {
  const { t } = usePreferences()
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const sessionsByDate = useMemo(() => {
    const map = new Map<string, SessionSummary[]>()
    for (const day of days) {
      map.set(day.date, day.sessions)
    }
    return map
  }, [days])

  const monthLabel = new Date(year, month - 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })

  const firstDay = new Date(year, month - 1, 1)
  const offset = (firstDay.getDay() + 6) % 7
  const daysInMonth = new Date(year, month, 0).getDate()

  const cells: (number | null)[] = [...Array(offset).fill(null)]
  for (let d = 1; d <= daysInMonth; d += 1) cells.push(d)

  const prevMonth = () => {
    const d = new Date(year, month - 2, 1)
    onMonthChange(d.getFullYear(), d.getMonth() + 1)
    setSelectedDate(null)
  }

  const nextMonth = () => {
    const d = new Date(year, month, 1)
    onMonthChange(d.getFullYear(), d.getMonth() + 1)
    setSelectedDate(null)
  }

  const selectedSessions = selectedDate ? sessionsByDate.get(selectedDate) ?? [] : []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button type="button" onClick={prevMonth} className="text-theme-muted hover:text-theme px-2">‹</button>
        <p className="text-sm font-medium text-theme capitalize">{monthLabel}</p>
        <button type="button" onClick={nextMonth} className="text-theme-muted hover:text-theme px-2">›</button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs text-theme-muted mb-1">
        {WEEKDAYS_FR.map((d, i) => (
          <span key={`${d}-${i}`}>{d}</span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, index) => {
          if (day === null) return <div key={`empty-${index}`} />
          const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const count = sessionsByDate.get(dateKey)?.length ?? 0
          const isSelected = selectedDate === dateKey
          return (
            <button
              key={dateKey}
              type="button"
              disabled={count === 0}
              onClick={() => setSelectedDate(dateKey)}
              className={`aspect-square rounded-lg text-sm flex flex-col items-center justify-center transition-colors ${
                count > 0
                  ? isSelected
                    ? 'bg-violet-500/30 border border-violet-400 text-theme'
                    : 'bg-theme-card border border-theme hover:border-violet-400/40 text-theme'
                  : 'text-theme-muted/40 cursor-default'
              }`}
            >
              <span>{day}</span>
              {count > 0 && (
                <span className="flex gap-0.5 mt-0.5">
                  {Array.from({ length: Math.min(count, 3) }).map((_, i) => (
                    <span key={i} className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                  ))}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {selectedDate && (
        <div className="pt-2 border-t border-theme">
          <p className="text-xs text-theme-muted mb-2">{t.calendar.sessionsOn} {selectedDate}</p>
          {selectedSessions.length === 0 ? (
            <p className="text-sm text-theme-muted">{t.calendar.noSessions}</p>
          ) : (
            <ul className="space-y-2">
              {selectedSessions.map((session) => (
                <li key={session.id}>
                  <button
                    type="button"
                    onClick={() => onSelectSession(session)}
                    className="w-full text-left p-3 rounded-lg bg-theme-card border border-theme hover:border-violet-400/40 transition-colors"
                  >
                    <p className="text-sm font-medium text-theme">{session.display_name}</p>
                    <p className="text-xs text-theme-muted capitalize">
                      {session.mode}
                      {session.stress_score != null ? ` · ${session.stress_score}/100` : ''}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
