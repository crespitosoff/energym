'use client'

import { useEffect, useState, Suspense, useCallback } from 'react'
import { useUser } from '@/lib/hooks/useUser'
import Header from '@/components/layout/Header'
import { PageLoader } from '@/components/ui/Spinner'
import { formatDate, getDaysRemaining } from '@/lib/utils/dates'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import type { MemberWithStatus, Plan } from '@/types/database'

type FilterStatus = 'all' | 'activo' | 'por_vencer' | 'vencido' | 'inactivo'
type SortOption = 'recent' | 'name_asc' | 'expiry_asc' | 'expiry_desc'

function MiembrosList() {
  const { role } = useUser()
  const searchParams = useSearchParams()
  const router = useRouter()

  const [members, setMembers] = useState<MemberWithStatus[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [totalCount, setTotalCount] = useState(0)
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [statusFilter, setStatusFilter] = useState<FilterStatus>(
    (searchParams.get('status') as FilterStatus) || 'all'
  )
  const [planFilter, setPlanFilter] = useState(searchParams.get('plan') || 'all')
  const [sortOption, setSortOption] = useState<SortOption>(
    (searchParams.get('sort') as SortOption) || 'recent'
  )

  // Load plans once
  useEffect(() => {
    fetch('/api/plans')
      .then(r => r.json())
      .then(json => {
        if (json.data) setPlans(json.data.filter((p: Plan) => p.activo))
      })
  }, [])

  // Sync URL params
  const syncUrl = useCallback((status: FilterStatus, plan: string, sort: SortOption, q: string) => {
    const params = new URLSearchParams()
    if (status !== 'all') params.set('status', status)
    if (plan !== 'all') params.set('plan', plan)
    if (sort !== 'recent') params.set('sort', sort)
    if (q) params.set('search', q)
    const qs = params.toString()
    router.replace(`/miembros${qs ? `?${qs}` : ''}`, { scroll: false })
  }, [router])

  // Sort option → API params mapping
  const getSortParams = (opt: SortOption) => {
    switch (opt) {
      case 'name_asc': return { sortBy: 'nombre', order: 'asc' }
      case 'expiry_asc': return { sortBy: 'fecha_vencimiento', order: 'asc' }
      case 'expiry_desc': return { sortBy: 'fecha_vencimiento', order: 'desc' }
      default: return { sortBy: 'created_at', order: 'desc' }
    }
  }

  // Fetch members
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchMembers()
    }, search ? 300 : 0) // debounce search
    return () => clearTimeout(timer)
  }, [search, statusFilter, planFilter, sortOption])

  async function fetchMembers() {
    setLoading(true)
    const { sortBy, order } = getSortParams(sortOption)
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (statusFilter !== 'all') params.set('status', statusFilter)
    if (planFilter !== 'all') params.set('planId', planFilter)
    params.set('sortBy', sortBy)
    params.set('order', order)

    const res = await fetch(`/api/members?${params.toString()}`)
    const json = await res.json()
    if (json.data) setMembers(json.data)
    setTotalCount(json.count || 0)
    setLoading(false)
  }

  // Handlers that also sync URL
  const handleStatusChange = (val: FilterStatus) => {
    setStatusFilter(val)
    syncUrl(val, planFilter, sortOption, search)
  }
  const handlePlanChange = (val: string) => {
    setPlanFilter(val)
    syncUrl(statusFilter, val, sortOption, search)
  }
  const handleSortChange = (val: SortOption) => {
    setSortOption(val)
    syncUrl(statusFilter, planFilter, val, search)
  }
  const handleSearchChange = (val: string) => {
    setSearch(val)
    syncUrl(statusFilter, planFilter, sortOption, val)
  }
  const clearFilters = () => {
    setStatusFilter('all')
    setPlanFilter('all')
    setSortOption('recent')
    setSearch('')
    router.replace('/miembros', { scroll: false })
  }

  const hasActiveFilters = statusFilter !== 'all' || planFilter !== 'all' || sortOption !== 'recent' || search !== ''

  // Days badge renderer
  const renderDaysBadge = (member: MemberWithStatus) => {
    if (member.estado === 'inactivo') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-surface-300 text-white/50 border border-white/5 font-medium shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-white/30" />
          Sin plan
        </span>
      )
    }
    const days = getDaysRemaining(member.fecha_vencimiento)
    const isExpired = days < 0
    const colorClass =
      member.estado === 'activo' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
      member.estado === 'por_vencer' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
      'bg-red-500/10 text-red-400 border-red-500/20'

    return (
      <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-medium shrink-0 ${colorClass}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${
          member.estado === 'activo' ? 'bg-emerald-400' :
          member.estado === 'por_vencer' ? 'bg-amber-400' :
          'bg-red-400'
        }`} />
        {isExpired ? `${Math.abs(days)}d vencido` : `${days}d`}
      </span>
    )
  }

  return (
    <>
      <Header
        title="Miembros"
        subtitle={`${totalCount} registrados`}
        actions={
          role && ['admin', 'asistente'].includes(role) ? (
            <Link href="/miembros/nuevo" className="btn-primary flex items-center gap-2 px-4 py-2 text-sm shadow-xl shadow-brand-500/20">
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              <span className="font-medium whitespace-nowrap">Nuevo</span>
            </Link>
          ) : null
        }
      />

      <div className="px-4 lg:px-8 py-6 space-y-4 animate-fade-in">
        {/* Search */}
        <div className="relative">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="search"
            placeholder="Buscar por nombre, teléfono..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="input-field pl-11"
          />
        </div>

        {/* Filter Toolbar */}
        <div className="grid grid-cols-3 gap-2">
          {/* Status dropdown */}
          <select
            value={statusFilter}
            onChange={(e) => handleStatusChange(e.target.value as FilterStatus)}
            className="input-field appearance-none cursor-pointer text-xs !py-2 !px-3"
          >
            <option value="all">Estado: Todos</option>
            <option value="activo">✅ Activos</option>
            <option value="por_vencer">⚠️ Por Vencer</option>
            <option value="vencido">🔴 Vencidos</option>
            <option value="inactivo">⚪ Inactivos</option>
          </select>

          {/* Plan dropdown */}
          <select
            value={planFilter}
            onChange={(e) => handlePlanChange(e.target.value)}
            className="input-field appearance-none cursor-pointer text-xs !py-2 !px-3"
          >
            <option value="all">Plan: Todos</option>
            {plans.map(p => (
              <option key={p.id} value={p.id}>{p.nombre}</option>
            ))}
          </select>

          {/* Sort dropdown */}
          <select
            value={sortOption}
            onChange={(e) => handleSortChange(e.target.value as SortOption)}
            className="input-field appearance-none cursor-pointer text-xs !py-2 !px-3"
          >
            <option value="recent">Últimos agregados</option>
            <option value="name_asc">Nombre A-Z</option>
            <option value="expiry_asc">Vence pronto</option>
            <option value="expiry_desc">Vence lejos</option>
          </select>
        </div>

        {/* Active filters indicator */}
        {hasActiveFilters && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-white/30">
              {totalCount} resultado{totalCount !== 1 ? 's' : ''} con filtros activos
            </p>
            <button
              onClick={clearFilters}
              className="text-xs text-brand-400 hover:text-brand-300 font-medium transition-colors"
            >
              Limpiar filtros
            </button>
          </div>
        )}

        {/* Members List */}
        {loading ? (
          <PageLoader />
        ) : members.length === 0 ? (
          <div className="card text-center py-12">
            <svg className="w-16 h-16 mx-auto text-white/10 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={0.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
            {hasActiveFilters ? (
              <>
                <p className="text-white/40 mb-1">Sin resultados para este filtro</p>
                <p className="text-white/25 text-xs mb-4">
                  Intenta cambiar los criterios de búsqueda
                </p>
                <button
                  onClick={clearFilters}
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
                className="card-interactive flex items-center gap-3 !p-3.5"
              >
                {/* Avatar */}
                <div className={`
                  w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold shrink-0
                  ${member.estado === 'activo' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                    member.estado === 'por_vencer' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                    member.estado === 'vencido' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                      'bg-surface-200 text-white/40 border border-white/5'
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
                    {member.plan_nombre || 'Sin plan'} · Vence {formatDate(member.fecha_vencimiento)}
                  </p>
                </div>

                {/* Days Badge */}
                {renderDaysBadge(member)}
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

export default function MiembrosPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <MiembrosList />
    </Suspense>
  )
}
