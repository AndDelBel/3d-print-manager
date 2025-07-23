'use client' // rimuovi se non serve codice client-side

import { ReactNode } from 'react'

export default function OrganizationLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="w-64 bg-gray-100 p-4">
        {/* qui la tua sidebar */}
      </aside>
      <main className="flex-1 p-8">
        {children}
      </main>
    </div>
  )
}