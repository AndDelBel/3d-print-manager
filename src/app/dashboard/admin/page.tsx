'use client'

import { useUser } from '@/hooks/useUser'
import GcodeReanalyzeTool from '@/components/GcodeReanalyzeTool'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function AdminPage() {
  const { user, loading } = useUser()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user?.is_superuser) {
      router.push('/dashboard')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    )
  }

  if (!user?.is_superuser) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="alert alert-error">
          <div>
            <h3 className="font-bold">Accesso Negato</h3>
            <div className="text-sm">
              Solo i superuser possono accedere a questa pagina.
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">🛠️ Strumenti di Amministrazione</h1>
        <p className="text-base-content/70">
          Strumenti avanzati per la gestione e manutenzione del sistema.
        </p>
      </div>

      <div className="space-y-8">
        <GcodeReanalyzeTool />
      </div>
    </div>
  )
}
