import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)

export type Member = {
  id: string
  nombre: string
  email: string
  plan_id: string
  plan_nombre?: string
  fecha_inicio: string
  fecha_vencimiento: string
}

export type Plan = {
  id: string
  nombre: string
  dias_duracion: number
}