'use client'

import { useUser } from '@/lib/hooks/useUser'

interface HeaderProps {
  title?: string
  subtitle?: string
  actions?: React.ReactNode
}

export default function Header({ title, subtitle, actions }: HeaderProps) {
  const { user, role, signOut } = useUser()

  return (
    <header className="sticky top-0 z-30 bg-surface-0/80 backdrop-blur-xl border-b border-white/5">
      <div className="flex items-center justify-between px-4 lg:px-8 py-4">
        <div className="flex-1 min-w-0">
          {title && (
            <h1 className="text-xl lg:text-2xl font-display font-bold text-white truncate">
              {title}
            </h1>
          )}
          {subtitle && (
            <p className="text-sm text-white/40 mt-0.5 truncate">{subtitle}</p>
          )}
        </div>

        <div className="flex items-center gap-3">
          {actions}

          {/* Mobile user menu */}
          <div className="lg:hidden flex items-center gap-2">
            <button
              onClick={signOut}
              className="btn-icon"
              aria-label="Cerrar sesión"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
