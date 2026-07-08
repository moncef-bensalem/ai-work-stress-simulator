import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useState } from 'react'
import { toast } from 'sonner'
import { api } from '../lib/api'
import AuthLayout from '../components/layout/AuthLayout'
import Button from '../components/ui/Button'

export default function ResetPasswordPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const token = params.get('token') ?? ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) {
      toast.error('Les mots de passe ne correspondent pas')
      return
    }
    setLoading(true)
    try {
      await api.resetPassword(token, password)
      toast.success('Mot de passe mis à jour')
      navigate('/login')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Lien invalide ou expiré')
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <AuthLayout title="Lien invalide" subtitle="Ce lien de réinitialisation est incorrect">
        <Link to="/forgot-password" className="text-violet-400">
          Demander un nouveau lien
        </Link>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Nouveau mot de passe" subtitle="Choisissez un mot de passe sécurisé">
      <form onSubmit={handleSubmit} className="space-y-5">
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="input-field" placeholder="Nouveau mot de passe" minLength={6} required />
        <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="input-field" placeholder="Confirmer" minLength={6} required />
        <Button type="submit" loading={loading} className="w-full">
          Réinitialiser
        </Button>
      </form>
    </AuthLayout>
  )
}
