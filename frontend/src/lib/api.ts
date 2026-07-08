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
  role: string
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

export interface ChatMessage {
  id: string
  session_id: string
  sender: 'user' | 'aria'
  content: string
  created_at: string | null
}

export interface SessionMessages {
  phase: string
  phase_label: string
  mode: string
  messages: ChatMessage[]
}

export interface MetricScores {
  productivity: number
  cognitive_load: number
  fatigue: number
  declared_stress: number
  completion_rate: number
  elapsed_minutes: number
  tasks_completed: number
  tasks_total: number
  chat_messages: number
  reorder_events: number
}

export interface StressPoint {
  time: string | null
  minute: number
  level: number
}

export interface MetricsHistoryPoint {
  minute: number
  productivity: number
  cognitive_load: number
  fatigue: number
  stress: number
}

export interface SessionMetrics {
  session_id: string
  phase: string
  mode: string
  current: MetricScores
  stress_series: StressPoint[]
  history: MetricsHistoryPoint[]
}

export interface UserStats {
  total_sessions: number
  completed_tasks: number
  average_stress: number
  last_mode: string | null
  last_phase: string | null
}

export interface SessionSummary {
  id: string
  display_name: string
  mode: string
  phase: string
  started_at: string | null
  ended_at?: string | null
  stress_score?: number | null
  tasks_completed: number
  tasks_total: number
}

export interface SessionReport {
  session_id: string
  display_name: string
  mode: string
  mode_label: string
  phase: string
  phase_label: string
  started_at: string | null
  ended_at: string | null
  elapsed_minutes: number
  stress_score: number
  stress_label: string
  metrics: MetricScores
  stress_series: StressPoint[]
  history: MetricsHistoryPoint[]
  recommendations: string[]
  behavior_analysis?: BehaviorAnalysis | null
  badges_earned?: UserBadge[]
  disclaimer: string
}

export interface BehaviorAnalysis {
  observations: string[]
  coaching: string
  advice: string
  signals: Record<string, number | string>
}

export interface UserBadge {
  id: string
  emoji: string
  label: string
  new: boolean
}

export interface CalendarDay {
  date: string
  sessions: SessionSummary[]
}

export interface CalendarResponse {
  year: number
  month: number
  days: CalendarDay[]
}

export interface BadgesResponse {
  badges: UserBadge[]
}

export interface ManagerEmployee {
  id: string
  full_name: string
  email: string
  sessions_count: number
  avg_stress_score: number
  avg_productivity: number
  simulation_hours: number
  difficulty_score: number
  performance_bar: number
}

export interface ManagerTeam {
  id: string
  name: string
  avg_stress_score: number
  avg_fatigue: number
  avg_cognitive_load: number
  avg_productivity: number
  simulation_hours: number
  employees: ManagerEmployee[]
}

export interface ManagerOverview {
  teams: ManagerTeam[]
  struggling_employees: ManagerEmployee[]
  total_employees: number
  total_simulation_hours: number
  total_sessions: number
}

export interface AssignedTask {
  id: string
  title: string
  description: string
  category: string
  poste: string
  poste_label: string
  priority: string
  difficulty: string
  status: string
  status_label: string
  progress: number
  estimated_minutes: number
  start_date: string | null
  due_date: string | null
  assignee_id: string | null
  assignee_name: string | null
  created_by_id: string
  team: string | null
  sort_order: number
  is_overdue: boolean
  validated_at: string | null
  created_at: string | null
}

export interface ManagerEmployeeCard {
  id: string
  full_name: string
  email: string
  poste: string
  poste_label: string
  team: string | null
  tasks: AssignedTask[]
}

export interface ManagerTaskBoard {
  available_tasks: AssignedTask[]
  employees: ManagerEmployeeCard[]
  kanban: Record<string, AssignedTask[]>
  stats: {
    total: number
    todo: number
    in_progress: number
    done: number
    overdue: number
    unassigned: number
    team_progress: number
  }
  postes: Record<string, string>
}

export interface TaskNotification {
  type: string
  title: string
  message: string
}

export interface AdminStats {
  total_users: number
  total_sessions: number
  active_sessions: number
  average_stress: number
}

export interface AdminUser {
  id: string
  email: string
  full_name: string
  role: string
  sessions_count: number
  created_at: string | null
}

export interface UserPreferences {
  theme: 'dark' | 'light' | 'auto'
  language: 'fr' | 'en' | 'ar'
  accent_color: 'violet' | 'cyan' | 'emerald' | 'rose'
  font_family: 'jakarta' | 'inter' | 'mono'
  high_contrast: boolean
  notifications: boolean
  aria_volume: number
  avatar_url: string | null
}

export interface AdminAnalytics {
  heatmap: { day: number; hour: number; value: number; sessions: number }[]
  mode_distribution: { mode: string; count: number; label: string }[]
  radar_by_mode: { mode: string; productivity: number; cognitive_load: number; fatigue: number; stress: number; completion: number }[]
  sessions_trend: { date: string; sessions: number; completed: number; avg_stress: number }[]
  avg_stress_score: number
  completion_rate: number
}

