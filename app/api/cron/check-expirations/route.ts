import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

interface ExpiringMember {
  id: string
  nombre: string
  apellido: string
  email: string
  telefono: string | null
  plan_nombre: string | null
  fecha_vencimiento: string
  dias_restantes: number
}

export async function GET(request: NextRequest) {
  // Verify this is a legitimate cron request
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()

  // Get members expiring in the next 7 days
  const { data, error } = await supabase
    .from('members_expiring_soon')
    .select('*')

  const expiring = data as ExpiringMember[] | null

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Log for now — future: send notifications
  console.log(`[CRON] Found ${expiring?.length || 0} members expiring soon`)

  return NextResponse.json({
    message: `Checked expirations: ${expiring?.length || 0} members expiring soon`,
    members: expiring?.map((m) => ({
      nombre: `${m.nombre} ${m.apellido}`,
      email: m.email,
      dias_restantes: m.dias_restantes,
    })),
  })
}
