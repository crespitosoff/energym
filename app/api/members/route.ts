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

  // Get plan details just to verify plan exists
  const { data: plan } = await auth.supabase.from('plans').select('precio').eq('id', plan_id).single()
  if (!plan) {
    return NextResponse.json({ data: null, error: 'Plan no encontrado' }, { status: 404 })
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

  // NOTA: Inserciones en 'sales' y 'sale_payments' comentadas/bypasseadas 
  // para permitir creación de miembros independiente de la caja.

  return NextResponse.json({ data, error: null }, { status: 201 })
}