export interface AdminLive {
  open_sessions: {
    id: string
    display_name: string
    user_name: string
    user_email: string
    mode: string
    phase: string
    elapsed_minutes: number
    started_at: string | null
  }[]
  connected_users: { email: string; full_name: string; connections: number }[]
  connected_count: number
  timeline: { id: string; type: string; label: string; user: string; timestamp: string | null; meta: string | null }[]
  active_sessions: number
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

  forgotPassword: (email: string) =>
    request<{ message: string; email_sent?: boolean; dev_reset_token?: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  resetPassword: (token: string, new_password: string) =>
    request<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, new_password }),
    }),

  changePassword: (current_password: string, new_password: string) =>
    request<{ message: string }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ current_password, new_password }),
    }),

  loginGoogle: (credential: string) =>
    request<TokenResponse>('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ credential }),
    }),

  loginWebAuthn: (
    email: string,
    payload: { credential_id: string; authenticator_data: string; client_data_json: string; signature: string },
  ) =>
    request<TokenResponse>('/auth/webauthn/login', {
      method: 'POST',
      body: JSON.stringify({ email, ...payload }),
    }),

  registerWebAuthn: (credential: Record<string, string>) =>
    request<{ message: string }>('/auth/webauthn/register', {
      method: 'POST',
      body: JSON.stringify(credential),
    }),

  getFaceStatus: () => request<{ registered: boolean }>('/auth/face/status'),

  registerFace: (descriptor: number[]) =>
    request<{ message: string }>('/auth/face/register', {
      method: 'POST',
      body: JSON.stringify({ descriptor }),
    }),

  loginFace: (email: string, descriptor: number[]) =>
    request<TokenResponse>('/auth/face/login', {
      method: 'POST',
      body: JSON.stringify({ email, descriptor }),
    }),

  getPreferences: () => request<UserPreferences>('/auth/preferences'),

  updatePreferences: (patch: Partial<UserPreferences>) =>
    request<UserPreferences>('/auth/preferences', {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }),

  getUserStats: () => request<UserStats>('/dashboard/stats'),

  getUserSessions: () => request<SessionSummary[]>('/dashboard/sessions'),

  getSessionCalendar: (year: number, month: number) =>
    request<CalendarResponse>(`/dashboard/calendar?year=${year}&month=${month}`),

  getUserBadges: () => request<BadgesResponse>('/dashboard/badges'),

  getManagerOverview: () => request<ManagerOverview>('/manager/overview'),

  getManagerTaskBoard: () => request<ManagerTaskBoard>('/manager/tasks/board'),

  createManagerTask: (data: Record<string, unknown>) =>
    request<AssignedTask>('/manager/tasks', { method: 'POST', body: JSON.stringify(data) }),

  updateManagerTask: (taskId: string, data: Record<string, unknown>) =>
    request<AssignedTask>(`/manager/tasks/${taskId}`, { method: 'PUT', body: JSON.stringify(data) }),

  assignManagerTask: (taskId: string, assigneeId: string | null) =>
    request<AssignedTask>(`/manager/tasks/${taskId}/assign`, {
      method: 'PUT',
      body: JSON.stringify({ assignee_id: assigneeId }),
    }),

  validateManagerTask: (taskId: string) =>
    request<AssignedTask>(`/manager/tasks/${taskId}/validate`, { method: 'POST' }),

  getUserAssignedTasks: () => request<AssignedTask[]>('/dashboard/assigned-tasks'),

  updateUserTaskStatus: (taskId: string, status: string, progress?: number) =>
    request<AssignedTask>(`/dashboard/assigned-tasks/${taskId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, progress }),
    }),

  getAdminStats: () => request<AdminStats>('/admin/stats'),

  getAdminAnalytics: () => request<AdminAnalytics>('/admin/analytics'),

  getAdminLive: () => request<AdminLive>('/admin/live'),

  getAdminUsers: () => request<AdminUser[]>('/admin/users'),

  createAdminUser: (data: { email: string; full_name: string; password: string; role: string }) =>
    request<AdminUser>('/admin/users', { method: 'POST', body: JSON.stringify(data) }),

  deleteAdminUser: (id: string) => request<void>(`/admin/users/${id}`, { method: 'DELETE' }),

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

  getMessages: (sessionId: string) =>
    request<SessionMessages>(`/sessions/${sessionId}/messages`),

  getMetrics: (sessionId: string) =>
    request<SessionMetrics>(`/sessions/${sessionId}/metrics`),

  closeSession: (sessionId: string) =>
    request<SessionReport>(`/sessions/${sessionId}/close`, { method: 'POST' }),

  getSessionReport: (sessionId: string) =>
    request<SessionReport>(`/sessions/${sessionId}/report`),

  downloadReportPdf: async (sessionId: string) => {
    const token = getToken()
    const res = await fetch(`${API_BASE}/sessions/${sessionId}/report.pdf`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Erreur serveur' }))
      throw new Error(err.detail || 'Impossible de télécharger le PDF')
    }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `rapport-stress-${sessionId.slice(0, 8)}.pdf`
    link.click()
    URL.revokeObjectURL(url)
  },

  health: () => request<{ status: string; database: string; aria?: string }>('/health'),
}

export function saveTokens(tokens: TokenResponse) {
  localStorage.setItem('access_token', tokens.access_token)
  localStorage.setItem('refresh_token', tokens.refresh_token)
}

export function clearTokens() {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
}
