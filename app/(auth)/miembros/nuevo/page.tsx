'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/lib/hooks/useUser'
import Header from '@/components/layout/Header'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import type { Plan } from '@/types/database'

interface RegisterSession {
  id: string
  opened_at: string
}

export default function NuevoMiembroPage() {
  const router = useRouter()
  const { role } = useUser()

  const [plans, setPlans] = useState<Plan[]>([])
  const [session, setSession] = useState<RegisterSession | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    nombre: '',
    apellido: '',
    email: '',
    telefono: '',
    fecha_nacimiento: '',
    plan_id: '',
    fecha_inicio: new Date().toISOString().split('T')[0],
  })

  useEffect(() => {
    Promise.all([
      fetch('/api/plans').then(r => r.json()),
      fetch('/api/register-sessions?current=true').then(r => r.json())
    ]).then(([plansJson, sessionJson]) => {
      if (plansJson.data) setPlans(plansJson.data.filter((p: Plan) => p.activo))
      if (sessionJson.data) setSession(sessionJson.data)
    })
  }, [])

  const selectedPlan = plans.find((p) => p.id === form.plan_id)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!form.nombre.trim() || !form.apellido.trim()) {
      setError('Nombre y apellido son obligatorios')
      return
    }
    if (!form.email.trim()) {
      setError('El correo electrónico es obligatorio')
      return
    }
    if (!form.plan_id) {
      setError('Debes seleccionar un plan de membresía')
      return
    }
    if (!form.fecha_inicio) {
      setError('La fecha de inicio es obligatoria')
      return
    }



    setLoading(true)

    const payload = {
      ...form,
      fecha_nacimiento: form.fecha_nacimiento || null,
      telefono: form.telefono || null,
      register_session_id: session?.id || null
    }

    const res = await fetch('/api/members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const json = await res.json()
    if (json.error) {
      setError(json.error)
      setLoading(false)
      return
    }

    router.push('/miembros')
  }

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }



  const vencimientoEstimado = selectedPlan && form.fecha_inicio
    ? new Date(new Date(form.fecha_inicio).getTime() + selectedPlan.dias_duracion * 86400000)
        .toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })
    : null

  if (role && !['admin', 'asistente'].includes(role)) {
    router.push('/dashboard')
    return null
  }

  return (
    <>
      <Header title="Nuevo Miembro" subtitle="Registrar un nuevo miembro del gimnasio" />

      <div className="px-4 lg:px-8 py-6 max-w-2xl animate-fade-in">
        <div className="card p-6">
          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-start gap-2 animate-slide-down">
              <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              {error}
            </div>
          )}



          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Datos personales */}
            <fieldset>
              <legend className="text-xs font-semibold text-white/30 uppercase tracking-wider mb-3 flex items-center gap-2">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
                Datos personales
              </legend>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Nombre *"
                    value={form.nombre}
                    onChange={(e) => updateField('nombre', e.target.value)}
                    placeholder="Juan"
                    required
                  />
                  <Input
                    label="Apellido *"
                    value={form.apellido}
                    onChange={(e) => updateField('apellido', e.target.value)}
                    placeholder="Pérez"
                    required
                  />
                </div>

                <Input
                  label="Correo electrónico *"
                  type="email"
                  value={form.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  placeholder="juan@email.com"
                  required
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Teléfono"
                    type="tel"
                    value={form.telefono}
                    onChange={(e) => updateField('telefono', e.target.value)}
                    placeholder="+57 300 123 4567"
                  />
                  <Input
                    label="Fecha de nacimiento"
                    type="date"
                    value={form.fecha_nacimiento}
                    onChange={(e) => updateField('fecha_nacimiento', e.target.value)}
                  />
                </div>
              </div>
            </fieldset>

            <div className="border-t border-white/5" />

            {/* Membresía */}
            <fieldset>
              <legend className="text-xs font-semibold text-white/30 uppercase tracking-wider mb-3 flex items-center gap-2">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                </svg>
                Membresía
              </legend>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="input-label">
                    Plan de Membresía <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={form.plan_id}
                    onChange={(e) => {
                      updateField('plan_id', e.target.value)
                    }}
                    className="input-field appearance-none cursor-pointer"
                    required
                  >
                    <option value="">— Selecciona un plan —</option>
                    {plans.map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.nombre} ({plan.dias_duracion} días)
                        {plan.precio > 0 ? ` — $${plan.precio.toLocaleString('es-CO')}` : ''}
                      </option>
                    ))}
                  </select>
                  {plans.length === 0 && (
                    <p className="text-xs text-amber-400/70 mt-1">
                      ⚠ No hay planes activos. Crea un plan antes de registrar miembros.
                    </p>
                  )}
                </div>

                <Input
                  label="Fecha de inicio *"
                  type="date"
                  value={form.fecha_inicio}
                  onChange={(e) => updateField('fecha_inicio', e.target.value)}
                  required
                />

                {/* Resumen de membresía */}
                {selectedPlan && vencimientoEstimado && (
                  <div className="p-4 rounded-xl bg-surface-200 border border-white/5 space-y-2">
                    <p className="text-xs font-semibold text-white/30 uppercase tracking-wider">Resumen</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-white/40">Plan</p>
                        <p className="text-sm text-white/80 font-medium">{selectedPlan.nombre}</p>
                      </div>
                      <div>
                        <p className="text-xs text-white/40">Duración</p>
                        <p className="text-sm text-white/80 font-medium">{selectedPlan.dias_duracion} días</p>
                      </div>
                      <div className="col-span-2 sm:col-span-1">
                        <p className="text-xs text-white/40">Vencimiento estimado</p>
                        <p className="text-sm text-emerald-400 font-medium">{vencimientoEstimado}</p>
                      </div>
                      {selectedPlan.precio > 0 && (
                        <div className="col-span-2 sm:col-span-1">
                          <p className="text-xs text-white/40">Total a Pagar</p>
                          <p className="text-lg text-white font-bold font-display">
                            ${selectedPlan.precio.toLocaleString('es-CO')}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </fieldset>



            <div className="flex gap-3 pt-2">
              <Button type="submit" loading={loading} className="flex-1">
                Registrar Miembro
              </Button>
              <Button type="button" variant="secondary" onClick={() => router.back()}>
                Cancelar
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
