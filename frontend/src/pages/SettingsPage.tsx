import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { PageHeader } from '../components/layout/DashboardLayout'
import Button from '../components/ui/Button'
import PasswordInput from '../components/auth/PasswordInput'
import { api } from '../lib/api'
import { isStrongPassword } from '../lib/validation'
import { usePreferences, type AccentColor, type FontFamily, type Language, type ThemeMode } from '../contexts/PreferencesContext'

const ACCENTS: { id: AccentColor; color: string }[] = [
  { id: 'violet', color: '#8b5cf6' },
  { id: 'cyan', color: '#06b6d4' },
  { id: 'emerald', color: '#10b981' },
  { id: 'rose', color: '#f43f5e' },
]

const FONTS: { id: FontFamily; label: string }[] = [
  { id: 'jakarta', label: 'Plus Jakarta Sans' },
  { id: 'inter', label: 'Inter' },
  { id: 'mono', label: 'JetBrains Mono' },
]

const LANGUAGES: { id: Language; label: string }[] = [
  { id: 'fr', label: 'Français' },
  { id: 'en', label: 'English' },
  { id: 'ar', label: 'العربية' },
]

const THEMES: { id: ThemeMode; labelKey: 'dark' | 'light' | 'auto' }[] = [
  { id: 'dark', labelKey: 'dark' },
  { id: 'light', labelKey: 'light' },
  { id: 'auto', labelKey: 'auto' },
]

