import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { usePreferences } from '../contexts/PreferencesContext'
import { toast } from 'sonner'
import AuthLayout from '../components/layout/AuthLayout'
import Button from '../components/ui/Button'
import EmailInput from '../components/auth/EmailInput'
import PasswordInput from '../components/auth/PasswordInput'
import { isStrongPassword, validateEmail } from '../lib/validation'

export default function RegisterPage() {
  const { register } = useAuth()
  const { t } = usePreferences()
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [emailTouched, setEmailTouched] = useState(false)
  const [passwordTouched, setPasswordTouched] = useState(false)

  const emailValid = validateEmail(email).valid
  const passwordStrong = isStrongPassword(password)
  const canSubmit = fullName.trim().length >= 2 && emailValid && passwordStrong

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setEmailTouched(true)
    setPasswordTouched(true)

    if (!canSubmit) {
      if (!emailValid) toast.error(t.login.invalidEmail)
      else if (!passwordStrong) toast.error(t.validation.password.tooWeak)
      return
    }

    setLoading(true)
    try {
      await register(email.trim(), fullName.trim(), password)
      toast.success(t.register.success)
      navigate('/')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.register.error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      title={t.register.title}
      subtitle={t.register.subtitle}
      footer={
        <p>
          {t.register.hasAccount}{' '}
          <Link to="/login" className="text-violet-400 hover:text-violet-300 font-medium">
            {t.register.login}
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300" htmlFor="register-name">
            {t.register.fullName}
          </label>
          <input
            id="register-name"
            type="text"
            placeholder={t.register.fullNamePlaceholder}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="input-field"
            minLength={2}
            required
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300" htmlFor="register-email">
            {t.register.email}
          </label>
          <EmailInput
            id="register-email"
            value={email}
            onChange={setEmail}
            onBlur={() => setEmailTouched(true)}
            touched={emailTouched}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300" htmlFor="register-password">
            {t.register.password}
          </label>
          <PasswordInput
            id="register-password"
            value={password}
            onChange={(v) => {
              setPassword(v)
              if (!passwordTouched && v.length > 0) setPasswordTouched(true)
            }}
            touched={passwordTouched}
            requireStrong
            placeholder={t.register.passwordPlaceholder}
            autoComplete="new-password"
          />
        </div>

        <Button type="submit" loading={loading} className="w-full" disabled={!canSubmit}>
          {t.register.submit}
        </Button>
      </form>
    </AuthLayout>
  )
}
