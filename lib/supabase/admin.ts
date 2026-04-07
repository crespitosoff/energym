import { createClient } from '@supabase/supabase-js'

/**
 * Supabase Admin client using the service role key.
 * This bypasses RLS — use ONLY on the server side for admin operations
 * like listing auth.users, managing roles, etc.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  if (!serviceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set in environment variables')
  }

  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
