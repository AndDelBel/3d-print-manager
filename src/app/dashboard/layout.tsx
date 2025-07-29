'use client'

import { ReactNode } from 'react'



export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <main className="flex-1 p-8">
        {children}
      </main>
    </div>
  )
}