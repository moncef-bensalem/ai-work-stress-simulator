import { Link } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { toast } from 'sonner'

export default function LoginPage() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await login(email, password)
      toast.success('Connexion réussie')
    } catch {
      toast.error('Identifiants invalides')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <form onSubmit={handleSubmit} className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-5">
        <h1 className="text-2xl font-bold text-white">Connexion</h1>
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
          placeholder="Mot de passe"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white"
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-medium disabled:opacity-50"
        >
          {loading ? 'Connexion...' : 'Se connecter'}
        </button>
        <p className="text-sm text-slate-400 text-center">
          Pas de compte ? <Link to="/register" className="text-violet-400 hover:underline">S'inscrire</Link>
        </p>
      </form>
    </div>
  )
}
