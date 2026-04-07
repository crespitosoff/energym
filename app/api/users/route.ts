import { getAuthUser, hasRole } from '@/lib/utils/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

// GET /api/users — list all auth users with their roles and emails (admin only)
export async function GET() {
  const auth = await getAuthUser()
  if (!auth) return NextResponse.json({ data: null, error: 'No autorizado' }, { status: 401 })
  if (!hasRole(auth.role, ['admin'])) return NextResponse.json({ data: null, error: 'Solo administradores' }, { status: 403 })

  try {
    const adminClient = createAdminClient()

    // Get all users from auth.users (with email)
    const { data: authData, error: authError } = await adminClient.auth.admin.listUsers()
    if (authError) throw authError

    // Get all roles
    const { data: roles, error: rolesError } = await auth.supabase
      .from('user_roles')
      .select('*')

    if (rolesError) throw rolesError

    // Merge: enrich roles with user email
    const users = (roles || []).map((role: any) => {
      const authUser = authData.users.find((u) => u.id === role.user_id)
      return {
        ...role,
        email: authUser?.email || 'Sin email',
        last_sign_in: authUser?.last_sign_in_at || null,
      }
    })

    return NextResponse.json({ data: users, error: null })
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message || 'Error interno' }, { status: 500 })
  }
}
