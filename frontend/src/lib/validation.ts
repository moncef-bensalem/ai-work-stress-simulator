const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function validateEmail(email: string): { valid: boolean; messageKey: 'empty' | 'invalid' | null } {
  const trimmed = email.trim()
  if (!trimmed) return { valid: false, messageKey: 'empty' }
  if (!EMAIL_REGEX.test(trimmed)) return { valid: false, messageKey: 'invalid' }
  return { valid: true, messageKey: null }
}

export interface PasswordStrength {
  score: number
  labelKey: 'weak' | 'fair' | 'good' | 'strong'
  checks: {
    length: boolean
    uppercase: boolean
    lowercase: boolean
    number: boolean
    special: boolean
  }
}

export function computePasswordStrength(password: string): PasswordStrength {
  const checks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  }

  let score = 0
  if (password.length >= 8) score += 25
  if (password.length >= 12) score += 10
  if (checks.uppercase) score += 15
  if (checks.lowercase) score += 15
  if (checks.number) score += 20
  if (checks.special) score += 15

  score = Math.min(100, score)

  let labelKey: PasswordStrength['labelKey'] = 'weak'
  if (score >= 80) labelKey = 'strong'
  else if (score >= 60) labelKey = 'good'
  else if (score >= 40) labelKey = 'fair'

  return { score, labelKey, checks }
}

export function isStrongPassword(password: string, minScore = 70): boolean {
  return computePasswordStrength(password).score >= minScore
}

export function strengthColor(score: number): string {
  if (score >= 80) return 'bg-emerald-500'
  if (score >= 60) return 'bg-lime-500'
  if (score >= 40) return 'bg-amber-500'
  return 'bg-red-500'
}

export function strengthTextColor(score: number): string {
  if (score >= 80) return 'text-emerald-400'
  if (score >= 60) return 'text-lime-400'
  if (score >= 40) return 'text-amber-400'
  return 'text-red-400'
}
