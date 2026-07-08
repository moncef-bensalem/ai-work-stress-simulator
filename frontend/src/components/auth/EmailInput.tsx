import { validateEmail } from '../../lib/validation'
import { usePreferences } from '../../contexts/PreferencesContext'

interface EmailInputProps {
  id?: string
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  touched?: boolean
  placeholder?: string
  autoComplete?: string
}

export default function EmailInput({
  id = 'email',
  value,
  onChange,
  onBlur,
  touched = false,
  placeholder,
  autoComplete = 'email',
}: EmailInputProps) {
  const { t } = usePreferences()
  const result = validateEmail(value)
  const showError = touched && !result.valid

  return (
    <div className="space-y-1">
      <input
        id={id}
        type="email"
        placeholder={placeholder ?? t.login.emailPlaceholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        className={`input-field ${showError ? 'border-red-500/60 ring-1 ring-red-500/30' : touched && result.valid ? 'border-emerald-500/50 ring-1 ring-emerald-500/20' : ''}`}
        autoComplete={autoComplete}
        aria-invalid={showError}
        aria-describedby={showError ? `${id}-error` : undefined}
      />
      {showError && result.messageKey && (
        <p id={`${id}-error`} className="text-xs text-red-400">
          {t.validation.email[result.messageKey]}
        </p>
      )}
      {touched && result.valid && value.trim() && (
        <p className="text-xs text-emerald-400">{t.validation.email.valid}</p>
      )}
    </div>
  )
}
