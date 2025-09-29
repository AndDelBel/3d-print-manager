'use client'

import { ReactNode } from 'react'
import { AuthWrapper } from '@/components/AuthWrapper'

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <main className="flex-1 p-8">
        <AuthWrapper requireAuth={true}>
          {children}
        </AuthWrapper>
      </main>
    </div>
  )
}