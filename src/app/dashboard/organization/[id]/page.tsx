// src/app/dashboard/organization/[id]/page.tsx
'use client'

import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useUser } from '@/hooks/useUser'
import {
  getOrgById,
  updateOrg,
  deleteOrg
} from '@/services/organizzazione'
import type { Organizzazione } from '@/types/organizzazione'

export default function OrgDetailPage() {
  const { loading } = useUser()
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const [org, setOrg] = useState<Organizzazione | null>(null)
  const [nome, setNome] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // carica i dettagli
  useEffect(() => {
    if (!loading && id) {
      getOrgById(Number(id))
        .then(o => {
          setOrg(o)
          setNome(o.nome)
        })
        .catch(err => {
          console.error('Errore fetch org:', err)
        })
    }
  }, [loading, id])

  if (loading || !org) return <p>Caricamento…</p>

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
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
      else setError(String(err))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Sei sicuro di voler eliminare questa organizzazione?')) return
    setDeleting(true)
    try {
      await deleteOrg(org.id)
      router.push('/dashboard/organization')
    } catch (err: unknown) {
      console.error(err)
      if (err instanceof Error) setError(err.message)
      else setError(String(err))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="p-8 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-6">Modifica Organizzazione</h1>
      {error && <div className="mb-4 text-red-600">{error}</div>}
      <form onSubmit={handleUpdate} className="space-y-4">
        <label className="block">
          <span className="text-sm font-medium">Nome organizzazione</span>
          <input
            type="text"
            value={nome}
            onChange={e => setNome(e.target.value)}
            className="mt-1 block w-full p-2 border rounded"
            disabled={saving || deleting}
          />
        </label>
        <div className="flex space-x-4">
          <button
            type="submit"
            disabled={saving || deleting}
            className="flex-1 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-50"
          >
            {saving ? 'Salvataggio…' : 'Aggiorna'}
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={saving || deleting}
            className="flex-1 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
          >
            {deleting ? 'Eliminazione…' : 'Elimina'}
          </button>
        </div>
      </form>
    </div>
  )
}