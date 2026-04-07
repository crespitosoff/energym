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

  const [pagos, setPagos] = useState([{ metodo: 'efectivo', monto: '' }])

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

    if (selectedPlan && selectedPlan.precio > 0 && !session) {
      setError('Debes abrir la caja antes de registrar un cobro.')
      return
    }

    if (selectedPlan && selectedPlan.precio > 0) {
      const sumPagos = pagos.reduce((s, p) => s + (parseFloat(p.monto) || 0), 0)
      if (Math.abs(sumPagos - selectedPlan.precio) > 0.01) {
        setError(`Los pagos ingresados no suman el valor del plan ($${selectedPlan.precio.toLocaleString('es-CO')})`)
        return
      }
    }

    setLoading(true)

    const payload = {
      ...form,
      fecha_nacimiento: form.fecha_nacimiento || null,
      telefono: form.telefono || null,
      pagos: selectedPlan && selectedPlan.precio > 0 ? pagos.map((p) => ({ metodo: p.metodo, monto: parseFloat(p.monto) || 0 })) : [{ metodo: 'efectivo', monto: 0 }],
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

  const addPago = () => setPagos([...pagos, { metodo: 'efectivo', monto: '' }])
  const removePago = (i: number) => setPagos(pagos.filter((_, idx) => idx !== i))
  const updatePago = (i: number, field: string, val: string) => {
    const updated = [...pagos]
    updated[i] = { ...updated[i], [field]: val }
    setPagos(updated)
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

          {!session && (
            <div className="mb-5 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex flex-col items-center justify-center text-center gap-2 animate-slide-down">
              <svg className="w-6 h-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              <p className="text-amber-400 text-sm font-medium">La caja está cerrada</p>
              <p className="text-amber-400/80 text-xs max-w-[250px]">No podrás registrar una nueva membresía con cobro sin antes abrir la caja.</p>
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
                      const plan = plans.find(p => p.id === e.target.value)
                      if (plan && pagos.length === 1) {
                         updatePago(0, 'monto', plan.precio.toString())
                      }
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

            {selectedPlan && selectedPlan.precio > 0 && session && (
              <>
                <div className="border-t border-white/5" />
                <fieldset>
                  <legend className="text-xs font-semibold text-white/30 uppercase tracking-wider mb-3 flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
                      </svg>
                      Métodos de Pago
                    </div>
                    <button type="button" onClick={addPago} className="text-brand-400 hover:text-brand-300 font-medium normal-case text-xs">
                      + Agregar método
                    </button>
                  </legend>
                  <div className="space-y-2">
                    {pagos.map((pago, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <select
                          value={pago.metodo}
                          onChange={(e) => updatePago(i, 'metodo', e.target.value)}
                          className="input-field appearance-none cursor-pointer flex-1"
                        >
                          <option value="efectivo">💵 Efectivo</option>
                          <option value="tarjeta">💳 Tarjeta</option>
                          <option value="transferencia">📱 Transferencia</option>
                        </select>
                        <input
                          type="number"
                          value={pago.monto}
                          onChange={(e) => updatePago(i, 'monto', e.target.value)}
                          placeholder="$0"
                          className="input-field w-32"
                          min="0"
                          step="100"
                        />
                        {pagos.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removePago(i)}
                            className="w-10 h-10 rounded-lg hover:bg-red-500/10 flex items-center justify-center text-white/30 hover:text-red-400 transition-colors shrink-0"
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </fieldset>
              </>
            )}

            <div className="flex gap-3 pt-2">
              <Button type="submit" loading={loading} className="flex-1" disabled={!!(selectedPlan && selectedPlan.precio > 0 && !session)}>
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
