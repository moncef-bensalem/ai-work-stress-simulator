import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

interface AuthLayoutProps {
  title: string
  subtitle: string
  children: ReactNode
  footer?: ReactNode
}

export default function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <div className="auth-bg min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden items-center justify-center p-12">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-violet-600/30 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-float stagger-2" />
        </div>
        <div className="relative max-w-md animate-fade-up">
          <p className="text-cyan-400 text-sm font-semibold uppercase tracking-[0.2em] mb-4">ESPRIT · Honoris</p>
          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            Simulez la pression algorithmique au travail
          </h1>
          <p className="text-slate-400 text-lg leading-relaxed">
            Plateforme immersive de sensibilisation à l&apos;aliénation numérique, sous supervision de l&apos;IA
            managériale <span className="text-violet-400 font-semibold">ARIA</span>.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-slate-500">
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Bureau virtuel & métriques temps réel
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
              Chat adaptatif & phases de stress
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              Dashboard analytics professionnel
            </li>
          </ul>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-screen">
        <header className="p-6 flex justify-between items-center lg:justify-end">
          <Link to="/" className="lg:hidden text-lg font-bold gradient-text">
            AI Stress Simulator
          </Link>
        </header>

        <main className="flex-1 flex items-center justify-center p-6 pb-12">
          <div className="w-full max-w-md animate-fade-up stagger-1">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white">{title}</h2>
              <p className="text-slate-400 mt-2 text-sm">{subtitle}</p>
            </div>
            <div className="glass-card p-8">{children}</div>
            {footer && <div className="mt-6 text-center text-sm text-slate-400">{footer}</div>}
          </div>
        </main>
      </div>
    </div>
  )
}
