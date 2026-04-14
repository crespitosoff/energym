'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useUser } from '@/lib/hooks/useUser'

const navItems = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
      </svg>
    ),
    roles: ['admin', 'asistente'],
  },
  {
    label: 'Miembros',
    href: '/miembros',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
      </svg>
    ),
    roles: ['admin', 'asistente'],
  },
  {
    label: 'Planes',
    href: '/planes',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
      </svg>
    ),
    roles: ['admin'],
  },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { role, signOut, user } = useUser()

  const filteredItems = navItems.filter(
    (item) => role && item.roles.includes(role)
  )

  return (
    <aside className="hidden lg:flex flex-col w-64 h-screen bg-surface-50 border-r border-white/5 fixed left-0 top-0 z-40">
      {/* Logo */}
      <div className="p-6 border-b border-white/5">
        <Link href="/dashboard" className="flex items-center gap-3">
          <Image
            src="/logo.png"
            alt="Logo"
            width={100}
            height={100}
            className="rounded-xl"
            priority
          />
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
        {filteredItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium
                transition-all duration-200 min-h-[44px]
                ${isActive
                  ? 'bg-brand-600/15 text-brand-400 shadow-glow'
                  : 'text-white/50 hover:text-white/80 hover:bg-white/5'
                }
              `}
            >
              <span className={isActive ? 'text-brand-400' : 'text-white/40'}>{item.icon}</span>
              {item.label}
              {isActive && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-400" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* User info */}
      <div className="p-4 border-t border-white/5">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-9 h-9 rounded-full bg-surface-300 flex items-center justify-center text-sm font-semibold text-white/60">
            {user?.email?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white/80 truncate">
              {user?.email || 'Usuario'}
            </p>
            <p className="text-xs text-white/40 capitalize">{role || 'cargando...'}</p>
          </div>
          <button
            onClick={signOut}
            className="btn-icon !w-8 !h-8 !min-w-[32px] !min-h-[32px] text-white/30 hover:text-red-400"
            title="Cerrar sesión"
            aria-label="Cerrar sesión"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  )
}
