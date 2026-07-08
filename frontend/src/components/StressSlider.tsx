import { usePreferences } from '../contexts/PreferencesContext'

interface StressSliderProps {
  value: number
  onChange: (value: number) => void
}

export default function StressSlider({ value, onChange }: StressSliderProps) {
  const { t } = usePreferences()
  const color =
    value <= 3 ? 'accent-emerald-500' : value <= 6 ? 'accent-amber-500' : 'accent-red-500'

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-theme-muted">{t.stressSlider.label}</span>
        <span className="text-theme font-medium">{value}/10</span>
      </div>
      <input
        type="range"
        min={1}
        max={10}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={`w-full h-2 rounded-lg cursor-pointer ${color}`}
      />
      <div className="flex justify-between text-xs text-theme-muted">
        <span>{t.stressSlider.calm}</span>
        <span>{t.stressSlider.moderate}</span>
        <span>{t.stressSlider.high}</span>
      </div>
    </div>
  )
}
