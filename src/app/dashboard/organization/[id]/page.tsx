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
import { AlertMessage } from '@/components/AlertMessage'
import { LoadingButton } from '@/components/LoadingButton'
import { ConfirmModal } from '@/components/ConfirmModal'

export default function OrgDetailPage() {
  const { loading, user } = useUser()
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const [org, setOrg] = useState<Organizzazione | null>(null)
  const [nome, setNome] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [canEdit, setCanEdit] = useState(false)

  // carica i dettagli
  useEffect(() => {
    if (!loading && id && user) {
      getOrgById(Number(id))
        .then(o => {
          setOrg(o)
          setNome(o.nome)
          // Permetti modifica solo se superuser o admin di questa org
          setCanEdit(user.is_superuser || o.is_admin)
        })
        .catch(err => {
          console.error('Errore fetch org:', err)
        })
    }
  }, [loading, id, user])

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
    setDeleting(true)
    setError(null)
    setSuccess(null)
    try {
      await deleteOrg(org.id)
      setSuccess('Organizzazione eliminata con successo!')
      setTimeout(() => router.push('/dashboard/organization'), 1000)
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message)
      else setError(String(err))
    } finally {
      setDeleting(false)
      setConfirmOpen(false)
    }
  }

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-6">Modifica Organizzazione</h1>
      {error && <AlertMessage type="error" message={error} onClose={() => setError(null)} />}
      {success && <AlertMessage type="success" message={success} onClose={() => setSuccess(null)} />}
      <form onSubmit={handleUpdate} className="space-y-4">
        <label className="block">
          <span className="text-sm font-medium">Nome organizzazione</span>
          <input
            type="text"
            value={nome}
            onChange={e => setNome(e.target.value)}
            className="mt-1 block w-full p-2 border rounded"
            disabled={saving || deleting || !canEdit}
          />
        </label>
        <div className="flex space-x-4">
          <LoadingButton
            type="submit"
            loading={saving}
            loadingText="Salvataggio…"
            className="flex-1 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-50"
            disabled={!canEdit}
          >
            {saving ? 'Salvataggio…' : 'Aggiorna'}
          </LoadingButton>
          <LoadingButton
            type="button"
            loading={deleting}
            loadingText="Eliminazione…"
            onClick={() => setConfirmOpen(true)}
            className="flex-1 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
            disabled={!canEdit}
          >
            {deleting ? 'Eliminazione…' : 'Elimina'}
          </LoadingButton>
        </div>
      </form>
      <ConfirmModal
        open={confirmOpen}
        title="Conferma eliminazione"
        message="Sei sicuro di voler eliminare questa organizzazione?"
        confirmText="Elimina"
        cancelText="Annulla"
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  )
}