import { getAuthUser, hasRole } from '@/lib/utils/auth'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthUser()
  if (!auth) {
    return NextResponse.json({ data: null, error: 'No autorizado' }, { status: 401 })
  }

  const { id } = await params

  const { data, error } = await auth.supabase
    .from('members_with_status')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    return NextResponse.json({ data: null, error: 'Miembro no encontrado' }, { status: 404 })
  }

  return NextResponse.json({ data, error: null })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthUser()
  if (!auth) {
    return NextResponse.json({ data: null, error: 'No autorizado' }, { status: 401 })
  }

  if (!hasRole(auth.role, ['admin', 'asistente'])) {
    return NextResponse.json({ data: null, error: 'Sin permisos' }, { status: 403 })
  }

  const { id } = await params
  const body = await request.json()
  const { nombre, apellido, email, telefono, plan_id } = body

  // Validation: do not allow empty plan_id
  if (plan_id === '' || plan_id === null) {
    return NextResponse.json({ data: null, error: 'El plan no puede quedar vacío. Solo se permite renovar o cambiar.' }, { status: 400 })
  }

  const updateData: Record<string, unknown> = { updated_by: auth.user.id }
  if (nombre !== undefined) updateData.nombre = nombre
  if (apellido !== undefined) updateData.apellido = apellido
  if (email !== undefined) updateData.email = email
  if (telefono !== undefined) updateData.telefono = telefono
  if (plan_id !== undefined) updateData.plan_id = plan_id

  const { data, error } = await auth.supabase
    .from('members')
    .update(updateData as any)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ data: null, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data, error: null })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthUser()
  if (!auth) {
    return NextResponse.json({ data: null, error: 'No autorizado' }, { status: 401 })
  }

  if (!hasRole(auth.role, ['admin', 'asistente'])) {
    return NextResponse.json({ data: null, error: 'Sin permisos' }, { status: 403 })
  }

  const { id } = await params
  const body = await request.json()
  const { plan_id, force_renewal } = body

  if (!force_renewal || !plan_id) {
    return NextResponse.json({ data: null, error: 'Faltan parámetros de renovación' }, { status: 400 })
  }

  // Set local today date in Colombia format
  const today = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Bogota' })).toISOString().split('T')[0]

  const { data, error } = await auth.supabase
    .from('members')
    .update({
      plan_id,
      fecha_inicio: today,
      updated_by: auth.user.id
    } as any)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ data: null, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data, error: null })
}


export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthUser()
  if (!auth) {
    return NextResponse.json({ data: null, error: 'No autorizado' }, { status: 401 })
  }

  if (!hasRole(auth.role, ['admin'])) {
    return NextResponse.json({ data: null, error: 'Solo administradores pueden eliminar' }, { status: 403 })
  }

  const { id } = await params

  const { error } = await auth.supabase
    .from('members')
    .update({ activo: false, updated_by: auth.user.id })
    .eq('id', id)

  if (error) {
    return NextResponse.json({ data: null, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data: { deleted: true }, error: null })
}
