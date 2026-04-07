import type { MembershipStatus } from '@/types/database'

interface StatusBadgeProps {
  status: MembershipStatus
  size?: 'sm' | 'md'
}

const statusConfig = {
  activo: {
    label: 'Activo',
    className: 'badge-activo',
    dot: 'bg-emerald-400',
  },
  por_vencer: {
    label: 'Por vencer',
    className: 'badge-por-vencer',
    dot: 'bg-amber-400',
  },
  vencido: {
    label: 'Vencido',
    className: 'badge-vencido',
    dot: 'bg-red-400',
  },
  inactivo: {
    label: 'Inactivo',
    className: 'bg-surface-300 text-white/50 border border-white/5',
    dot: 'bg-white/30',
  },
}

export default function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const config = statusConfig[status]

  return (
    <span className={`${config.className} ${size === 'sm' ? 'text-[10px] px-2 py-0.5' : ''}`}>
      <span className={`dot-indicator ${config.dot} ${size === 'sm' ? 'w-1.5 h-1.5' : ''}`} />
      {config.label}
    </span>
  )
}
