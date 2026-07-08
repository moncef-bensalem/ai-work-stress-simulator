import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { api, clearTokens, saveTokens, type User } from '../lib/api'

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  loginGoogle: (credential: string) => Promise<void>
  loginBiometric: (
    email: string,
    payload: { credential_id: string; authenticator_data: string; client_data_json: string; signature: string },
  ) => Promise<void>
  loginFace: (email: string, descriptor: number[]) => Promise<void>
  register: (email: string, fullName: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

async function applyTokens() {
  const user = await api.me()
  return user
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      setLoading(false)
      return
    }
    api.me()
      .then(setUser)
      .catch(() => clearTokens())
      .finally(() => setLoading(false))
  }, [])

  const login = async (email: string, password: string) => {
    const tokens = await api.login(email, password)
    saveTokens(tokens)
    setUser(await applyTokens())
  }

  const loginGoogle = async (credential: string) => {
    const tokens = await api.loginGoogle(credential)
    saveTokens(tokens)
    setUser(await applyTokens())
  }

  const loginBiometric = async (
    email: string,
    payload: { credential_id: string; authenticator_data: string; client_data_json: string; signature: string },
  ) => {
    const tokens = await api.loginWebAuthn(email, payload)
    saveTokens(tokens)
    setUser(await applyTokens())
  }

  const loginFace = async (email: string, descriptor: number[]) => {
    const tokens = await api.loginFace(email, descriptor)
    saveTokens(tokens)
    setUser(await applyTokens())
  }

  const register = async (email: string, fullName: string, password: string) => {
    await api.register(email, fullName, password)
    await login(email, password)
  }

  const logout = () => {
    clearTokens()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, loginGoogle, loginBiometric, loginFace, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
