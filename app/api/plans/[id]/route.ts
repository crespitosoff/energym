import { getAuthUser, hasRole } from '@/lib/utils/auth'
import { NextResponse, type NextRequest } from 'next/server'

// PUT /api/plans/[id] — update plan
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthUser()
  if (!auth) return NextResponse.json({ data: null, error: 'No autorizado' }, { status: 401 })
  if (!hasRole(auth.role, ['admin'])) return NextResponse.json({ data: null, error: 'Solo administradores' }, { status: 403 })

  const { id } = await params
  const body = await request.json()
  const { nombre, dias_duracion, precio } = body

  if (!nombre || !dias_duracion) {
    return NextResponse.json({ data: null, error: 'nombre y dias_duracion son requeridos' }, { status: 400 })
  }

  const { data, error } = await auth.supabase
    .from('plans')
    .update({ nombre, dias_duracion, precio: precio ?? 0 } as any)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ data: null, error: error.message }, { status: 500 })
  return NextResponse.json({ data, error: null })
}

// PATCH /api/plans/[id] — toggle activo
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthUser()
  if (!auth) return NextResponse.json({ data: null, error: 'No autorizado' }, { status: 401 })
  if (!hasRole(auth.role, ['admin'])) return NextResponse.json({ data: null, error: 'Solo administradores' }, { status: 403 })

  const { id } = await params
  const body = await request.json()
  const { activo } = body

  if (typeof activo !== 'boolean') {
    return NextResponse.json({ data: null, error: 'activo debe ser boolean' }, { status: 400 })
  }

  const { data, error } = await auth.supabase
    .from('plans')
    .update({ activo } as any)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ data: null, error: error.message }, { status: 500 })
  return NextResponse.json({ data, error: null })
}

// DELETE /api/plans/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthUser()
  if (!auth) return NextResponse.json({ data: null, error: 'No autorizado' }, { status: 401 })
  if (!hasRole(auth.role, ['admin'])) return NextResponse.json({ data: null, error: 'Solo administradores' }, { status: 403 })

  const { id } = await params

  // Soft delete — deactivate instead of removing
  const { data, error } = await auth.supabase
    .from('plans')
    .update({ activo: false } as any)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ data: null, error: error.message }, { status: 500 })
  return NextResponse.json({ data, error: null })
}
