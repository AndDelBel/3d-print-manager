// src/app/dashboard/page.tsx
'use client'

import { useUser } from '@/hooks/useUser'
import Link from 'next/link'

export default function DashboardPage() {
  const { loading, user } = useUser()

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="hero min-h-screen bg-base-200">
        <div className="hero-content text-center">
          <div className="max-w-md">
            <h1 className="text-5xl font-bold">Accesso Negato</h1>
            <p className="py-6">Devi effettuare il login per accedere al dashboard.</p>
            <Link href="/auth/login" className="btn btn-primary">
              Vai al Login
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="hero bg-base-200 rounded-lg p-8 mb-8">
        <div className="hero-content text-center">
          <div className="max-w-md">
            <h1 className="text-5xl font-bold">Dashboard</h1>
            <p className="py-6">
              Benvenuto nel sistema di gestione stampe 3D!
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* File Management Card */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Gestione File
            </h2>
            <p>Carica e gestisci i tuoi file STL/STEP e G-code</p>
            <div className="card-actions justify-end">
              <Link href="/dashboard/files" className="btn btn-primary">
                Vai ai File
              </Link>
            </div>
          </div>
        </div>

        {/* Orders Card */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Ordini
            </h2>
            <p>Gestisci gli ordini di stampa e traccia lo stato</p>
            <div className="card-actions justify-end">
              <Link href="/dashboard/orders" className="btn btn-primary">
                Vai agli Ordini
              </Link>
            </div>
          </div>
        </div>

        {/* Organizations Card */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              Organizzazioni
            </h2>
            <p>Gestisci le organizzazioni e i progetti</p>
            <div className="card-actions justify-end">
              <Link href="/dashboard/organization" className="btn btn-primary">
                Vai alle Organizzazioni
              </Link>
            </div>
          </div>
        </div>

        {/* Printers Card */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
              Stampanti
            </h2>
            <p>Configura e monitora le stampanti 3D</p>
            <div className="card-actions justify-end">
              <Link href="/dashboard/stampanti" className="btn btn-primary">
                Vai alle Stampanti
              </Link>
            </div>
          </div>
        </div>

        {/* Print Queue Card */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Coda di Stampa
            </h2>
            <p>Gestisci la coda di stampa automatica</p>
            <div className="card-actions justify-end">
              <Link href="/dashboard/coda-stampa" className="btn btn-primary">
                Vai alla Coda
              </Link>
            </div>
          </div>
        </div>

        {/* User Info Card */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Profilo Utente
            </h2>
            <p>Email: {user.email}</p>
            {user.is_superuser && (
              <div className="badge badge-primary">Super User</div>
            )}
            <div className="card-actions justify-end">
              <button className="btn btn-outline btn-sm">
                Modifica Profilo
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 