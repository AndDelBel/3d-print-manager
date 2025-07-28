'use client'

import { ReactNode } from 'react'
import DashboardHeader from '@/components/DashboardHeader'

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader />
      <div className="flex">
        <aside className="w-64 bg-white shadow-sm p-4 min-h-screen">
          {/* qui la tua sidebar */}
        </aside>
        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  )
}