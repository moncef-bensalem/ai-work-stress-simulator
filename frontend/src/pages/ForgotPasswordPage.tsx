import { Link } from 'react-router-dom'
import { useState } from 'react'
import { toast } from 'sonner'
import { api } from '../lib/api'
import AuthLayout from '../components/layout/AuthLayout'
import Button from '../components/ui/Button'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [resetPath, setResetPath] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await api.forgotPassword(email)
      setSent(true)
      setEmailSent(Boolean(res.email_sent))
      if (res.dev_reset_token) {
        setResetPath(`/reset-password?token=${res.dev_reset_token}`)
      }
      toast.success(res.email_sent ? 'Email envoyé — vérifiez votre boîte mail' : 'Lien généré')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la demande')
    } finally {
      setLoading(false)
    }
  }

  const copyLink = () => {
    if (!resetPath) return
    navigator.clipboard.writeText(`${window.location.origin}${resetPath}`).then(() => toast.success('Lien copié'))
  }

  return (
    <AuthLayout
      title="Mot de passe oublié"
      subtitle="Nous vous enverrons un lien pour réinitialiser votre mot de passe"
      footer={
        <Link to="/login" className="text-violet-400 hover:text-violet-300 font-medium">
          Retour à la connexion
        </Link>
      }
    >
      {sent ? (
        <div className="space-y-5">
          {emailSent ? (
            <>
              <div className="text-center space-y-3">
                <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/15 flex items-center justify-center text-2xl">
                  ✉
                </div>
                <p className="text-slate-300 text-sm leading-relaxed">
                  Un email a été envoyé à <strong className="text-white">{email}</strong>.
                </p>
                <p className="text-slate-500 text-xs">
                  Vérifiez votre boîte de réception et les spams. Le lien expire dans 1 heure.
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-left">
                <p className="text-amber-200 text-sm font-medium">SMTP non configuré</p>
                <p className="text-amber-200/80 text-xs mt-1">
                  Aucun email n&apos;a pu être envoyé. Utilisez le lien ci-dessous ou configurez SMTP dans le backend.
                </p>
              </div>
              {resetPath && (
                <div className="space-y-3">
                  <Link to={resetPath}>
                    <Button type="button" className="w-full">
                      Réinitialiser mon mot de passe →
                    </Button>
                  </Link>
                  <button type="button" onClick={copyLink} className="w-full text-xs text-slate-500 hover:text-cyan-400">
                    Copier le lien
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Adresse e-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
              placeholder="votre@email.com"
              required
            />
          </div>
          <Button type="submit" loading={loading} className="w-full">
            Envoyer le lien par email
          </Button>
        </form>
      )}
    </AuthLayout>
  )
}
