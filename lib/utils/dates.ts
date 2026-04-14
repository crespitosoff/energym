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
 * Get days remaining until expiration (Bogotá timezone)
 * Returns: positive = days left, 0 = expires today, negative = days overdue
 */
export function getDaysRemaining(fechaVencimiento: string): number {
  // Get today in Colombia timezone as YYYY-MM-DD
  const bogotaToday = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(new Date())
  const today = new Date(bogotaToday + 'T00:00:00')
  const expDate = new Date(fechaVencimiento.split('T')[0] + 'T00:00:00')
  return Math.round((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
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

/**
 * Format a UTC timestamp to Colombia local date (DD/MM/YYYY)
 * Useful for created_at / updated_at fields stored in UTC
 */
export function formatDateTimeBogota(utcDate: string | null): string {
  if (!utcDate) return ''
  return new Intl.DateTimeFormat('es-CO', {
    timeZone: 'America/Bogota',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(utcDate))
}
