import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function SinAccesoPage() {
  // Get the current user to show their email
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  async function signOut() {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden px-4">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-dark" />
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-red-600/5 rounded-full blur-[150px]" />

      <div className="relative z-10 w-full max-w-md text-center animate-slide-up">
        {/* Icon */}
        <div className="w-20 h-20 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>

        <h1 className="text-2xl font-display font-bold text-white mb-2">
          Acceso no autorizado
        </h1>
        <p className="text-white/50 mb-2 text-sm">
          Tu cuenta <span className="text-white/70 font-medium">{user.email}</span> no tiene permisos para acceder al panel de gestión.
        </p>
        <p className="text-white/40 text-xs mb-8">
          Este sistema es exclusivo para personal autorizado del gimnasio. Si crees que esto es un error, contacta al administrador.
        </p>

        <div className="card border border-white/5 p-5 mb-6 text-left">
          <p className="text-xs font-semibold text-white/30 uppercase tracking-wider mb-3">¿Qué puedes hacer?</p>
          <ul className="space-y-2 text-sm text-white/50">
            <li className="flex items-start gap-2">
              <svg className="w-4 h-4 text-white/30 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
              Contactar al administrador del gimnasio para solicitar acceso
            </li>
            <li className="flex items-start gap-2">
              <svg className="w-4 h-4 text-white/30 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
              Cerrar sesión e iniciar con una cuenta autorizada
            </li>
          </ul>
        </div>

        <form action={signOut}>
          <button
            type="submit"
            className="btn-primary w-full justify-center"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
            </svg>
            Cerrar sesión
          </button>
        </form>
      </div>
    </div>
  )
}
