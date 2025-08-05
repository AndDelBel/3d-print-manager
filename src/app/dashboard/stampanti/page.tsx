'use client'

import { useEffect, useState, useCallback } from 'react'
import { useUser } from '@/hooks/useUser'
import { useRetryFetch } from '@/hooks/useRetryFetch'
import { deleteStampante } from '@/services/stampante'
import type { StampanteData } from '@/types/stampante'
import { AlertMessage } from '@/components/AlertMessage'
import { LoadingButton } from '@/components/LoadingButton'
import { StampanteCard } from '@/components/StampanteCard'
import { AddStampanteModal } from '@/components/AddStampanteModal'

export default function StampantiPage() {
  const { loading, user } = useUser()
  const [stampanti, setStampanti] = useState<StampanteData[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loadingStampanti, setLoadingStampanti] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const isSuperuser = user?.is_superuser

  const loadStampanti = useCallback(async (silent = false) => {
    if (!user) return
    if (!silent) setLoadingStampanti(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/stampanti?userId=${user.id}&isSuperuser=${isSuperuser}`)
      const data = await response.json()
      
      if (data.success) {
        setStampanti(data.stampanti)
      } else {
        if (!silent) {
          setError(data.error || 'Errore nel caricamento delle stampanti')
        }
      }
    } catch (err) {
      if (!silent) {
        setError('Errore nel caricamento delle stampanti')
        console.error('Errore caricamento stampanti:', err)
      }
    } finally {
      if (!silent) setLoadingStampanti(false)
    }
  }, [user, isSuperuser])

  // Retry automatico ogni 10 secondi quando in loading
  useRetryFetch(loadingStampanti, () => loadStampanti(), {
    retryInterval: 10000,
    enabled: true
  })

  useEffect(() => {
    if (!loading && user) {
      loadStampanti()
    }
  }, [loading, user, loadStampanti])

  // Aggiornamento automatico ogni secondo (silenzioso)
  useEffect(() => {
    if (!user) return

    const interval = setInterval(() => {
      loadStampanti(true) // Aggiornamento silenzioso
    }, 1000)

    return () => clearInterval(interval)
  }, [user, loadStampanti])

  const handleRefresh = useCallback(async () => {
    if (!user) return
    setRefreshing(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/stampanti?userId=${user.id}&isSuperuser=${isSuperuser}`)
      const data = await response.json()
      
      if (data.success) {
        setStampanti(data.stampanti)
      } else {
        setError(data.error || 'Errore nell\'aggiornamento delle stampanti')
      }
    } catch (err) {
      setError('Errore nell\'aggiornamento delle stampanti')
      console.error('Errore aggiornamento stampanti:', err)
    } finally {
      setRefreshing(false)
    }
  }, [user, isSuperuser])

  const handleAddStampante = useCallback(async (uniqueId: string) => {
    try {
      const response = await fetch('/api/stampanti', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ unique_id: uniqueId }),
      })
      
      const data = await response.json()
      
      if (data.success) {
        // Ricarica tutte le stampanti per ottenere i dati completi
        await loadStampanti()
        setModalOpen(false)
        setError(null)
      } else {
        setError(data.error || 'Errore nell\'aggiunta della stampante')
      }
    } catch (err) {
      setError('Errore nell\'aggiunta della stampante')
      console.error('Errore aggiunta stampante:', err)
    }
  }, [loadStampanti])

  const handleDeleteStampante = useCallback(async (id: number) => {
    try {
      await deleteStampante(id)
      setStampanti(prev => prev.filter(s => s.id !== id))
      setError(null)
    } catch (err) {
      setError('Errore nell\'eliminazione della stampante')
      console.error('Errore eliminazione stampante:', err)
    }
  }, [])

  const handleOpenModal = useCallback(() => {
    setModalOpen(true)
  }, [])

  const handleCloseModal = useCallback(() => {
    setModalOpen(false)
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <AlertMessage message="Accesso non autorizzato" type="error" />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Stampanti
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Gestisci le tue stampanti 3D integrate con Home Assistant
          </p>
        </div>
        
        <div className="flex gap-4 items-center">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Aggiornamento automatico
            </span>
          </div>
          
          <LoadingButton
            onClick={handleRefresh}
            loading={refreshing}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
          >
            Aggiorna Dati
          </LoadingButton>
          
          <button
            onClick={handleOpenModal}
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg"
          >
            Aggiungi Stampante
          </button>
        </div>
      </div>

      {error && (
        <AlertMessage 
          message={error} 
          type="error" 
          onClose={() => setError(null)}
        />
      )}

      {loadingStampanti ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      ) : stampanti.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">🖨️</div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Nessuna stampante configurata
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Aggiungi la tua prima stampante per iniziare a monitorarla
          </p>
          <button
            onClick={handleOpenModal}
            className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg"
          >
            Aggiungi Stampante
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stampanti.map((stampante) => (
            <StampanteCard
              key={stampante.id}
              stampante={stampante}
              onDelete={() => handleDeleteStampante(stampante.id)}
              onRefresh={() => handleRefresh()}
            />
          ))}
        </div>
      )}

      <AddStampanteModal
        isOpen={modalOpen}
        onClose={handleCloseModal}
        onAdd={handleAddStampante}
      />
    </div>
  )
} 