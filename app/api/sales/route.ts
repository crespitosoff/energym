import { getAuthUser, hasRole } from '@/lib/utils/auth'
import { NextResponse, type NextRequest } from 'next/server'

// GET /api/sales — list sales with payments and member info
export async function GET(request: NextRequest) {
  const auth = await getAuthUser()
  if (!auth) return NextResponse.json({ data: null, error: 'No autorizado' }, { status: 401 })
  if (!hasRole(auth.role, ['admin', 'asistente'])) return NextResponse.json({ data: null, error: 'Sin permisos' }, { status: 403 })

  const searchParams = request.nextUrl.searchParams
  const concepto = searchParams.get('concepto')
  const session_id = searchParams.get('session_id')
  const limit = parseInt(searchParams.get('limit') || '50')

  let query = auth.supabase
    .from('sales')
    .select(`
      *,
      members ( id, nombre, apellido ),
      plans ( nombre ),
      sale_payments ( id, metodo, monto )
    `)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (concepto) query = query.eq('concepto', concepto)
  if (session_id) query = query.eq('register_session_id', session_id)

  const { data, error } = await query
  if (error) return NextResponse.json({ data: null, error: error.message }, { status: 500 })
  return NextResponse.json({ data, error: null })
}

// POST /api/sales — create a sale with payment methods
export async function POST(request: NextRequest) {
  const auth = await getAuthUser()
  if (!auth) return NextResponse.json({ data: null, error: 'No autorizado' }, { status: 401 })
  if (!hasRole(auth.role, ['admin', 'asistente'])) return NextResponse.json({ data: null, error: 'Sin permisos' }, { status: 403 })

  const body = await request.json()
  const { member_id, plan_id, concepto, descripcion, monto_total, pagos, register_session_id } = body

  // Validations
  if (!concepto || !descripcion || !monto_total) {
    return NextResponse.json({ data: null, error: 'concepto, descripcion y monto_total son requeridos' }, { status: 400 })
  }

  if (['nueva_membresia', 'renovacion'].includes(concepto) && !member_id) {
    return NextResponse.json({ data: null, error: 'member_id es requerido para membresías' }, { status: 400 })
  }

  if (!pagos || !Array.isArray(pagos) || pagos.length === 0) {
    return NextResponse.json({ data: null, error: 'Debes incluir al menos un método de pago' }, { status: 400 })
  }

  // Validate total matches
  const sumPagos = pagos.reduce((s: number, p: any) => s + (parseFloat(p.monto) || 0), 0)
  if (Math.abs(sumPagos - monto_total) > 0.01) {
    return NextResponse.json({
      data: null,
      error: `Los pagos ($${sumPagos.toLocaleString()}) no suman al total ($${monto_total.toLocaleString()})`
    }, { status: 400 })
  }

  // 1. Create the sale
  const { data: sale, error: saleError } = await auth.supabase
    .from('sales')
    .insert({
      member_id: member_id || null,
      plan_id: plan_id || null,
      concepto,
      descripcion,
      monto_total,
      register_session_id: register_session_id || null,
      created_by: auth.user.id,
    } as any)
    .select()
    .single()

  if (saleError) return NextResponse.json({ data: null, error: saleError.message }, { status: 500 })

  // 2. Insert payment methods
  const paymentRows = pagos.map((p: any) => ({
    sale_id: (sale as any).id,
    metodo: p.metodo,
    monto: parseFloat(p.monto),
  }))

  const { error: payError } = await auth.supabase
    .from('sale_payments')
    .insert(paymentRows as any)

  if (payError) {
    // Rollback: delete the sale
    await auth.supabase.from('sales').delete().eq('id', (sale as any).id)
    return NextResponse.json({ data: null, error: payError.message }, { status: 500 })
  }

  return NextResponse.json({ data: sale, error: null }, { status: 201 })
}
