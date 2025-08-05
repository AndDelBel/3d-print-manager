// src/app/dashboard/page.tsx
'use client'

import { useUser } from '@/hooks/useUser'

export default function DashboardPage() {
  const { loading, user } = useUser()

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
      

      
      {user ? (
        <div>
          <p>Benvenuto, {user.nome} {user.cognome}!</p>
          <p>Email: {user.email}</p>
          <p>Superuser: {user.is_superuser ? 'Sì' : 'No'}</p>
        </div>
      ) : (
        <p>Non sei autenticato.</p>
      )}
    </div>
  )
} 