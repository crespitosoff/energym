'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@/lib/hooks/useUser'
import Header from '@/components/layout/Header'
import StatusBadge from '@/components/ui/StatusBadge'
import { PageLoader } from '@/components/ui/Spinner'
import { formatDate, getDaysRemaining } from '@/lib/utils/dates'
import Link from 'next/link'
import type { MemberStats } from '@/types/api'
import type { MemberWithStatus } from '@/types/database'

export default function DashboardPage() {
  const { role } = useUser()
  const [stats, setStats] = useState<MemberStats | null>(null)
  const [expiring, setExpiring] = useState<MemberWithStatus[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const fetches = [
          fetch('/api/members/stats'),
          fetch('/api/members?status=por_vencer&limit=5'),
        ]
        const [statsRes, expiringRes] = await Promise.all(fetches)
        const [statsJson, expiringJson] = await Promise.all([
          statsRes.json(), expiringRes.json(),
        ])
        if (statsJson.data) setStats(statsJson.data)
        if (expiringJson.data) setExpiring(expiringJson.data)
      } catch {
        console.error('Error loading dashboard')
      }
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <PageLoader />

  const formatMoney = (n: number) => `$${n.toLocaleString('es-CO', { minimumFractionDigits: 0 })}`

  const statCards = [
    { label: 'Total Miembros', value: stats?.total || 0, color: 'text-brand-400', bg: 'bg-brand-500/10', border: 'border-brand-500/20',
      icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg> },
    { label: 'Activos', value: stats?.activos || 0, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20',
      icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
    { label: 'Por Vencer', value: stats?.por_vencer || 0, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20',
      icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg> },
    { label: 'Vencidos', value: stats?.vencidos || 0, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20',
      icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg> },
  ]

  return (
    <>
      <Header
        title="Dashboard"
        subtitle="Vista general del gimnasio"
        actions={
          role && ['admin', 'asistente'].includes(role) ? (
            <Link href="/miembros/nuevo" className="btn-primary flex items-center gap-2 px-4 py-2 text-sm">
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              <span>Añadir</span>
            </Link>
          ) : null
        }
      />

      <div className="px-4 lg:px-8 py-6 space-y-6 animate-fade-in">

        {/* Member Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          {statCards.map((stat) => (
            <div key={stat.label} className={`card border ${stat.border} hover:shadow-glass transition-all duration-300`}>
              <div className={`${stat.bg} w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${stat.color}`}>
                {stat.icon}
              </div>
              <p className="text-2xl lg:text-3xl font-display font-bold text-white">{stat.value}</p>
              <p className="text-xs text-white/40 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Expiring Soon */}
        {expiring.length > 0 && (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-white/70 flex items-center gap-2">
                <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
                Próximos a vencer
              </h2>
              <Link href="/miembros?status=por_vencer" className="text-xs text-brand-400 hover:text-brand-300 font-medium">
                Ver todos →
              </Link>
            </div>
            <div className="space-y-2">
              {expiring.map((member) => {
                const days = getDaysRemaining(member.fecha_vencimiento)
                return (
                  <Link
                    key={member.id}
                    href={`/miembros/${member.id}`}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors -mx-1 group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 text-sm font-semibold shrink-0">
                        {member.nombre[0]}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white/90 truncate group-hover:text-white">
                          {member.nombre} {member.apellido}
                        </p>
                        <p className="text-xs text-white/40">
                          {member.plan_nombre || 'Sin plan'} · Vence {formatDate(member.fecha_vencimiento)}
                        </p>
                      </div>
                    </div>
                    <span className="badge-por-vencer text-[10px] shrink-0 ml-2">
                      <span className="dot-indicator w-1.5 h-1.5 bg-amber-400" />
                      {days}d
                    </span>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        {role && ['admin', 'asistente'].includes(role) && (
          <div>
            <h2 className="text-xs font-semibold text-white/30 uppercase tracking-wider mb-3">Acciones rápidas</h2>
            <div className="grid grid-cols-2 gap-3">
              <Link href="/miembros" className="card-interactive flex flex-col items-center gap-3 text-center !py-5">
                <div className="w-11 h-11 rounded-xl bg-brand-500/10 flex items-center justify-center text-brand-400">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                  </svg>
                </div>
                <p className="text-xs font-medium text-white/70">Miembros</p>
              </Link>

              {role === 'admin' && (
                <Link href="/planes" className="card-interactive flex flex-col items-center gap-3 text-center !py-5">
                  <div className="w-11 h-11 rounded-xl bg-energy-violet/10 flex items-center justify-center text-energy-violet">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                    </svg>
                  </div>
                  <p className="text-xs font-medium text-white/70">Planes</p>
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
