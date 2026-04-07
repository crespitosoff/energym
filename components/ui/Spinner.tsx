export default function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  }

  return (
    <div className="flex items-center justify-center">
      <div className={`${sizes[size]} relative`}>
        <div className={`${sizes[size]} rounded-full border-2 border-white/10 border-t-brand-500 animate-spin`} />
      </div>
    </div>
  )
}

export function PageLoader() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 animate-fade-in">
      <Spinner size="lg" />
      <p className="text-sm text-white/40">Cargando...</p>
    </div>
  )
}

export function CardSkeleton() {
  return (
    <div className="card space-y-3 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full skeleton" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-32 skeleton rounded" />
          <div className="h-3 w-24 skeleton rounded" />
        </div>
      </div>
      <div className="h-3 w-full skeleton rounded" />
      <div className="h-3 w-3/4 skeleton rounded" />
    </div>
  )
}
