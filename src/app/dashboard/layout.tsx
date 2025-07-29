'use client'

import { ReactNode } from 'react'
import UserAvatar from '@/components/UserAvatar'
import DashboardHeader from '@/components/DashboardHeader'


export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="w-64 bg-gray-100 p-4">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-300">
          <UserAvatar size="lg" />
          <div className="text-sm text-gray-700 font-medium">
            Profilo Utente
          </div>
        </div>
        {/* qui la tua sidebar */}
      </aside>
      <main className="flex-1 p-8">
        {children}
      </main>
  )
}