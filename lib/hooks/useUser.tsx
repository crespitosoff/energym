'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import type { UserRole } from '@/types/database'

interface AuthContextType {
  user: User | null
  role: UserRole | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  loading: true,
  signOut: async () => {},
})

export function useUser() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useUser must be used within an AuthProvider')
  }
  return context
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<UserRole | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchRole = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single()

    if (data) {
      setRole((data as { role: string }).role as UserRole)
    }
  }, [supabase])

  useEffect(() => {
    let mounted = true

    // Get initial session
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!mounted) return
      
      const user = session?.user ?? null
      setUser(user)
      if (user) {
        await fetchRole(user.id)
      }
      if (mounted) setLoading(false)
    }

    getSession()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!mounted) return
        const currentUser = session?.user ?? null
        setUser(currentUser)
        if (currentUser) {
          await fetchRole(currentUser.id)
        } else {
          setRole(null)
        }
        if (mounted) setLoading(false)
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [supabase, fetchRole])

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setRole(null)
    window.location.href = '/login'
  }

  return (
    <AuthContext.Provider value={{ user, role, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}
