import type { UserBadge } from '../lib/api'
import { usePreferences } from '../contexts/PreferencesContext'

interface BadgeGridProps {
  badges: UserBadge[]
  compact?: boolean
}

export default function BadgeGrid({ badges, compact }: BadgeGridProps) {
  const { t } = usePreferences()

  if (badges.length === 0) {
    return (
      <p className="text-sm text-theme-muted">{t.badges.empty}</p>
    )
  }

  return (
    <div className={`grid ${compact ? 'grid-cols-2 gap-2' : 'grid-cols-2 sm:grid-cols-3 gap-3'}`}>
      {badges.map((badge) => (
        <div
          key={badge.id}
          className={`relative p-3 rounded-xl border text-center transition-transform hover:scale-[1.02] ${
            badge.new
              ? 'border-amber-400/50 bg-amber-500/10 shadow-lg shadow-amber-500/10'
              : 'border-theme bg-theme-card'
          }`}
        >
          {badge.new && (
            <span className="absolute -top-2 -right-2 text-[10px] px-2 py-0.5 rounded-full bg-amber-500 text-black font-bold">
              NEW
            </span>
          )}
          <p className="text-2xl">{badge.emoji}</p>
          <p className="text-xs text-theme-muted mt-1 leading-tight">{badge.label}</p>
        </div>
      ))}
    </div>
  )
}
