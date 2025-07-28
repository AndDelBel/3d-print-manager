// src/app/dashboard/organization/[id]/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useUser } from '@/hooks/useUser'
import { getOrgById, updateOrg } from '@/services/organizzazione'
import type { Organizzazione } from '@/types/organizzazione'

export default function EditOrgPage() {
  const router = useRouter()
  const params = useParams()
  const { loading } = useUser()
  const [org, setOrg] = useState<Organizzazione | null>(null)
  const [nome, setNome] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const id = params?.id as string

  useEffect(() => {
    if (!loading && id) {
      getOrgById(Number(id))
        .then(o => {
          if (o) {
            setOrg(o)
            setNome(o.nome)
          } else {
            setError('Organizzazione non trovata')
          }
        })
        .catch(err => {
          console.error('Errore fetch org:', err)
          setError('Errore nel caricamento dell\'organizzazione')
        })
    }
  }, [loading, id])

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-4 w-48"></div>
          <div className="h-64 bg-gray-100 rounded"></div>
        </div>
      </div>
    )
  }

  if (!org && !loading) {
    return (
      <div className="p-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error || 'Organizzazione non trovata'}
        </div>
        <button 
          onClick={() => router.push('/dashboard/organization')}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Torna alle Organizzazioni
        </button>
      </div>
    )
  }

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    
    if (!org) {
      setError('Organizzazione non disponibile')
      return
    }
    
    if (!nome.trim()) {
      setError('Il nome non può essere vuoto')
      return
    }
    
    setSaving(true)
    try {
      await updateOrg(org.id, nome.trim())
      router.push('/dashboard/organization')
    } catch (err: unknown) {
      console.error(err)
      if (err instanceof Error) setError(err.message)
      else setError('Errore durante l\'aggiornamento')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!org) return
    
    if (confirm(`Sei sicuro di voler eliminare l'organizzazione "${org.nome}"?`)) {
      setSaving(true)
      try {
        // Note: deleteOrg would need to be imported and implemented
        // await deleteOrg(org.id)
        console.log('Delete functionality would be implemented here')
        router.push('/dashboard/organization')
      } catch (err) {
        console.error(err)
        setError('Errore durante l\'eliminazione')
      } finally {
        setSaving(false)
      }
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Modifica Organizzazione</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleUpdate} className="space-y-4 max-w-md">
        <div>
          <label htmlFor="nome" className="block text-sm font-medium text-gray-700 mb-1">
            Nome Organizzazione
          </label>
          <input
            id="nome"
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            disabled={saving}
            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
            placeholder="Inserisci il nome dell'organizzazione"
          />
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={saving || !nome.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {saving ? 'Salvataggio...' : 'Salva'}
          </button>
          
          <button
            type="button"
            onClick={() => router.push('/dashboard/organization')}
            disabled={saving}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 disabled:bg-gray-200"
          >
            Annulla
          </button>
          
          <button
            type="button"
            onClick={handleDelete}
            disabled={saving}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400"
          >
            Elimina
          </button>
        </div>
      </form>
    </div>
  )
}