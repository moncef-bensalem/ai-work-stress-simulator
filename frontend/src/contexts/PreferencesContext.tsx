import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { api } from '../lib/api'
import { useAuth } from './AuthContext'
import { ar } from '../i18n/locales/ar'
import { en } from '../i18n/locales/en'
import { fr } from '../i18n/locales/fr'
import type { AccentColor, FontFamily, Language, ThemeMode, UserPreferences } from '../i18n/types'

const STORAGE_KEY = 'user_preferences'

const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'auto',
  language: 'fr',
  accent_color: 'violet',
  font_family: 'jakarta',
  high_contrast: false,
  notifications: true,
  aria_volume: 80,
  avatar_url: null,
}

const locales = { fr, en, ar } as const

type Translations = (typeof locales)[Language]

function loadLocal(): UserPreferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_PREFERENCES
    return { ...DEFAULT_PREFERENCES, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_PREFERENCES
  }
}

function resolveTheme(mode: ThemeMode): 'dark' | 'light' {
  if (mode === 'auto') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return mode
}

interface PreferencesContextType {
  preferences: UserPreferences
  t: Translations
  resolvedTheme: 'dark' | 'light'
  updatePreferences: (patch: Partial<UserPreferences>) => Promise<void>
  cycleTheme: () => void
}

const PreferencesContext = createContext<PreferencesContextType | null>(null)

function applyToDocument(prefs: UserPreferences, resolved: 'dark' | 'light') {
  const root = document.documentElement
  root.setAttribute('data-theme', resolved)
  root.setAttribute('data-accent', prefs.accent_color)
  root.setAttribute('data-font', prefs.font_family)
  root.setAttribute('data-contrast', prefs.high_contrast ? 'high' : 'normal')
  root.lang = prefs.language
  root.dir = prefs.language === 'ar' ? 'rtl' : 'ltr'
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [preferences, setPreferences] = useState<UserPreferences>(loadLocal)
  const [resolvedTheme, setResolvedTheme] = useState<'dark' | 'light'>(() => resolveTheme(loadLocal().theme))

  const t: Translations = locales[preferences.language]

  useEffect(() => {
    document.documentElement.classList.add('theme-transition')
    const resolved = resolveTheme(preferences.theme)
    setResolvedTheme(resolved)
    applyToDocument(preferences, resolved)
  }, [preferences])

  useEffect(() => {
    if (preferences.theme !== 'auto') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => {
      const resolved = resolveTheme('auto')
      setResolvedTheme(resolved)
      applyToDocument(preferences, resolved)
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [preferences])

  useEffect(() => {
    if (!user) return
    api.getPreferences().then((remote) => {
      setPreferences(remote)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(remote))
    }).catch(() => {})
  }, [user?.id])

  const updatePreferences = useCallback(async (patch: Partial<UserPreferences>) => {
    const next = { ...preferences, ...patch }
    setPreferences(next)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    if (user) {
      try {
        const saved = await api.updatePreferences(patch)
        setPreferences(saved)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(saved))
      } catch {
        toast.error('Impossible de synchroniser les préférences')
      }
    }
  }, [preferences, user])

  const cycleTheme = useCallback(() => {
    const order: ThemeMode[] = ['dark', 'light', 'auto']
    const idx = order.indexOf(preferences.theme)
    const next = order[(idx + 1) % order.length]
    updatePreferences({ theme: next })
  }, [preferences.theme, updatePreferences])

  const value = useMemo(
    () => ({ preferences, t, resolvedTheme, updatePreferences, cycleTheme }),
    [preferences, t, resolvedTheme, updatePreferences, cycleTheme],
  )

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>
}

export function usePreferences() {
  const ctx = useContext(PreferencesContext)
  if (!ctx) throw new Error('usePreferences must be used within PreferencesProvider')
  return ctx
}

export type { AccentColor, FontFamily, Language, ThemeMode, UserPreferences }
