// src/app/dashboard/files/upload/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/hooks/useUser'
import { listOrg } from '@/services/organizzazione'
import { listCommesseByOrg, uploadFile } from '@/services/file'
import type { Organizzazione } from '@/types/organizzazione'

export default function UploadPage() {
  const router = useRouter()
  const { loading } = useUser()

  const [file, setFile]             = useState<File | null>(null)
  const [orgs, setOrgs]             = useState<Organizzazione[]>([])
  const [orgId, setOrgId]           = useState<number | null>(null)
  const [commesse, setCommesse]     = useState<string[]>([])
  const [commessa, setCommessa]     = useState('')
  const [isNewCommessa, setIsNew]   = useState(false)
  const [newCommessa, setNewComm]   = useState('')
  const [descrizione, setDescrizione] = useState('')
  const [error, setError]           = useState<string | null>(null)
  const [saving, setSaving]         = useState(false)

  // 1) load orgs
  useEffect(() => {
    if (!loading) listOrg().then(setOrgs).catch(console.error)
  }, [loading])

  // 2) when org changes, reload commesse
  useEffect(() => {
    if (orgId !== null) {
      listCommesseByOrg(orgId)
        .then(setCommesse)
        .catch(() => setCommesse([]))
      setCommessa('')
      setIsNew(false)
      setNewComm('')
    } else {
      setCommesse([])
      setCommessa('')
      setIsNew(false)
      setNewComm('')
    }
  }, [orgId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!file)          return setError('Seleziona un file')
    if (!orgId)         return setError("Seleziona un'organizzazione")
    // either existing or new commessa
    if (!commessa && !isNewCommessa)  return setError('Seleziona o crea una commessa')
    if (isNewCommessa && !newCommessa.trim()) return setError('Inserisci il nome della nuova commessa')

    const finalCommessa = isNewCommessa ? newCommessa.trim() : commessa

    setSaving(true)
    try {
      await uploadFile(file, finalCommessa, descrizione || null, orgId)
      router.push('/dashboard/files')
    } catch (err: unknown) {
      console.error(err)
      if (err instanceof Error) {
        setError(err.message || 'Errore in upload')
      } else {
        setError('Errore in upload')
      }
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p>Caricamento…</p>

  return (
    <div className="p-8 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-6">Carica File</h1>
      {error && <div className="mb-4 text-red-600">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Organizzazione */}
        <div>
          <label className="block mb-1">Organizzazione</label>
          <select
            className="w-full p-2 border rounded"
            value={orgId ?? ''}
            onChange={e => setOrgId(Number(e.target.value) || null)}
            disabled={saving}
          >
            <option value="">Seleziona...</option>
            {orgs.map(o =>
              <option key={o.id} value={o.id}>{o.nome}</option>
            )}
          </select>
        </div>

        {/* Commessa: esistente o nuova */}
        <div>
          <label className="block mb-1">Commessa</label>
          {!isNewCommessa ? (
            <div className="flex gap-2">
              <select
                className="flex-1 p-2 border rounded"
                value={commessa}
                onChange={e => setCommessa(e.target.value)}
                disabled={saving || orgId === null}
              >
                <option value="">Seleziona...</option>
                {commesse.map(c =>
                  <option key={c} value={c}>{c}</option>
                )}
              </select>
              <button
                type="button"
                onClick={() => setIsNew(true)}
                className="px-3 bg-gray-200 rounded"
                disabled={saving}
              >
                + Nuova
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                className="flex-1 p-2 border rounded"
                placeholder="Nome nuova commessa"
                value={newCommessa}
                onChange={e => setNewComm(e.target.value)}
                disabled={saving}
              />
              <button
                type="button"
                onClick={() => { setIsNew(false); setNewComm('') }}
                className="px-3 bg-red-200 rounded"
                disabled={saving}
              >
                Annulla
              </button>
            </div>
          )}
        </div>

        {/* Descrizione */}
        <div>
          <label className="block mb-1">Descrizione (opzionale)</label>
          <textarea
            className="w-full p-2 border rounded"
            value={descrizione}
            onChange={e => setDescrizione(e.target.value)}
            disabled={saving}
          />
        </div>

        {/* File input */}
        <div>
          <label className="block mb-1">File (.stl, .step)</label>
          <input
            type="file"
            accept=".stl,.step"
            onChange={e => setFile(e.target.files?.[0] || null)}
            disabled={saving}
            className="block"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
        >
          {saving ? 'Caricamento…' : 'Carica'}
        </button>
      </form>
    </div>
  )
}