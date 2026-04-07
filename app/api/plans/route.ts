import { getAuthUser, hasRole } from '@/lib/utils/auth'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET() {
  const auth = await getAuthUser()
  if (!auth) {
    return NextResponse.json({ data: null, error: 'No autorizado' }, { status: 401 })
  }

  const { data, error } = await auth.supabase
    .from('plans')
    .select('*')
    .order('dias_duracion', { ascending: true })

  if (error) {
    return NextResponse.json({ data: null, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data, error: null })
}

export async function POST(request: NextRequest) {
  const auth = await getAuthUser()
  if (!auth) {
    return NextResponse.json({ data: null, error: 'No autorizado' }, { status: 401 })
  }

  if (!hasRole(auth.role, ['admin'])) {
    return NextResponse.json({ data: null, error: 'Solo administradores' }, { status: 403 })
  }

  const body = await request.json()
  const { nombre, dias_duracion, precio } = body

  if (!nombre || !dias_duracion) {
    return NextResponse.json({ data: null, error: 'Campos requeridos: nombre, dias_duracion' }, { status: 400 })
  }

  const { data, error } = await auth.supabase
    .from('plans')
    .insert({
      nombre,
      dias_duracion,
      precio: precio || 0,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ data: null, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data, error: null }, { status: 201 })
}
