'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@/lib/hooks/useUser'
import { useRouter } from 'next/navigation'
import Header from '@/components/layout/Header'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import { PageLoader } from '@/components/ui/Spinner'
import type { Plan } from '@/types/database'

type PlanForm = { nombre: string; dias_duracion: string; precio: string }
const EMPTY_FORM: PlanForm = { nombre: '', dias_duracion: '', precio: '' }

export default function PlanesPage() {
  const { role } = useUser()
  const router = useRouter()

  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null)
  const [saving, setSaving] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [form, setForm] = useState<PlanForm>(EMPTY_FORM)

  useEffect(() => {
    if (role && role !== 'admin') router.push('/dashboard')
  }, [role, router])

  useEffect(() => { fetchPlans() }, [])

  async function fetchPlans() {
    const res = await fetch('/api/plans')
    const json = await res.json()
    if (json.data) setPlans(json.data)
    setLoading(false)
  }

  function openCreate() {
    setEditingPlan(null)
    setForm(EMPTY_FORM)
    setError('')
    setShowModal(true)
  }

  function openEdit(plan: Plan) {
    setEditingPlan(plan)
    setForm({
      nombre: plan.nombre,
      dias_duracion: String(plan.dias_duracion),
      precio: String(plan.precio ?? 0),
    })
    setError('')
    setShowModal(true)
  }

  async function handleSave() {
    setError('')
    setSaving(true)

    const method = editingPlan ? 'PUT' : 'POST'
    const url = editingPlan ? `/api/plans/${editingPlan.id}` : '/api/plans'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: form.nombre,
        dias_duracion: parseInt(form.dias_duracion),
        precio: parseFloat(form.precio) || 0,
      }),
    })

    const json = await res.json()
    if (json.error) { setError(json.error); setSaving(false); return }

    setShowModal(false)
    setSaving(false)
    fetchPlans()
  }

  async function handleToggle(plan: Plan) {
    setTogglingId(plan.id)
    await fetch(`/api/plans/${plan.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activo: !plan.activo }),
    })
    setTogglingId(null)
    fetchPlans()
  }

  if (loading) return <PageLoader />

  const activePlans = plans.filter((p) => p.activo)
  const inactivePlans = plans.filter((p) => !p.activo)

  return (
    <>
      <Header
        title="Planes"
        subtitle={`${activePlans.length} activos`}
        actions={
          <Button onClick={openCreate}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            <span className="hidden sm:inline">Nuevo Plan</span>
          </Button>
        }
      />

      <div className="px-4 lg:px-8 py-6 space-y-6 animate-fade-in">
        {plans.length === 0 ? (
          <div className="card text-center py-12">
            <svg className="w-16 h-16 mx-auto text-white/10 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={0.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.251 2.251 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
            </svg>
            <p className="text-white/40 mb-4">No hay planes configurados</p>
            <Button onClick={openCreate}>Crear primer plan</Button>
          </div>
        ) : (
          <>
            {/* Active Plans */}
            <section>
              <h2 className="text-xs font-semibold text-white/30 uppercase tracking-wider mb-3">
                Planes activos ({activePlans.length})
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {activePlans.map((plan) => (
                  <PlanCard
                    key={plan.id}
                    plan={plan}
                    onEdit={openEdit}
                    onToggle={handleToggle}
                    toggling={togglingId === plan.id}
                  />
                ))}
              </div>
            </section>

            {/* Inactive Plans */}
            {inactivePlans.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold text-white/30 uppercase tracking-wider mb-3">
                  Planes inactivos ({inactivePlans.length})
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {inactivePlans.map((plan) => (
                    <PlanCard
                      key={plan.id}
                      plan={plan}
                      onEdit={openEdit}
                      onToggle={handleToggle}
                      toggling={togglingId === plan.id}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Modal
        open={showModal}
        onClose={() => { setShowModal(false); setError('') }}
        title={editingPlan ? 'Editar Plan' : 'Nuevo Plan'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button onClick={handleSave} loading={saving}>
              {editingPlan ? 'Guardar cambios' : 'Crear Plan'}
            </Button>
          </>
        }
      >
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}
        <div className="space-y-4">
          <Input
            label="Nombre del Plan"
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            placeholder="Ej: Mensual, Trimestral..."
            required
          />
          <Input
            label="Duración (días)"
            type="number"
            value={form.dias_duracion}
            onChange={(e) => setForm({ ...form, dias_duracion: e.target.value })}
            placeholder="30"
            min="1"
            required
          />
          <Input
            label="Precio"
            type="number"
            value={form.precio}
            onChange={(e) => setForm({ ...form, precio: e.target.value })}
            placeholder="0.00"
            min="0"
            step="0.01"
          />
        </div>
      </Modal>
    </>
  )
}

function PlanCard({
  plan,
  onEdit,
  onToggle,
  toggling,
}: {
  plan: Plan
  onEdit: (p: Plan) => void
  onToggle: (p: Plan) => void
  toggling: boolean
}) {
  return (
    <div className={`card border transition-all duration-300 ${plan.activo ? 'border-white/5 hover:border-brand-500/30' : 'border-white/5 opacity-60'}`}>
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${plan.activo ? 'bg-energy-violet/10 text-energy-violet' : 'bg-white/5 text-white/30'}`}>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
          </svg>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {/* Edit button */}
          <button
            onClick={() => onEdit(plan)}
            className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white/80 transition-colors"
            title="Editar plan"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
            </svg>
          </button>

          {/* Toggle active */}
          <button
            onClick={() => onToggle(plan)}
            disabled={toggling}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
              plan.activo
                ? 'hover:bg-red-500/10 text-white/40 hover:text-red-400'
                : 'hover:bg-emerald-500/10 text-white/40 hover:text-emerald-400'
            }`}
            title={plan.activo ? 'Desactivar plan' : 'Activar plan'}
          >
            {toggling ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
              </svg>
            ) : plan.activo ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      <h3 className="text-lg font-semibold text-white mb-1">{plan.nombre}</h3>
      <p className="text-sm text-white/40 mb-3">{plan.dias_duracion} días de duración</p>

      {plan.precio > 0 ? (
        <p className="text-2xl font-display font-bold text-white">
          ${plan.precio.toLocaleString('es-CO')}
        </p>
      ) : (
        <p className="text-sm text-white/25">Sin precio configurado</p>
      )}
    </div>
  )
}