export default function SettingsPage() {
  const { preferences, t, updatePreferences } = usePreferences()
  const [saving, setSaving] = useState(false)
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [newPasswordTouched, setNewPasswordTouched] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const newPasswordStrong = isStrongPassword(newPassword)
  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0
  const canChangePassword =
    currentPassword.length > 0 && newPasswordStrong && passwordsMatch

  const handleAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 500_000) {
      toast.error('Image trop volumineuse (max 500 Ko)')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      updatePreferences({ avatar_url: reader.result as string })
      toast.success(t.settings.saved)
    }
    reader.readAsDataURL(file)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await updatePreferences({})
      toast.success(t.settings.saved)
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setNewPasswordTouched(true)
    if (!passwordsMatch) {
      toast.error(t.settings.passwordMismatch)
      return
    }
    if (!newPasswordStrong) {
      toast.error(t.validation.password.tooWeak)
      return
    }
    setPasswordSaving(true)
    try {
      await api.changePassword(currentPassword, newPassword)
      toast.success(t.settings.passwordChanged)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setNewPasswordTouched(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.settings.passwordChangeError)
    } finally {
      setPasswordSaving(false)
    }
  }

  return (
    <>
      <PageHeader title={t.settings.title} subtitle={t.settings.subtitle} />
      <div className="grid lg:grid-cols-2 gap-6">
        <section className="glass-card p-6 space-y-6">
          <h3 className="font-semibold text-theme text-lg">{t.settings.profile}</h3>
          <div className="flex items-center gap-4">
            {preferences.avatar_url ? (
              <img src={preferences.avatar_url} alt="" className="w-20 h-20 rounded-2xl object-cover border-2 border-theme" />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-2xl font-bold text-white">
                ?
              </div>
            )}
            <div>
              <p className="text-sm text-theme-muted mb-2">{t.settings.avatar}</p>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatar} />
              <Button type="button" variant="ghost" onClick={() => fileRef.current?.click()}>
                {t.settings.uploadAvatar}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-theme-muted">{t.settings.language}</label>
            <div className="grid grid-cols-3 gap-2">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.id}
                  type="button"
                  onClick={() => updatePreferences({ language: lang.id })}
                  className={`py-2.5 rounded-xl text-sm border transition-all ${
                    preferences.language === lang.id
                      ? 'border-[var(--accent-primary)] bg-[color-mix(in_srgb,var(--accent-primary)_15%,transparent)] text-theme'
                      : 'border-theme text-theme-muted hover:text-theme'
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="glass-card p-6 space-y-6">
          <div>
            <h3 className="font-semibold text-theme text-lg">{t.settings.security}</h3>
            <p className="text-sm text-theme-muted mt-1">{t.settings.changePasswordDesc}</p>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4" noValidate>
            <div className="space-y-2">
              <label className="text-sm text-theme-muted" htmlFor="current-password">
                {t.settings.currentPassword}
              </label>
              <input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="input-field"
                autoComplete="current-password"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-theme-muted" htmlFor="new-password">
                {t.settings.newPassword}
              </label>
              <PasswordInput
                id="new-password"
                value={newPassword}
                onChange={(v) => {
                  setNewPassword(v)
                  if (!newPasswordTouched && v.length > 0) setNewPasswordTouched(true)
                }}
                touched={newPasswordTouched}
                requireStrong
                autoComplete="new-password"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-theme-muted" htmlFor="confirm-password">
                {t.settings.confirmPassword}
              </label>
              <input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`input-field ${
                  confirmPassword && !passwordsMatch ? 'border-red-500/60 ring-1 ring-red-500/30' : ''
                }`}
                autoComplete="new-password"
              />
              {confirmPassword && !passwordsMatch && (
                <p className="text-xs text-red-400">{t.settings.passwordMismatch}</p>
              )}
            </div>

            <Button type="submit" loading={passwordSaving} disabled={!canChangePassword}>
              {t.settings.changePassword}
            </Button>
          </form>
        </section>

        <section className="glass-card p-6 space-y-6">
          <h3 className="font-semibold text-theme text-lg">{t.settings.appearance}</h3>

          <div className="space-y-2">
            <label className="text-sm text-theme-muted">{t.settings.theme}</label>
            <div className="grid grid-cols-3 gap-2">
              {THEMES.map((theme) => (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => updatePreferences({ theme: theme.id })}
                  className={`py-2.5 rounded-xl text-sm border transition-all ${
                    preferences.theme === theme.id
                      ? 'border-[var(--accent-primary)] bg-[color-mix(in_srgb,var(--accent-primary)_15%,transparent)]'
                      : 'border-theme text-theme-muted'
                  }`}
                >
                  {t.theme[theme.labelKey]}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-theme-muted">{t.settings.accent}</label>
            <div className="flex gap-3">
              {ACCENTS.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => updatePreferences({ accent_color: a.id })}
                  className={`w-10 h-10 rounded-full border-2 transition-transform ${
                    preferences.accent_color === a.id ? 'scale-110 border-white' : 'border-transparent'
                  }`}
                  style={{ background: a.color }}
                  aria-label={a.id}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-theme-muted">{t.settings.font}</label>
            <select
              className="input-field"
              value={preferences.font_family}
              onChange={(e) => updatePreferences({ font_family: e.target.value as FontFamily })}
            >
              {FONTS.map((f) => (
                <option key={f.id} value={f.id}>{f.label}</option>
              ))}
            </select>
          </div>

          <label className="flex items-center justify-between gap-4 cursor-pointer">
            <span className="text-sm text-theme">{t.settings.contrast}</span>
            <input
              type="checkbox"
              checked={preferences.high_contrast}
              onChange={(e) => updatePreferences({ high_contrast: e.target.checked })}
              className="w-5 h-5 accent-[var(--accent-primary)]"
            />
          </label>
        </section>

        <section className="glass-card p-6 space-y-6 lg:col-span-2">
          <h3 className="font-semibold text-theme text-lg">{t.settings.aria}</h3>

          <div className="grid sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-theme-muted">{t.settings.volume}</span>
                <span className="text-theme">{preferences.aria_volume}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={preferences.aria_volume}
                onChange={(e) => updatePreferences({ aria_volume: Number(e.target.value) })}
                className="w-full accent-[var(--accent-primary)]"
              />
            </div>

            <label className="flex items-start gap-4 cursor-pointer p-4 rounded-xl border border-theme">
              <input
                type="checkbox"
                checked={preferences.notifications}
                onChange={(e) => updatePreferences({ notifications: e.target.checked })}
                className="mt-1 w-5 h-5 accent-[var(--accent-primary)]"
              />
              <div>
                <p className="text-sm font-medium text-theme">{t.settings.notifications}</p>
                <p className="text-xs text-theme-muted mt-1">{t.settings.notificationsDesc}</p>
              </div>
            </label>
          </div>

          <Button onClick={handleSave} loading={saving} className="sm:w-auto">
            {t.settings.save}
          </Button>
        </section>
      </div>
    </>
  )
}
