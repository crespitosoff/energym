'use client'

import { AuthProvider } from '@/lib/hooks/useUser'
import Sidebar from '@/components/layout/Sidebar'
import BottomNav from '@/components/layout/BottomNav'

interface AppShellProps {
  children: React.ReactNode
}

export default function AppShell({ children }: AppShellProps) {
  return (
    <AuthProvider>
      <div className="dark min-h-screen bg-surface-0 text-white">
        <Sidebar />
        <BottomNav />

        {/* Main content area */}
        <main className="lg:ml-64 min-h-screen pb-20 lg:pb-0">
          {children}
        </main>
      </div>
    </AuthProvider>
  )
}
