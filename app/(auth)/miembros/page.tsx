'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/hooks/useUser'
import Header from '@/components/layout/Header'
import StatusBadge from '@/components/ui/StatusBadge'
import { PageLoader } from '@/components/ui/Spinner'
import { formatDate, getMembershipStatus } from '@/lib/utils/dates'
import Link from 'next/link'
import type { MemberWithStatus } from '@/types/database'

type FilterStatus = 'all' | 'activo' | 'por_vencer' | 'vencido' | 'inactivo'

export default function MiembrosPage() {
  const { role } = useUser()
  const [members, setMembers] = useState<MemberWithStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all')

  useEffect(() => {
    fetchMembers()
  }, [search, statusFilter])

  async function fetchMembers() {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (statusFilter !== 'all') params.set('status', statusFilter)

    const res = await fetch(`/api/members?${params.toString()}`)
    const json = await res.json()
    if (json.data) setMembers(json.data)
    setLoading(false)
  }

  const filters: { label: string; value: FilterStatus }[] = [
    { label: 'Todos', value: 'all' },
    { label: 'Activos', value: 'activo' },
    { label: 'Por vencer', value: 'por_vencer' },
    { label: 'Vencidos (0-3d)', value: 'vencido' },
    { label: 'Inactivos', value: 'inactivo' },
  ]

  return (
    <>
      <Header
        title="Miembros"
        subtitle={`${members.length} registrados`}
        actions={
          role && ['admin', 'asistente'].includes(role) ? (
            <Link href="/miembros/nuevo" className="btn-primary flex items-center gap-2 px-4 py-2 text-sm shadow-xl shadow-brand-500/20">
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              <span className="font-medium whitespace-nowrap">Nuevo Miembro</span>
            </Link>
          ) : null
        }
      />

      <div className="px-4 lg:px-8 py-6 space-y-4 animate-fade-in">
        {/* Search & Filters */}
        <div className="space-y-3">
          <div className="relative">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="search"
              placeholder="Buscar por nombre o email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-11"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            {filters.map((f) => (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className={`
                  px-4 py-2 rounded-xl text-xs font-medium whitespace-nowrap
                  transition-all duration-200 min-h-[36px]
                  ${statusFilter === f.value
                    ? 'bg-brand-600 text-white shadow-glow'
                    : 'bg-surface-200 text-white/50 hover:text-white/70 hover:bg-surface-300'
                  }
                `}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Members List */}
        {loading ? (
          <PageLoader />
        ) : members.length === 0 ? (
          <div className="card text-center py-12">
            <svg className="w-16 h-16 mx-auto text-white/10 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={0.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
            {/* Differentiate: filter active vs genuinely no members */}
            {statusFilter !== 'all' || search ? (
              <>
                <p className="text-white/40 mb-1">Sin resultados para este filtro</p>
                <p className="text-white/25 text-xs mb-4">
                  {statusFilter !== 'all' && `No hay miembros con estado "${statusFilter.replace('_', ' ')}"`}
                  {search && ` que coincidan con "${search}"`}
                </p>
                <button
                  onClick={() => { setStatusFilter('all'); setSearch('') }}
                  className="text-brand-400 hover:text-brand-300 text-sm font-medium transition-colors"
                >
                  Limpiar filtros
                </button>
              </>
            ) : (
              <>
                <p className="text-white/40 mb-4">No hay miembros registrados aún</p>
                {role && ['admin', 'asistente'].includes(role) && (
                  <Link href="/miembros/nuevo" className="btn-primary">
                    Agregar primer miembro
                  </Link>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {members.map((member) => (
              <Link
                key={member.id}
                href={`/miembros/${member.id}`}
                className="card-interactive flex items-center gap-4 !p-4"
              >
                {/* Avatar */}
                <div className={`
                  w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold shrink-0
                  ${member.estado === 'activo' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                    member.estado === 'por_vencer' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                      'bg-red-500/10 text-red-400 border border-red-500/20'
                  }
                `}>
                  {member.nombre[0]}{member.apellido[0]}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white/90 truncate">
                    {member.nombre} {member.apellido}
                  </p>
                  <p className="text-xs text-white/40 truncate">
                    {member.plan_nombre || 'Sin plan'} · {formatDate(member.fecha_vencimiento)}
                  </p>
                </div>

                {/* Status */}
                <StatusBadge status={member.estado} size="sm" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
