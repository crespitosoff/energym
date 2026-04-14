import { getAuthUser } from '@/lib/utils/auth'
import { NextResponse } from 'next/server'

export async function GET() {
  const auth = await getAuthUser()
  if (!auth) {
    return NextResponse.json({ data: null, error: 'No autorizado' }, { status: 401 })
  }

  // Get active members grouped by plan
  const { data, error } = await auth.supabase
    .from('members_with_status')
    .select('plan_id, plan_nombre')
    .eq('activo', true)
    .in('estado', ['activo', 'por_vencer'])
    .not('plan_id', 'is', null)

  if (error) {
    return NextResponse.json({ data: null, error: error.message }, { status: 500 })
  }

  // Group and count manually since Supabase JS doesn't support GROUP BY
  const counts: Record<string, { plan_id: string; plan_nombre: string; count: number }> = {}
  for (const row of data || []) {
    const key = row.plan_id as string
    if (!counts[key]) {
      counts[key] = { plan_id: key, plan_nombre: row.plan_nombre as string, count: 0 }
    }
    counts[key].count++
  }

  const metrics = Object.values(counts).sort((a, b) => b.count - a.count)

  return NextResponse.json({ data: metrics, error: null })
}
