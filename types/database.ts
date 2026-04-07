// ============================================================================
// EnerGym - Database Types
// Matches the Supabase PostgreSQL schema
// ============================================================================

export type UserRole = 'admin' | 'asistente' | 'cliente'

export type MembershipStatus = 'activo' | 'por_vencer' | 'vencido' | 'inactivo'

export interface UserRoleRecord {
  id: string
  user_id: string
  role: UserRole
  created_at: string
  updated_at: string
}

export interface Plan {
  id: string
  nombre: string
  dias_duracion: number
  precio: number
  activo: boolean
  created_at: string
  updated_at: string
}

export interface Member {
  id: string
  nombre: string
  apellido: string
  email: string
  telefono: string | null
  plan_id: string | null
  fecha_inicio: string
  fecha_vencimiento: string
  activo: boolean
  created_at: string
  updated_at: string
  created_by: string | null
  updated_by: string | null
}

export interface MemberWithStatus extends Member {
  plan_nombre: string | null
  plan_dias: number | null
  estado: MembershipStatus
}

export interface AuditLog {
  id: string
  table_name: string
  record_id: string
  action: 'INSERT' | 'UPDATE' | 'DELETE'
  old_values: Record<string, unknown> | null
  new_values: Record<string, unknown> | null
  user_id: string | null
  user_role: string | null
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

// Supabase Database type for typed client
export interface Database {
  public: {
    Tables: {
      user_roles: {
        Row: UserRoleRecord
        Insert: Omit<UserRoleRecord, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<UserRoleRecord, 'id' | 'created_at' | 'updated_at'>>
      }
      plans: {
        Row: Plan
        Insert: Omit<Plan, 'id' | 'created_at' | 'updated_at' | 'activo'> & { activo?: boolean }
        Update: Partial<Omit<Plan, 'id' | 'created_at' | 'updated_at'>>
      }
      members: {
        Row: Member
        Insert: Omit<Member, 'id' | 'created_at' | 'updated_at' | 'activo'> & { activo?: boolean }
        Update: Partial<Omit<Member, 'id' | 'created_at' | 'updated_at'>>
      }
      audit_log: {
        Row: AuditLog
        Insert: Omit<AuditLog, 'id' | 'created_at'>
        Update: never
      }
    }
    Views: {
      members_with_status: {
        Row: MemberWithStatus
      }
      active_members: {
        Row: Pick<MemberWithStatus, 'id' | 'nombre' | 'apellido' | 'email' | 'telefono' | 'plan_id' | 'plan_nombre' | 'plan_dias' | 'fecha_inicio' | 'fecha_vencimiento' | 'estado'>
      }
      members_expiring_soon: {
        Row: Pick<MemberWithStatus, 'id' | 'nombre' | 'apellido' | 'email' | 'telefono' | 'plan_nombre' | 'fecha_vencimiento'> & { dias_restantes: number }
      }
    }
    Functions: {
      get_user_role: {
        Args: Record<string, never>
        Returns: string
      }
      is_admin: {
        Args: Record<string, never>
        Returns: boolean
      }
      is_staff: {
        Args: Record<string, never>
        Returns: boolean
      }
    }
  }
}
