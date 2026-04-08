// ============================================================================
// Date utilities for membership status
// ============================================================================

import type { MembershipStatus } from '@/types/database'

/**
 * Calculate membership status from expiration date
 */
export function getMembershipStatus(fechaVencimiento: string): MembershipStatus {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const expDate = new Date(fechaVencimiento)
  expDate.setHours(0, 0, 0, 0)

  const diffDays = Math.ceil(
    (expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  )

  if (diffDays < 0) return 'vencido'
  if (diffDays <= 7) return 'por_vencer'
  return 'activo'
}

/**
 * Format date to locale string
 */
export function formatDate(date: string | null): string {
  if (!date) return ''
  const [year, month, day] = date.split('T')[0].split('-')
  return `${day}/${month}/${year}`
}

/**
 * Get days remaining until expiration
 */
export function getDaysRemaining(fechaVencimiento: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const expDate = new Date(fechaVencimiento)
  expDate.setHours(0, 0, 0, 0)
  return Math.ceil(
    (expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  )
}

/**
 * Calculate expiration date from start date and plan days
 */
export function calculateExpirationDate(
  fechaInicio: string,
  diasDuracion: number
): string {
  const start = new Date(fechaInicio)
  start.setDate(start.getDate() + diasDuracion)
  return start.toISOString().split('T')[0]
}
