import { getAuthUser } from '@/lib/utils/auth'
import { NextResponse } from 'next/server'

export async function GET() {
  const auth = await getAuthUser()
  if (!auth) {
    return NextResponse.json({ data: null, error: 'No autorizado' }, { status: 401 })
  }

  return NextResponse.json({
    data: {
      id: auth.user.id,
      email: auth.user.email,
      role: auth.role,
    },
    error: null,
  })
}
