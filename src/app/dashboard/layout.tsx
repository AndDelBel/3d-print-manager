'use client'

import { CacheManager } from '@/components/CacheManager'
import { useUser } from '@/hooks/useUser'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { loading } = useUser()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Caricamento...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <CacheManager />
      <main>{children}</main>
    </div>
  )
}