'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useUser } from '@/lib/hooks/useUser'
import Header from '@/components/layout/Header'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import StatusBadge from '@/components/ui/StatusBadge'
import Modal from '@/components/ui/Modal'
import { PageLoader } from '@/components/ui/Spinner'
import { formatDate, getDaysRemaining } from '@/lib/utils/dates'
import type { MemberWithStatus, Plan } from '@/types/database'

export default function MemberDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { role } = useUser()

  const [member, setMember] = useState<MemberWithStatus | null>(null)
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  const [form, setForm] = useState({
    nombre: '',
    apellido: '',
    email: '',
    telefono: '',
    plan_id: '',
    fecha_inicio: '',
  })

  const isStaff = role && ['admin', 'asistente'].includes(role)

  useEffect(() => {
    async function load() {
      const [memberRes, plansRes] = await Promise.all([
        fetch(`/api/members/${params.id}`),
        fetch('/api/plans'),
      ])
      const memberJson = await memberRes.json()
      const plansJson = await plansRes.json()

      if (memberJson.data) {
        setMember(memberJson.data)
        setForm({
          nombre: memberJson.data.nombre,
          apellido: memberJson.data.apellido,
          email: memberJson.data.email || '',
          telefono: (memberJson.data.telefono || '').replace(/^\+57\s*/, ''),
          plan_id: memberJson.data.plan_id || '',
          fecha_inicio: memberJson.data.fecha_inicio,
        })
      }
      if (plansJson.data) setPlans(plansJson.data)
      setLoading(false)
    }
    load()
  }, [params.id])

  const handleSave = async () => {
    setError('')

    if (!form.nombre.trim() || !form.apellido.trim()) {
      setError('Nombre y apellido son obligatorios')
      return
    }
    if (!form.telefono.trim()) {
      setError('El teléfono es obligatorio')
      return
    }

    setSaving(true)

    const toTitleCase = (str: string) => str.trim().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')

    const res = await fetch(`/api/members/${params.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        nombre: toTitleCase(form.nombre),
        apellido: toTitleCase(form.apellido),
        email: form.email.trim() || null,
        telefono: form.telefono.trim() ? `+57 ${form.telefono.trim()}` : null,
        plan_id: form.plan_id || null,
      }),
    })

    const json = await res.json()
    if (json.error) {
      setError(json.error)
      setSaving(false)
      return
    }

    // Refresh data
    const refreshRes = await fetch(`/api/members/${params.id}`)
    const refreshJson = await refreshRes.json()
    if (refreshJson.data) setMember(refreshJson.data)

    setEditing(false)
    setSaving(false)
  }

  const handleDelete = async () => {
    const res = await fetch(`/api/members/${params.id}`, { method: 'DELETE' })
    const json = await res.json()
    if (!json.error) {
      router.push('/miembros')
    }
  }

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  if (loading) return <PageLoader />
  if (!member) return <div className="p-8 text-center text-white/40">Miembro no encontrado</div>

  const status = member.estado || 'inactivo'
  const daysRemaining = getDaysRemaining(member.fecha_vencimiento)

  return (
    <>
      <Header
        title={`${member.nombre} ${member.apellido}`}
        subtitle={member.email}
        actions={
          isStaff && !editing ? (
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setEditing(true)}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                </svg>
                <span className="hidden sm:inline">Editar</span>
              </Button>
              {role === 'admin' && (
                <Button variant="danger" onClick={() => setShowDeleteModal(true)}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                </Button>
              )}
            </div>
          ) : null
        }
      />

      <div className="px-4 lg:px-8 py-6 max-w-2xl space-y-6 animate-fade-in">
        {error && (
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Status Card */}
        <div className={`card border ${
          status === 'activo' ? 'border-emerald-500/20' :
          status === 'por_vencer' ? 'border-amber-500/20' :
          status === 'inactivo' ? 'border-white/10' :
          'border-red-500/20'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/40 mb-1">Estado de Membresía</p>
              <StatusBadge status={status} />
            </div>
            <div className="text-right">
              {status === 'inactivo' ? (
                <p className="text-sm text-white/30">Sin plan activo</p>
              ) : (
                <>
                  <p className="text-sm text-white/40">
                    {daysRemaining >= 0 ? 'Días restantes' : 'Días vencido'}
                  </p>
                  <p className={`text-2xl font-display font-bold ${
                    status === 'activo' ? 'text-emerald-400' :
                    status === 'por_vencer' ? 'text-amber-400' :
                    'text-red-400'
                  }`}>
                    {Math.abs(daysRemaining)}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Member Info */}
        <div className="card space-y-5">
          {editing ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Nombre" value={form.nombre} onChange={(e) => updateField('nombre', e.target.value)} required />
                <Input label="Apellido" value={form.apellido} onChange={(e) => updateField('apellido', e.target.value)} required />
              </div>
              <Input label="Email" type="email" value={form.email} onChange={(e) => updateField('email', e.target.value)} />
              <Input 
                label="Teléfono *" 
                type="tel" 
                value={form.telefono} 
                onChange={(e) => updateField('telefono', e.target.value)} 
                icon={<span className="text-white/50 text-sm font-medium pr-1 border-r border-white/10 mr-1">+57</span>}
                required 
              />

              <div className="space-y-1.5">
                <label className="input-label">Plan</label>
                <select value={form.plan_id} onChange={(e) => updateField('plan_id', e.target.value)} className="input-field appearance-none" required>
                  <option value="" disabled>— Selecciona plan —</option>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>{p.nombre} ({p.dias_duracion}d)</option>
                  ))}
                </select>
              </div>

              <div className="pt-2 border-t border-white/5 space-y-2">
                <InfoRow label="Fecha de Inicio" value={formatDate(member.fecha_inicio)} />
                <InfoRow label="Fecha de Vencimiento" value={formatDate(member.fecha_vencimiento)} />
              </div>

              <div className="flex gap-3 pt-2">
                <Button onClick={handleSave} loading={saving} className="flex-1">Guardar</Button>
                <Button variant="secondary" onClick={() => setEditing(false)}>Cancelar</Button>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <InfoRow label="Nombre" value={`${member.nombre} ${member.apellido}`} />
              <InfoRow label="Email" value={member.email} />
              <InfoRow label="Teléfono" value={member.telefono || 'No registrado'} />
              <InfoRow label="Plan" value={member.plan_nombre || 'Sin plan'} />
              <InfoRow label="Fecha de Inicio" value={formatDate(member.fecha_inicio)} />
              <InfoRow label="Fecha de Vencimiento" value={formatDate(member.fecha_vencimiento)} />
            </div>
          )}
        </div>
      </div>

      {/* Delete Modal */}
      <Modal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Eliminar Miembro"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>Cancelar</Button>
            <Button variant="danger" onClick={handleDelete}>Eliminar</Button>
          </>
        }
      >
        <p>¿Estás seguro de que deseas eliminar a <strong className="text-white">{member.nombre} {member.apellido}</strong>?</p>
        <p className="mt-2 text-white/40 text-xs">Esta acción desactivará al miembro. Se puede reactivar desde la base de datos.</p>
      </Modal>
    </>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
      <span className="text-sm text-white/40">{label}</span>
      <span className="text-sm text-white/80 font-medium">{value}</span>
    </div>
  )
}
