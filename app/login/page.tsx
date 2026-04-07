'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'

const ERROR_MESSAGES: Record<string, string> = {
  'Invalid login credentials': 'Email o contraseña incorrectos. Verifica tus datos e intenta de nuevo.',
  'Email not confirmed': 'Tu cuenta aún no ha sido confirmada. Revisa tu bandeja de entrada.',
  'Too many requests': 'Demasiados intentos fallidos. Espera unos minutos antes de intentar de nuevo.',
  'User not found': 'No existe una cuenta con ese email.',
  'Network request failed': 'Error de conexión. Verifica tu internet e intenta de nuevo.',
}

function getErrorMessage(raw: string): string {
  return ERROR_MESSAGES[raw] ?? 'Ocurrió un error inesperado. Intenta de nuevo.'
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(getErrorMessage(error.message))
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden px-4">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-dark" />
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-600/10 rounded-full blur-[150px]" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-energy-violet/10 rounded-full blur-[120px]" />

      {/* Card */}
      <div className="relative z-10 w-full max-w-md animate-slide-up">
        {/* Logo + Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-brand flex items-center justify-center shadow-glow">
              <span className="text-white font-bold text-2xl font-display">E</span>
            </div>
          </div>
          <h1 className="text-3xl font-display font-bold text-white">
            Bienvenido
          </h1>
          <p className="text-sm text-white/40 mt-2">
            Panel de gestión — Solo personal autorizado
          </p>
        </div>

        {/* Form */}
        <div className="card border border-white/5 p-6 sm:p-8">
          {error && (
            <div className="mb-5 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-start gap-3 animate-slide-down">
              <svg className="w-5 h-5 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Correo electrónico"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="correo@ejemplo.com"
              required
              autoComplete="email"
              icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
              }
            />

            <Input
              label="Contraseña"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              autoComplete="current-password"
              icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
              }
            />

            <Button
              type="submit"
              loading={loading}
              className="w-full !py-3.5 !text-base !rounded-xl"
            >
              Iniciar Sesión
            </Button>
          </form>

          <div className="mt-6 pt-5 border-t border-white/5">
            <p className="text-center text-xs text-white/25 flex items-center justify-center gap-2">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
              El acceso es solo para personal del gimnasio.
              ¿Necesitas acceso? Contacta al administrador.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}