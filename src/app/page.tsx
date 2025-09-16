'use client'

import { useUser } from '@/hooks/useUser'
import Link from 'next/link'


export default function HomePage() {
  const { loading, user } = useUser()


  if (loading) {
    return (
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="flex justify-center items-center min-h-[400px]">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      </main>
    )
  }

  if (!user) {
    return (
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-base-content mb-6">Benvenuto in 3D Print Manager</h1>
          <p className="text-xl text-base-content/70 mb-8">
            Gestisci i tuoi file 3D, ordini e coda di stampa in modo semplice ed efficiente
          </p>
          <div className="flex justify-center space-x-4">
            <Link
              href="/auth/login"
              className="btn btn-primary"
            >
              Accedi
            </Link>
            <Link
              href="/auth/register"
              className="btn btn-outline"
            >
              Registrati
            </Link>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
      <p className="mb-4">Benvenuto, {user.nome} {user.cognome}!</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <Link href="/dashboard/files" className="card bg-base-200 hover:bg-base-300 transition-colors">
          <div className="card-body">
            <h3 className="card-title text-base-content">File</h3>
            <p className="text-base-content/70">Gestisci i tuoi file 3D e G-code</p>
          </div>
        </Link>
        
        <Link href="/dashboard/orders" className="card bg-base-200 hover:bg-base-300 transition-colors">
          <div className="card-body">
            <h3 className="card-title text-base-content">Ordini</h3>
            <p className="text-base-content/70">Visualizza e gestisci gli ordini di stampa</p>
          </div>
        </Link>
        
        
        
        {user.is_superuser && (
          <>
          <Link href="/dashboard/coda-stampa" className="card bg-base-200 hover:bg-base-300 transition-colors">
            <div className="card-body">
              <h3 className="card-title text-base-content">Coda Stampa</h3>
              <p className="text-base-content/70">Monitora la coda di stampa</p>
            </div>
          </Link>
            <Link href="/dashboard/organization" className="card bg-base-200 hover:bg-base-300 transition-colors">
              <div className="card-body">
                <h3 className="card-title text-base-content">Organizzazioni</h3>
                <p className="text-base-content/70">Gestisci le organizzazioni</p>
              </div>
            </Link>
            
            <Link href="/dashboard/stampanti" className="card bg-base-200 hover:bg-base-300 transition-colors">
              <div className="card-body">
                <h3 className="card-title text-base-content">Stampanti</h3>
                <p className="text-base-content/70">Gestisci le stampanti 3D</p>
              </div>
            </Link>
          </>
        )}
      </div>

    </main>
  )
}