import { Link } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { toast } from 'sonner'

export default function RegisterPage() {
  const { register } = useAuth()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await register(email, fullName, password)
      toast.success('Compte créé avec succès')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de l\'inscription')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <form onSubmit={handleSubmit} className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-5">
        <h1 className="text-2xl font-bold text-white">Inscription</h1>
        <input
          type="text"
          placeholder="Nom complet"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white"
          required
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white"
          required
        />
        <input
          type="password"
          placeholder="Mot de passe (min. 6 caractères)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white"
          minLength={6}
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-medium disabled:opacity-50"
        >
          {loading ? 'Création...' : 'Créer un compte'}
        </button>
        <p className="text-sm text-slate-400 text-center">
          Déjà un compte ? <Link to="/login" className="text-violet-400 hover:underline">Se connecter</Link>
        </p>
      </form>
    </div>
  )
}
