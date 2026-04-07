'use client'

import { useEffect, useState, useCallback } from 'react'
import { useUser } from '@/lib/hooks/useUser'
import Header from '@/components/layout/Header'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import { PageLoader } from '@/components/ui/Spinner'

interface RegisterSession {
  id: string
  opened_by: string
  opened_at: string
  initial_cash: number
  closed_by: string | null
  closed_at: string | null
  final_cash: number | null
  notes: string | null
}

interface Sale {
  id: string
  concepto: string
  descripcion: string
  monto_total: number
  created_at: string
  members: { nombre: string; apellido: string } | null
  plans: { nombre: string } | null
  sale_payments: { metodo: string; monto: number }[]
}

const CONCEPTO_LABELS: Record<string, string> = {
  nueva_membresia: 'Nueva membresía',
  renovacion: 'Renovación',
}

const METODO_LABELS: Record<string, string> = {
  efectivo: '💵 Efectivo',
  tarjeta: '💳 Tarjeta',
  transferencia: '📱 Transferencia',
}

export default function CajaPage() {
  const { role } = useUser()
  const [session, setSession] = useState<RegisterSession | null>(null)
  const [sales, setSales] = useState<Sale[]>([])
  
  // Data for renovation modal
  const [members, setMembers] = useState<{id: string, nombre: string, apellido: string}[]>([])
  const [plans, setPlans] = useState<{id: string, nombre: string, precio: number, dias_duracion: number}[]>([])
  
  const [loading, setLoading] = useState(true)

  // Open caja modal
  const [showOpen, setShowOpen] = useState(false)
  const [openCash, setOpenCash] = useState('0')
  const [openLoading, setOpenLoading] = useState(false)

  // Close caja modal
  const [showClose, setShowClose] = useState(false)
  const [closeCash, setCloseCash] = useState('')
  const [closeNotes, setCloseNotes] = useState('')
  const [closeLoading, setCloseLoading] = useState(false)

  // Renovation modal
  const [showSale, setShowSale] = useState(false)
  const [saleLoading, setSaleLoading] = useState(false)
  const [saleError, setSaleError] = useState('')
  const [saleForm, setSaleForm] = useState({
    member_id: '',
    plan_id: '',
  })
  const [pagos, setPagos] = useState([{ metodo: 'efectivo', monto: '' }])

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [sessionRes, salesRes, membersRes, plansRes] = await Promise.all([
      fetch('/api/register-sessions?current=true'),
      fetch('/api/sales?limit=30'),
      fetch('/api/members?limit=300'),
      fetch('/api/plans'),
    ])
    const [sessionJson, salesJson, membersJson, plansJson] = await Promise.all([
      sessionRes.json(), salesRes.json(), membersRes.json(), plansRes.json()
    ])
    
    if (sessionJson.data) setSession(sessionJson.data)
    else setSession(null)
    
    if (salesJson.data) setSales(salesJson.data)
    if (membersJson.data) setMembers(membersJson.data)
    if (plansJson.data) setPlans(plansJson.data.filter((p: any) => p.activo))
      
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleOpenCaja = async () => {
    setOpenLoading(true)
    const res = await fetch('/api/register-sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initial_cash: parseFloat(openCash) || 0 }),
    })
    const json = await res.json()
    setOpenLoading(false)
    if (!json.error) {
      setShowOpen(false)
      setOpenCash('0')
      fetchData()
    }
  }

  const handleCloseCaja = async () => {
    if (!session) return
    setCloseLoading(true)
    await fetch('/api/register-sessions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: session.id,
        final_cash: parseFloat(closeCash) || 0,
        notes: closeNotes,
      }),
    })
    setCloseLoading(false)
    setShowClose(false)
    setCloseCash('')
    setCloseNotes('')
    fetchData()
  }

  const addPago = () => setPagos([...pagos, { metodo: 'efectivo', monto: '' }])
  const removePago = (i: number) => setPagos(pagos.filter((_, idx) => idx !== i))
  const updatePago = (i: number, field: string, val: string) => {
    const updated = [...pagos]
    updated[i] = { ...updated[i], [field]: val }
    setPagos(updated)
  }

  const selectedPlan = plans.find(p => p.id === saleForm.plan_id)

  const handleSale = async () => {
    setSaleError('')
    if (!saleForm.member_id || !saleForm.plan_id) {
      setSaleError('Debes seleccionar un cliente y un plan de membresía.')
      return
    }
    
    const total = selectedPlan?.precio || 0

    const sumPagos = pagos.reduce((s, p) => s + (parseFloat(p.monto) || 0), 0)
    if (Math.abs(sumPagos - total) > 0.01 && total > 0) {
      setSaleError(`Los montos ingresados ($${sumPagos.toLocaleString('es-CO')}) no suman al total de la membresía ($${total.toLocaleString('es-CO')})`)
      return
    }

    setSaleLoading(true)
    
    const mem = members.find(m => m.id === saleForm.member_id)
    
    const res = await fetch('/api/sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        member_id: saleForm.member_id,
        plan_id: saleForm.plan_id,
        concepto: 'renovacion',
        descripcion: `Renovación: ${selectedPlan?.nombre} - ${mem?.nombre} ${mem?.apellido}`,
        monto_total: total,
        pagos: total > 0 ? pagos.map((p) => ({ metodo: p.metodo, monto: parseFloat(p.monto) || 0 })) : [{ metodo: 'efectivo', monto: 0 }],
        register_session_id: session?.id || null,
      }),
    })
    
    const json = await res.json()
    setSaleLoading(false)
    if (json.error) { setSaleError(json.error); return }

    setShowSale(false)
    setSaleForm({ member_id: '', plan_id: '' })
    setPagos([{ metodo: 'efectivo', monto: '' }])
    
    // Auto-update member's expiration remotely
    await fetch(`/api/members/${saleForm.member_id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan_id: saleForm.plan_id, force_renewal: true })
    })
    
    fetchData()
  }

  const formatMoney = (n: number) => `$${n.toLocaleString('es-CO', { minimumFractionDigits: 0 })}`
  const formatTime = (d: string) => new Date(d).toLocaleString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true })

  // Calculate session totals
  const sessionSales = session ? sales.filter((s) =>
    new Date(s.created_at) >= new Date(session.opened_at)
  ) : []
  const totalVentas = sessionSales.reduce((s, sale) => s + sale.monto_total, 0)
  const totalEfectivo = sessionSales.reduce((s, sale) =>
    s + sale.sale_payments.filter((p) => p.metodo === 'efectivo').reduce((ss, p) => ss + p.monto, 0), 0)

  if (loading) return <PageLoader />

  return (
    <>
      <Header
        title="Caja"
        subtitle={session ? `Abierta desde ${formatTime(session.opened_at)}` : 'Cerrada'}
        actions={
          session ? (
            <div className="flex gap-2">
              <Button onClick={() => { setSaleError(''); setShowSale(true) }}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                <span className="hidden sm:inline">Renovar Plan</span>
              </Button>
              <Button variant="secondary" onClick={() => setShowClose(true)}>
                <span className="hidden sm:inline">Cerrar Caja</span>
                <span className="sm:hidden">Cerrar</span>
              </Button>
            </div>
          ) : (
            <Button onClick={() => setShowOpen(true)}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 119 0v3.75M3.75 21.75h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H3.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
              Abrir Caja
            </Button>
          )
        }
      />

      <div className="px-4 lg:px-8 py-6 space-y-6 animate-fade-in">
        {session ? (
          <>
            {/* Session stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="card border border-white/5">
                <p className="text-xs text-white/40 mb-1">Base</p>
                <p className="text-xl font-display font-bold text-white">{formatMoney(session.initial_cash)}</p>
              </div>
              <div className="card border border-emerald-500/20 bg-emerald-500/5">
                <p className="text-xs text-white/40 mb-1">Cobros del día</p>
                <p className="text-xl font-display font-bold text-emerald-400">{formatMoney(totalVentas)}</p>
              </div>
              <div className="card border border-brand-500/20 bg-brand-500/5">
                <p className="text-xs text-white/40 mb-1">Efectivo total</p>
                <p className="text-xl font-display font-bold text-brand-400">{formatMoney(session.initial_cash + totalEfectivo)}</p>
              </div>
            </div>

            {/* Today's sales */}
            <div>
              <h2 className="text-xs font-semibold text-white/30 uppercase tracking-wider mb-3">
                Movimientos de hoy ({sessionSales.length})
              </h2>
              {sessionSales.length === 0 ? (
                <div className="card text-center py-8">
                  <p className="text-white/30 text-sm">Aún no hay renovaciones o membresías nuevas hoy.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {sessionSales.map((sale) => (
                    <div key={sale.id} className="card !p-4 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white/90 truncate">{sale.descripcion}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-xs text-white/30">{CONCEPTO_LABELS[sale.concepto] || sale.concepto}</span>
                          <span className="text-white/15">·</span>
                          <span className="text-xs text-white/30">{sale.sale_payments.map((p) => `${METODO_LABELS[p.metodo] || p.metodo}`).join(', ')}</span>
                        </div>
                      </div>
                      <p className="text-sm font-bold text-emerald-400 shrink-0">
                        +{formatMoney(sale.monto_total)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="card text-center py-16">
            <svg className="w-20 h-20 mx-auto text-white/10 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={0.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
            <p className="text-white/40 mb-2">La caja está cerrada</p>
            <p className="text-white/25 text-xs mb-6">Abre la caja para comenzar a registrar cobros del día</p>
            <Button onClick={() => setShowOpen(true)}>Abrir Caja</Button>
          </div>
        )}
      </div>

      {/* Open register modal */}
      <Modal
        open={showOpen}
        onClose={() => setShowOpen(false)}
        title="Abrir Caja"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowOpen(false)}>Cancelar</Button>
            <Button onClick={handleOpenCaja} loading={openLoading}>Abrir Caja</Button>
          </>
        }
      >
        <Input
          label="Monto base en caja (efectivo inicial)"
          type="number"
          value={openCash}
          onChange={(e) => setOpenCash(e.target.value)}
          placeholder="0"
          min="0"
          step="1000"
        />
      </Modal>

      {/* Close register modal */}
      <Modal
        open={showClose}
        onClose={() => setShowClose(false)}
        title="Cerrar Caja"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowClose(false)}>Cancelar</Button>
            <Button onClick={handleCloseCaja} loading={closeLoading}>Cerrar Caja</Button>
          </>
        }
      >
        <div className="space-y-4">
          {session && (
            <div className="p-3 rounded-xl bg-surface-200 border border-white/5 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-white/40">Base:</span>
                <span className="text-white/70">{formatMoney(session.initial_cash)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">Ventas en efectivo:</span>
                <span className="text-emerald-400">+{formatMoney(totalEfectivo)}</span>
              </div>
              <div className="flex justify-between border-t border-white/5 pt-2 font-semibold">
                <span className="text-white/60">Efectivo esperado:</span>
                <span className="text-white">{formatMoney(session.initial_cash + totalEfectivo)}</span>
              </div>
            </div>
          )}
          <Input
            label="¿Cuánto efectivo hay en caja?"
            type="number"
            value={closeCash}
            onChange={(e) => setCloseCash(e.target.value)}
            placeholder="Contar y anotar"
            min="0"
            step="1000"
          />
          <Input
            label="Observaciones (opcional)"
            value={closeNotes}
            onChange={(e) => setCloseNotes(e.target.value)}
            placeholder="Novedades del día..."
          />
        </div>
      </Modal>

      {/* Renovation modal */}
      <Modal
        open={showSale}
        onClose={() => { setShowSale(false); setSaleError('') }}
        title="Renovar Plan"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowSale(false)}>Cancelar</Button>
            <Button onClick={handleSale} loading={saleLoading} disabled={!saleForm.member_id || !saleForm.plan_id}>Cobrar</Button>
          </>
        }
      >
        {saleError && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {saleError}
          </div>
        )}
        <div className="space-y-5">
          
          <div className="space-y-1.5">
            <label className="input-label">Cliente</label>
            <select
              value={saleForm.member_id}
              onChange={(e) => setSaleForm({ ...saleForm, member_id: e.target.value })}
              className="input-field appearance-none cursor-pointer"
            >
              <option value="">— Buscar miembro —</option>
              {members.map(m => (
                <option key={m.id} value={m.id}>{m.nombre} {m.apellido}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="input-label">Plan a renovar</label>
            <select
              value={saleForm.plan_id}
              onChange={(e) => {
                setSaleForm({ ...saleForm, plan_id: e.target.value })
                const plan = plans.find(p => p.id === e.target.value)
                if (plan && pagos.length === 1) {
                  updatePago(0, 'monto', plan.precio.toString())
                }
              }}
              className="input-field appearance-none cursor-pointer"
            >
              <option value="">— Selecciona plan —</option>
              {plans.map(p => (
                <option key={p.id} value={p.id}>{p.nombre} — {formatMoney(p.precio)}</option>
              ))}
            </select>
          </div>
          
          {selectedPlan && selectedPlan.precio > 0 && (
            <div className="p-3 bg-brand-500/5 border border-brand-500/20 rounded-xl">
              <p className="text-xs text-brand-400 mb-1">Total a cobrar</p>
              <p className="text-xl font-bold font-display text-white">{formatMoney(selectedPlan.precio)}</p>
            </div>
          )}

          {/* Payment methods */}
          {selectedPlan && selectedPlan.precio > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="input-label">Métodos de pago</label>
                <button
                  type="button"
                  onClick={addPago}
                  className="text-xs text-brand-400 hover:text-brand-300 font-medium"
                >
                  + Agregar método
                </button>
              </div>
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
                      className="input-field w-28"
                      min="0"
                      step="100"
                    />
                    {pagos.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removePago(i)}
                        className="w-8 h-8 rounded-lg hover:bg-red-500/10 flex items-center justify-center text-white/30 hover:text-red-400 transition-colors shrink-0"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Modal>
    </>
  )
}
