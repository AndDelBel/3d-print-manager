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

  const [file, setFile] = useState<File | null>(null)
  const [commesse, setCommesse] = useState<string[]>([])
  const [commessa, setCommessa] = useState('')
  const [descrizione, setDescrizione] = useState('')
  const [orgs, setOrgs] = useState<Organizzazione[]>([])
  const [orgId, setOrgId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Carica le organizzazioni all’avvio
  useEffect(() => {
    if (!loading) {
      listOrg().then(setOrgs).catch(console.error)
    }
  }, [loading])

  // Ogni volta che cambia orgId, carica le commesse relative
  useEffect(() => {
    if (orgId !== null) {
      listCommesseByOrg(orgId)
        .then(setCommesse)
        .catch(err => {
          console.error('Errore caricamento commesse:', err)
          setCommesse([])
        })
    } else {
      setCommesse([])
      setCommessa('')
    }
  }, [orgId])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    if (!file)          return setError('Seleziona un file')
    if (!orgId)         return setError("Seleziona un'organizzazione")
    if (!commessa)      return setError('Seleziona una commessa')
    
    setSaving(true)
    try {
      await uploadFile(file, commessa, descrizione || null, orgId)
      router.push('/dashboard/files')
    } catch (err: unknown) {
      console.error(err)
      setError(err instanceof Error ? err.message : String(err))
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
            onChange={e => setOrgId(Number(e.target.value))}
            disabled={saving}
          >
            <option value="">Seleziona...</option>
            {orgs.map(o =>
              <option key={o.id} value={o.id}>{o.nome}</option>
            )}
          </select>
        </div>

        {/* Commessa filtrata */}
        <div>
          <label className="block mb-1">Commessa</label>
          <select
            className="w-full p-2 border rounded"
            value={commessa}
            onChange={e => setCommessa(e.target.value)}
            disabled={saving || orgId === null}
          >
            <option value="">Seleziona...</option>
            {commesse.map(c =>
              <option key={c} value={c}>{c}</option>
            )}
          </select>
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