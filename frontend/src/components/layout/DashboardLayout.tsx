import { useLocation, useNavigate } from 'react-router-dom'
import { useEffect, type ReactNode } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { usePreferences } from '../../contexts/PreferencesContext'
import NotificationBell from '../NotificationBell'

interface PageHeaderProps {
  title: string
  subtitle?: string
}

export function PageHeader({ title, subtitle }: PageHeaderProps) {
  return (
    <div className="relative z-20 mb-8 animate-fade-up">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-theme">{title}</h1>
          {subtitle && <p className="text-theme-muted mt-2">{subtitle}</p>}
        </div>
        <NotificationBell />
      </div>
    </div>
  )
}

interface DashboardLayoutProps {
  children: ReactNode
  title: string
  subtitle?: string
  wide?: boolean
}

/** @deprecated Prefer DashboardShell route layout + PageHeader */
export default function DashboardLayout({ children, title, subtitle, wide }: DashboardLayoutProps) {
  const maxWidth = wide ? 'max-w-[1600px]' : 'max-w-6xl'
  return (
    <>
      <PageHeader title={title} subtitle={subtitle} />
      <div className={`${maxWidth} mx-auto animate-fade-up stagger-1`}>{children}</div>
    </>
  )
}

function navClass(isActive: boolean) {
  return `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors w-full text-left ${
    isActive
      ? 'bg-[color-mix(in_srgb,var(--accent-primary)_15%,transparent)] text-[var(--accent-primary)] border border-[color-mix(in_srgb,var(--accent-primary)_30%,transparent)]'
      : 'text-theme-muted hover:text-theme hover:bg-white/5'
  }`
}

function isNavActive(pathname: string, to: string, exact?: boolean) {
  if (exact || to === '/') return pathname === to
  return pathname === to || pathname.startsWith(`${to}/`)
}

export function DashboardShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth()
  const { preferences, t, cycleTheme, resolvedTheme } = usePreferences()
  const location = useLocation()
  const navigate = useNavigate()
  const isAdmin = user?.role === 'admin'
  const isManager = user?.role === 'manager' || isAdmin

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  const nav = [
    { to: '/', label: t.nav.home, icon: '🏠', exact: true },
    { to: '/desk', label: t.nav.desk, icon: '💼', exact: true },
    { to: '/settings', label: t.nav.settings, icon: '🎨', exact: true },
    ...(isManager ? [
      { to: '/manager', label: t.nav.manager, icon: '📊', exact: true },
      { to: '/manager/tasks', label: t.nav.managerTasks, icon: '📋', exact: true },
    ] : []),
    ...(isAdmin ? [{ to: '/admin', label: t.nav.admin, icon: '⚙️', exact: true }] : []),
  ]

  const wide =
    location.pathname === '/admin' ||
    location.pathname.startsWith('/manager')

  const maxWidth = wide ? 'max-w-[1600px]' : 'max-w-6xl'

  return (
    <div className="auth-bg min-h-screen flex">
      <aside className="hidden md:flex w-64 flex-col border-r border-theme bg-theme-card/30 backdrop-blur-xl shrink-0 z-10">
        <div className="p-6 border-b border-theme">
          <p className="text-lg font-bold gradient-text">{t.appName}</p>
          <p className="text-xs text-theme-muted mt-1">{t.appTagline}</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {nav.map((item) => {
            const active = isNavActive(location.pathname, item.to, item.exact)
            return (
              <button
                key={item.to}
                type="button"
                onClick={() => navigate(item.to)}
                className={navClass(active)}
              >
                <span>{item.icon}</span>
                {item.label}
              </button>
            )
          })}
        </nav>
        <div className="p-4 border-t border-theme">
          <div className="flex items-center gap-3 mb-4">
            {preferences.avatar_url ? (
              <img src={preferences.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-sm font-bold text-white">
                {user?.full_name?.charAt(0) ?? '?'}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-medium text-theme truncate">{user?.full_name}</p>
              <p className="text-xs text-theme-muted truncate">{user?.email}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={cycleTheme}
            className="w-full mb-2 py-2 text-xs rounded-lg border border-theme text-theme-muted hover:text-theme transition-colors"
            title={t.theme.toggle}
          >
            {resolvedTheme === 'dark' ? '🌙' : '☀️'} {t.theme[preferences.theme === 'auto' ? 'auto' : preferences.theme]}
          </button>
          <button type="button" onClick={logout} className="w-full text-sm text-theme-muted hover:text-red-400 transition-colors">
            {t.nav.logout}
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        <header className="md:hidden flex items-center justify-between p-4 border-b border-theme">
          <p className="font-bold gradient-text">{t.appName}</p>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <button type="button" onClick={cycleTheme} className="text-lg">{resolvedTheme === 'dark' ? '🌙' : '☀️'}</button>
            <button type="button" onClick={logout} className="text-sm text-theme-muted">{t.nav.logout}</button>
          </div>
        </header>
        <nav className="md:hidden flex gap-1 p-2 border-b border-theme overflow-x-auto">
          {nav.map((item) => {
            const active = isNavActive(location.pathname, item.to, item.exact)
            return (
              <button
                key={item.to}
                type="button"
                onClick={() => navigate(item.to)}
                className={`shrink-0 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap ${
                  active ? 'bg-violet-500/20 text-violet-300' : 'text-theme-muted'
                }`}
              >
                {item.icon} {item.label}
              </button>
            )
          })}
        </nav>
        <main className="flex-1 p-6 lg:p-10 overflow-y-auto">
          <div className={`${maxWidth} mx-auto`} key={location.pathname}>
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
