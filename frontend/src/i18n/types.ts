export type Language = 'fr' | 'en' | 'ar'
export type ThemeMode = 'dark' | 'light' | 'auto'
export type AccentColor = 'violet' | 'cyan' | 'emerald' | 'rose'
export type FontFamily = 'jakarta' | 'inter' | 'mono'

export interface UserPreferences {
  theme: ThemeMode
  language: Language
  accent_color: AccentColor
  font_family: FontFamily
  high_contrast: boolean
  notifications: boolean
  aria_volume: number
  avatar_url: string | null
}

export type TranslationKey = keyof typeof import('./locales/fr').fr
