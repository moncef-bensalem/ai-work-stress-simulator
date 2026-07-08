import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger'
  children: ReactNode
  loading?: boolean
}

export default function Button({
  variant = 'primary',
  className = '',
  children,
  loading,
  disabled,
  ...props
}: ButtonProps) {
  const base =
    variant === 'primary'
      ? 'btn-primary'
      : variant === 'danger'
        ? 'bg-red-600/90 hover:bg-red-500 text-white font-semibold rounded-xl px-4 py-2.5 transition-colors'
        : 'btn-ghost'

  return (
    <button
      className={`${base} px-4 py-3 text-sm inline-flex items-center justify-center gap-2 ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      )}
      {children}
    </button>
  )
}
