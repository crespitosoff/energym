'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@/lib/hooks/useUser'
import { useRouter } from 'next/navigation'
import Header from '@/components/layout/Header'
import { PageLoader } from '@/components/ui/Spinner'

interface SystemUser {
  id: string
  user_id: string
  role: string
  email: string
  last_sign_in: string | null
  created_at: string
}

const ROLE_STYLES: Record<string, { badge: string; label: string }> = {
  admin: { badge: 'text-brand-400 bg-brand-500/10 border-brand-500/20', label: 'Admin' },
  asistente: { badge: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', label: 'Asistente' },
  cliente: { badge: 'text-amber-400 bg-amber-500/10 border-amber-500/20', label: 'No autorizado' },
}

export default function UsuariosPage() {
  const { role } = useUser()
  const router = useRouter()
  const [users, setUsers] = useState<SystemUser[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (role && role !== 'admin') router.push('/dashboard')
  }, [role, router])

  useEffect(() => {
    fetch('/api/users')
      .then((r) => r.json())
      .then((json) => {
        if (json.data) setUsers(json.data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return <PageLoader />

  const staffUsers = users.filter((u) => u.role !== 'cliente')
  const unauthorizedUsers = users.filter((u) => u.role === 'cliente')

  return (
    <>
      <Header
        title="Usuarios del Sistema"
        subtitle={`${users.length} cuentas registradas`}
      />

      <div className="px-4 lg:px-8 py-6 space-y-6 animate-fade-in">
        {/* Info banner */}
        <div className="p-4 rounded-xl bg-brand-500/5 border border-brand-500/15 flex items-start gap-3">
          <svg className="w-5 h-5 text-brand-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
          </svg>
          <div>
            <p className="text-sm text-brand-400 font-medium">Panel de seguridad</p>
            <p className="text-xs text-white/40 mt-1">
              Cuentas con acceso al sistema de EnerGym. Gestiona roles desde el panel de Supabase.
            </p>
          </div>
        </div>

        {/* Staff  */}
        <section>
          <h2 className="text-xs font-semibold text-white/30 uppercase tracking-wider mb-3">
            Personal autorizado ({staffUsers.length})
          </h2>
          <div className="card !p-0 overflow-hidden">
            {staffUsers.length === 0 ? (
              <p className="p-6 text-center text-white/30 text-sm">No hay personal registrado</p>
            ) : (
              <div className="divide-y divide-white/5">
                {staffUsers.map((user) => (
                  <UserRow key={user.id} user={user} />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Unauthorized */}
        {unauthorizedUsers.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-amber-400/70 uppercase tracking-wider mb-3 flex items-center gap-2">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              Cuentas no autorizadas ({unauthorizedUsers.length})
            </h2>
            <div className="card !p-0 overflow-hidden border border-amber-500/10">
              <div className="divide-y divide-white/5">
                {unauthorizedUsers.map((user) => (
                  <UserRow key={user.id} user={user} showWarning />
                ))}
              </div>
            </div>
            <p className="text-xs text-white/25 mt-2">
              Estas cuentas se registraron pero no tienen acceso al panel. Puedes eliminarlas desde Supabase.
            </p>
          </section>
        )}
      </div>
    </>
  )
}

function UserRow({ user, showWarning }: { user: SystemUser; showWarning?: boolean }) {
  const style = ROLE_STYLES[user.role] || { badge: 'text-white/40 bg-white/5 border-white/10', label: user.role }

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })

  return (
    <div className="flex items-center gap-4 px-5 py-4">
      {/* Avatar */}
      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
        showWarning
          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
          : 'bg-surface-300 text-white/60'
      }`}>
        {user.email[0]?.toUpperCase() || '?'}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white/80 truncate">{user.email}</p>
        <p className="text-xs text-white/30 mt-0.5">
          Registrado {formatDate(user.created_at)}
          {user.last_sign_in && ` · Último acceso ${formatDate(user.last_sign_in)}`}
        </p>
      </div>

      {/* Role badge */}
      <span className={`text-xs font-medium px-2.5 py-1 rounded-lg border ${style.badge}`}>
        {style.label}
      </span>
    </div>
  )
}
