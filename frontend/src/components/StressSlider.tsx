interface StressSliderProps {
  value: number
  onChange: (value: number) => void
}

export default function StressSlider({ value, onChange }: StressSliderProps) {
  const color =
    value <= 3 ? 'accent-emerald-500' : value <= 6 ? 'accent-amber-500' : 'accent-red-500'

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-slate-400">Stress déclaré</span>
        <span className="text-white font-medium">{value}/10</span>
      </div>
      <input
        type="range"
        min={1}
        max={10}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={`w-full h-2 rounded-lg cursor-pointer ${color}`}
      />
      <div className="flex justify-between text-xs text-slate-500">
        <span>Calme</span>
        <span>Modéré</span>
        <span>Élevé</span>
      </div>
    </div>
  )
}
