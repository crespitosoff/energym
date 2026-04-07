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
    // Try to get from localStorage first to show UI immediately
    const cachedRole = localStorage.getItem(`energym_role_${userId}`)
    if (cachedRole) {
      setRole(cachedRole as UserRole)
      setLoading(false)
    }

    try {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single()

      if (data) {
        setRole((data as { role: string }).role as UserRole)
        localStorage.setItem(`energym_role_${userId}`, data.role)
      }
    } catch (err) {
      console.error('Error fetching role:', err)
    }
  }, [supabase])

  useEffect(() => {
    let mounted = true

    // Safety timeout: stop loading after 5 seconds to prevent frozen UI
    const loadingTimeout = setTimeout(() => {
      if (mounted) setLoading(false)
    }, 5000)

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
          // Clean up localstorage on logout
          Object.keys(localStorage).forEach(key => {
            if (key.startsWith('energym_role_')) localStorage.removeItem(key)
          })
        }
        if (mounted) setLoading(false)
      }
    )

    return () => {
      mounted = false
      clearTimeout(loadingTimeout)
      subscription.unsubscribe()
    }
  }, [supabase, fetchRole])

  const signOut = async () => {
    try {
      await supabase.auth.signOut()
    } catch (err) {
      console.error('Error on signout:', err)
    } finally {
      setUser(null)
      setRole(null)
      // Clean up localstorage on logout
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('energym_') || key.startsWith('sb-')) {
          localStorage.removeItem(key)
        }
      })
      sessionStorage.clear()

      // Force delete all cookies (fixes mobile next/ssr caching)
      document.cookie.split(";").forEach((c) => {
        document.cookie = c
          .replace(/^ +/, "")
          .replace(/=.*/, `=;expires=${new Date(0).toUTCString()};path=/`);
      });

      window.location.href = '/login'
    }
  }

  return (
    <AuthContext.Provider value={{ user, role, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}
