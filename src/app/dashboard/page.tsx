// src/app/dashboard/page.tsx
'use client'

import { useUser } from '@/hooks/useUser'

export default function DashboardPage() {
  const { user } = useUser()

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
      
      <div>
        <p>Benvenuto, {user?.nome} {user?.cognome}!</p>
        <p>Email: {user?.email}</p>
        <p>Superuser: {user?.is_superuser ? 'Sì' : 'No'}</p>
      </div>
    </div>
  )
} 