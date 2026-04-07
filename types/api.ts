// ============================================================================
// EnerGym - API Response Types
// ============================================================================

export interface ApiResponse<T = unknown> {
  data: T | null
  error: string | null
  status: number
}

export interface PaginatedResponse<T = unknown> extends ApiResponse<T[]> {
  count: number
  page: number
  limit: number
}

export interface MemberStats {
  total: number
  activos: number
  por_vencer: number
  vencidos: number
}

export interface AuthUser {
  id: string
  email: string
  role: 'admin' | 'asistente' | 'cliente'
}
