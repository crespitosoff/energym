import { getAuthUser, hasRole } from '@/lib/utils/auth'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const auth = await getAuthUser()
  if (!auth) {
    return NextResponse.json({ data: null, error: 'No autorizado' }, { status: 401 })
  }

  const searchParams = request.nextUrl.searchParams
  const search = searchParams.get('search') || ''
  const status = searchParams.get('status') || 'all'
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '50')
  const offset = (page - 1) * limit

  let query = auth.supabase
    .from('members_with_status')
    .select('*', { count: 'exact' })
    .eq('activo', true)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (search) {
    query = query.or(`nombre.ilike.%${search}%,apellido.ilike.%${search}%,email.ilike.%${search}%`)
  }

  if (status !== 'all') {
    query = query.eq('estado', status)
  }

  const { data, error, count } = await query

  if (error) {
    return NextResponse.json({ data: null, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data, error: null, count: count || 0, page, limit })
}

export async function POST(request: NextRequest) {
  const auth = await getAuthUser()
  if (!auth) {
    return NextResponse.json({ data: null, error: 'No autorizado' }, { status: 401 })
  }

  if (!hasRole(auth.role, ['admin', 'asistente'])) {
    return NextResponse.json({ data: null, error: 'Sin permisos' }, { status: 403 })
  }

  const body = await request.json()
  const { nombre, apellido, email, telefono, plan_id, fecha_inicio, fecha_nacimiento, pagos, register_session_id } = body

  if (!nombre || !apellido || !email || !fecha_inicio) {
    return NextResponse.json({ data: null, error: 'Campos requeridos: nombre, apellido, email, fecha_inicio' }, { status: 400 })
  }

  if (!plan_id) {
    return NextResponse.json({ data: null, error: 'Debes seleccionar un plan de membresía' }, { status: 400 })
  }

  // Si hay pagos, validar que venga la sesion (si es requerida)
  if (!pagos || !Array.isArray(pagos) || pagos.length === 0) {
    return NextResponse.json({ data: null, error: 'Debes proveer métodos de pago para la membresía' }, { status: 400 })
  }

  // Get plan details for sale price
  const { data: plan } = await auth.supabase.from('plans').select('precio').eq('id', plan_id).single()
  if (!plan) {
    return NextResponse.json({ data: null, error: 'Plan no encontrado' }, { status: 404 })
  }

  const totalPayments = pagos.reduce((sum: number, p: any) => sum + (parseFloat(p.monto) || 0), 0)
  if (Math.abs(totalPayments - plan.precio) > 0.01) {
    return NextResponse.json({ data: null, error: 'Los pagos no suman el valor del plan' }, { status: 400 })
  }

  const { data, error } = await auth.supabase
    .from('members')
    .insert({
      nombre,
      apellido,
      email,
      telefono: telefono || null,
      plan_id,
      fecha_inicio,
      fecha_vencimiento: fecha_inicio, // will be recalculated by trigger
      fecha_nacimiento: fecha_nacimiento || null,
      created_by: auth.user.id,
      updated_by: auth.user.id,
    } as any)
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ data: null, error: 'Ya existe un miembro con ese email' }, { status: 409 })
    }
    return NextResponse.json({ data: null, error: error.message }, { status: 500 })
  }

  const newMember = data

  // Register sale
  const { data: sale, error: saleErr } = await auth.supabase
    .from('sales')
    .insert({
      member_id: newMember.id,
      plan_id: plan_id,
      concepto: 'nueva_membresia',
      descripcion: `Nueva membresía (${nombre} ${apellido})`,
      monto_total: plan.precio,
      register_session_id: register_session_id || null,
      created_by: auth.user.id
    })
    .select()
    .single()

  if (saleErr) {
    return NextResponse.json({ data: newMember, error: 'Miembro creado, pero falló registro de venta: ' + saleErr.message }, { status: 201 })
  }

  // Register payments
  const paymentsData = pagos.map((p: any) => ({
    sale_id: sale.id,
    metodo: p.metodo,
    monto: parseFloat(p.monto) || 0
  }))

  const { error: paymentsErr } = await auth.supabase
    .from('sale_payments')
    .insert(paymentsData)

  if (paymentsErr) {
    return NextResponse.json({ data: newMember, error: 'Miembro creado, pero falló registro de pagos: ' + paymentsErr.message }, { status: 201 })
  }

  return NextResponse.json({ data, error: null }, { status: 201 })
}
