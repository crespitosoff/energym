import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Routes that don't need authentication
const PUBLIC_ROUTES = ['/', '/login', '/auth/callback', '/sin-acceso']
// Routes that only staff (admin/asistente) can access
const STAFF_ONLY_ROUTES = ['/dashboard', '/miembros', '/planes', '/contabilidad', '/usuarios']

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: DO NOT remove auth.getUser() — refreshes expired tokens
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname
  const isPublicRoute = PUBLIC_ROUTES.some((r) => pathname === r)
  const isApiRoute = pathname.startsWith('/api/')

  // 1. Not authenticated → redirect to login (for protected routes)
  if (!user && !isPublicRoute && !isApiRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // 2. Authenticated user trying to access login → redirect to dashboard
  if (user && pathname === '/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // 3. Authenticated but need to verify ROLE for protected routes
  if (user && !isPublicRoute && !isApiRoute) {
    // Fetch the user's role
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    const role = (roleData as { role: string } | null)?.role

    // Only admin and asistente can access the panel
    const isStaff = role === 'admin' || role === 'asistente'
    const needsStaffAccess = STAFF_ONLY_ROUTES.some((r) => pathname.startsWith(r))

    if (needsStaffAccess && !isStaff) {
      // Redirect unauthorized users to /sin-acceso
      const url = request.nextUrl.clone()
      url.pathname = '/sin-acceso'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
