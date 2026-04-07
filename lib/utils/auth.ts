import { createClient } from '@/lib/supabase/server'
import type { UserRole } from '@/types/database'

/**
 * Get the authenticated user and their role.
 * Returns null if not authenticated.
 */
export async function getAuthUser() {
  const supabase = await createClient()

  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null

  const { data } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  const role = (data as { role: string } | null)?.role as UserRole || 'cliente'

  return { user, role, supabase }
}

/**
 * Check if the user has one of the specified roles
 */
export function hasRole(userRole: UserRole, allowedRoles: UserRole[]): boolean {
  return allowedRoles.includes(userRole)
}
