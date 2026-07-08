const API_BASE = '/api'

function getToken(): string | null {
  return localStorage.getItem('access_token')
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Erreur serveur' }))
    throw new Error(err.detail || 'Erreur serveur')
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

export interface User {
  id: string
  email: string
  full_name: string
}

export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
}

export interface WorkSession {
  id: string
  display_name: string
  mode: string
  phase: string
  started_at: string | null
  ended_at: string | null
}

export interface Task {
  id: string
  session_id: string
  title: string
  description: string
  category: string
  status: string
  sort_order: number
  allocated_minutes: number
  deadline: string | null
}

export const api = {
  register: (email: string, full_name: string, password: string) =>
    request<User>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, full_name, password }),
    }),

  login: async (email: string, password: string): Promise<TokenResponse> => {
    const form = new URLSearchParams()
    form.append('username', email)
    form.append('password', password)
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form,
    })
    if (!res.ok) throw new Error('Identifiants invalides')
    return res.json()
  },

  me: () => request<User>('/auth/me'),

  startSession: (display_name: string, mode: string) =>
    request<WorkSession>('/sessions', {
      method: 'POST',
      body: JSON.stringify({ display_name, mode }),
    }),

  getTasks: (sessionId: string) => request<Task[]>(`/sessions/${sessionId}/tasks`),

  updateTask: (taskId: string, data: { status?: string; sort_order?: number }) =>
    request<Task>(`/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  recordStress: (sessionId: string, level: number) =>
    request(`/sessions/${sessionId}/stress`, {
      method: 'POST',
      body: JSON.stringify({ level }),
    }),

  health: () => request<{ status: string; database: string }>('/health'),
}

export function saveTokens(tokens: TokenResponse) {
  localStorage.setItem('access_token', tokens.access_token)
  localStorage.setItem('refresh_token', tokens.refresh_token)
}

export function clearTokens() {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
}
