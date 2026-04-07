import { getAuthUser } from '@/lib/utils/auth'
import { NextResponse } from 'next/server'

export async function GET() {
  const auth = await getAuthUser()
  if (!auth) {
    return NextResponse.json({ data: null, error: 'No autorizado' }, { status: 401 })
  }

  const { count: total } = await auth.supabase
    .from('members')
    .select('*', { count: 'exact', head: true })
    .eq('activo', true)

  const { count: activos } = await auth.supabase
    .from('active_members')
    .select('*', { count: 'exact', head: true })

  const { count: por_vencer } = await auth.supabase
    .from('members_expiring_soon')
    .select('*', { count: 'exact', head: true })

  const totalNum = total || 0
  const activosNum = activos || 0
  const porVencerNum = por_vencer || 0
  const vencidosNum = totalNum - activosNum

  return NextResponse.json({
    data: {
      total: totalNum,
      activos: activosNum,
      por_vencer: porVencerNum,
      vencidos: vencidosNum < 0 ? 0 : vencidosNum,
    },
    error: null,
  })
}
