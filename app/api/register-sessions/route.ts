import { getAuthUser, hasRole } from '@/lib/utils/auth'
import { NextResponse, type NextRequest } from 'next/server'

// GET /api/register-sessions — get current open session or list sessions
export async function GET(request: NextRequest) {
  const auth = await getAuthUser()
  if (!auth) return NextResponse.json({ data: null, error: 'No autorizado' }, { status: 401 })
  if (!hasRole(auth.role, ['admin', 'asistente'])) return NextResponse.json({ data: null, error: 'Sin permisos' }, { status: 403 })

  const current = request.nextUrl.searchParams.get('current')

  if (current === 'true') {
    // Get current open session
    const { data, error } = await auth.supabase
      .from('register_sessions')
      .select('*')
      .is('closed_at', null)
      .order('opened_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) return NextResponse.json({ data: null, error: error.message }, { status: 500 })
    return NextResponse.json({ data, error: null })
  }

  // List recent sessions
  const { data, error } = await auth.supabase
    .from('register_sessions')
    .select('*')
    .order('opened_at', { ascending: false })
    .limit(30)

  if (error) return NextResponse.json({ data: null, error: error.message }, { status: 500 })
  return NextResponse.json({ data, error: null })
}

// POST /api/register-sessions — open a new session
export async function POST(request: NextRequest) {
  const auth = await getAuthUser()
  if (!auth) return NextResponse.json({ data: null, error: 'No autorizado' }, { status: 401 })
  if (!hasRole(auth.role, ['admin', 'asistente'])) return NextResponse.json({ data: null, error: 'Sin permisos' }, { status: 403 })

  // Check if there's already an open session
  const { data: existing } = await auth.supabase
    .from('register_sessions')
    .select('id')
    .is('closed_at', null)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ data: null, error: 'Ya hay una caja abierta. Debes cerrarla antes de abrir otra.' }, { status: 409 })
  }

  const body = await request.json()
  const { initial_cash } = body

  const { data, error } = await auth.supabase
    .from('register_sessions')
    .insert({
      opened_by: auth.user.id,
      initial_cash: initial_cash || 0,
    } as any)
    .select()
    .single()

  if (error) return NextResponse.json({ data: null, error: error.message }, { status: 500 })
  return NextResponse.json({ data, error: null }, { status: 201 })
}

// PATCH /api/register-sessions — close current session
export async function PATCH(request: NextRequest) {
  const auth = await getAuthUser()
  if (!auth) return NextResponse.json({ data: null, error: 'No autorizado' }, { status: 401 })
  if (!hasRole(auth.role, ['admin', 'asistente'])) return NextResponse.json({ data: null, error: 'Sin permisos' }, { status: 403 })

  const body = await request.json()
  const { session_id, final_cash, notes } = body

  if (!session_id) {
    return NextResponse.json({ data: null, error: 'session_id es requerido' }, { status: 400 })
  }

  const { data, error } = await auth.supabase
    .from('register_sessions')
    .update({
      closed_by: auth.user.id,
      closed_at: new Date().toISOString(),
      final_cash: final_cash ?? 0,
      notes: notes || null,
    } as any)
    .eq('id', session_id)
    .is('closed_at', null)
    .select()
    .single()

  if (error) return NextResponse.json({ data: null, error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ data: null, error: 'Sesión no encontrada o ya cerrada' }, { status: 404 })
  return NextResponse.json({ data, error: null })
}
