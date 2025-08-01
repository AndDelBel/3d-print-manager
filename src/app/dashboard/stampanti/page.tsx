// src/app/dashboard/stampanti/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@/hooks/useUser'
import { listStampanti, createStampante, updateStampante, deleteStampante } from '@/services/stampante'
import type { Stampante } from '@/types/stampante'
import { AlertMessage } from '@/components/AlertMessage'
import { LoadingButton } from '@/components/LoadingButton'
import { StampanteCard } from '@/components/StampanteCard'
import { StampanteModal } from '@/components/StampanteModal'

export default function StampantiPage() {
  const { loading, user } = useUser()
  const [stampanti, setStampanti] = useState<Stampante[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loadingStampanti, setLoadingStampanti] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedStampante, setSelectedStampante] = useState<Stampante | null>(null)

  const isSuperuser = user?.is_superuser

  useEffect(() => {
    if (!loading && user) {
      setLoadingStampanti(true)
      listStampanti({ userId: user.id, isSuperuser })
        .then(setStampanti)
        .catch(() => setError('Errore caricamento stampanti'))
        .finally(() => setLoadingStampanti(false))
    }
  }, [loading, user, isSuperuser])

  const handleRefresh = () => {
    if (!user) return;
    setLoadingStampanti(true)
    listStampanti({ userId: user.id, isSuperuser })
      .then(setStampanti)
      .catch(() => setError('Errore caricamento stampanti'))
      .finally(() => setLoadingStampanti(false))
  }

  const handleOpenModal = (stampante?: Stampante) => {
    setSelectedStampante(stampante || null)
    setModalOpen(true)
  }

  const handleCloseModal = () => {
    setModalOpen(false)
    setSelectedStampante(null)
  }

  const handleSaveStampante = async (stampanteData: Partial<Stampante>) => {
    try {
      if (selectedStampante) {
        // Aggiorna stampante esistente
        await updateStampante(selectedStampante.id, stampanteData)
      } else {
        // Crea nuova stampante
        await createStampante(stampanteData)
      }
      handleRefresh()
    } catch (error) {
      console.error('Errore salvataggio stampante:', error)
      throw error
    }
  }

  const handleDeleteStampante = async (id: number) => {
    if (confirm('Sei sicuro di voler eliminare questa stampante?')) {
      try {
        await deleteStampante(id)
        handleRefresh()
      } catch (error) {
        console.error('Errore eliminazione stampante:', error)
        setError('Errore nell\'eliminazione della stampante')
      }
    }
  }

  if (loading) return <p>Caricamento…</p>

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Stampanti</h1>
        <div className="flex gap-2">
          <a
            href="/dashboard/stampanti/test"
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Test API
          </a>
          <LoadingButton
            onClick={handleRefresh}
            loading={loadingStampanti}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Aggiorna
          </LoadingButton>
        </div>
      </div>

      {error && <AlertMessage type="error" message={error} onClose={() => setError(null)} />}

      {loadingStampanti ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Caricamento stampanti...</p>
        </div>
      ) : stampanti.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">Nessuna stampante trovata</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stampanti.map(stampante => (
            <StampanteCard
              key={stampante.id}
              stampante={stampante}
              onRefresh={handleRefresh}
              onEdit={handleOpenModal}
              onDelete={handleDeleteStampante}
              isSuperuser={isSuperuser}
            />
          ))}
        </div>
      )}

      {/* Sezione per aggiungere nuove stampanti */}
      <div className="mt-8 p-6 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Aggiungi nuova stampante</h3>
          <p className="text-gray-600 mb-4">
            Configura una nuova stampante per il monitoraggio remoto
          </p>
          <button 
            onClick={() => handleOpenModal()}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            + Nuova Stampante
          </button>
        </div>
      </div>

      {/* Modal per configurazione stampante */}
      <StampanteModal
        isOpen={modalOpen}
        onClose={handleCloseModal}
        stampante={selectedStampante}
        onSave={handleSaveStampante}
      />
    </div>
  )
} 