import { useMemo } from 'react'
import {
  computePasswordStrength,
  strengthColor,
  strengthTextColor,
} from '../../lib/validation'
import { usePreferences } from '../../contexts/PreferencesContext'

interface PasswordInputProps {
  id?: string
  value: string
  onChange: (value: string) => void
  showStrength?: boolean
  requireStrong?: boolean
  touched?: boolean
  showToggle?: boolean
  showPassword?: boolean
  onToggleShow?: () => void
  placeholder?: string
  autoComplete?: string
}

export default function PasswordInput({
  id = 'password',
  value,
  onChange,
  showStrength = true,
  requireStrong = false,
  touched = false,
  showToggle = false,
  showPassword = false,
  onToggleShow,
  placeholder = '••••••••',
  autoComplete = 'current-password',
}: PasswordInputProps) {
  const { t } = usePreferences()
  const strength = useMemo(() => computePasswordStrength(value), [value])

  const tooWeak = requireStrong && touched && value.length > 0 && strength.score < 70

  return (
    <div className="space-y-2">
      <div className="relative">
        <input
          id={id}
          type={showPassword ? 'text' : 'password'}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`input-field ${showToggle ? 'pr-12' : ''} ${tooWeak ? 'border-red-500/60 ring-1 ring-red-500/30' : ''}`}
          autoComplete={autoComplete}
          aria-describedby={showStrength ? `${id}-strength` : undefined}
        />
        {showToggle && onToggleShow && (
          <button
            type="button"
            onClick={onToggleShow}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-slate-300"
          >
            {showPassword ? t.login.hidePassword : t.login.showPassword}
          </button>
        )}
      </div>

      {showStrength && value.length > 0 && (
        <div id={`${id}-strength`} className="space-y-2 animate-fade-up">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">{t.validation.password.strength}</span>
            <span className={`font-semibold ${strengthTextColor(strength.score)}`}>
              {strength.score}% — {t.validation.password.labels[strength.labelKey]}
            </span>
          </div>
          <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${strengthColor(strength.score)}`}
              style={{ width: `${strength.score}%` }}
            />
          </div>
          <ul className="grid grid-cols-2 gap-1 text-[11px] text-slate-500">
            {(
              [
                ['length', t.validation.password.rules.length],
                ['uppercase', t.validation.password.rules.uppercase],
                ['lowercase', t.validation.password.rules.lowercase],
                ['number', t.validation.password.rules.number],
                ['special', t.validation.password.rules.special],
              ] as const
            ).map(([key, label]) => (
              <li
                key={key}
                className={strength.checks[key] ? 'text-emerald-400' : ''}
              >
                {strength.checks[key] ? '✓' : '○'} {label}
              </li>
            ))}
          </ul>
        </div>
      )}

      {tooWeak && (
        <p className="text-xs text-red-400">{t.validation.password.tooWeak}</p>
      )}
    </div>
  )
}
