import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-dark" />
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-brand-600/20 rounded-full blur-[128px]" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-energy-violet/20 rounded-full blur-[128px]" />

      {/* Content */}
      <div className="relative z-10 text-center px-6 max-w-xl mx-auto animate-fade-in">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-brand flex items-center justify-center shadow-glow-lg">
            <span className="text-white font-bold text-2xl font-display">E</span>
          </div>
        </div>

        <h1 className="text-4xl sm:text-5xl font-display font-bold text-white mb-4 tracking-tight">
          Ener<span className="gradient-text">Gym</span>
        </h1>

        <p className="text-lg text-white/50 mb-10 text-balance leading-relaxed">
          Sistema inteligente de gestión de membresías. 
          Controla clientes, planes y vencimientos en un solo lugar.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/login"
            className="btn-primary text-base px-8 py-3.5 rounded-2xl shadow-glow-lg hover:shadow-glow-lg"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
            </svg>
            Iniciar Sesión
          </Link>
        </div>

        {/* Feature pills */}
        <div className="flex flex-wrap justify-center gap-3 mt-12">
          {['Mobile-first', 'Serverless', 'Seguro'].map((feat) => (
            <span
              key={feat}
              className="px-4 py-1.5 rounded-full text-xs font-medium text-white/40 border border-white/5 bg-white/[0.02]"
            >
              {feat}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}