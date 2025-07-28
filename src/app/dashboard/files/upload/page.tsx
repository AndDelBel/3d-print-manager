// src/app/dashboard/files/upload/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/hooks/useUser'
import { listOrg } from '@/services/organizzazione'
import { listCommesse, createCommessa } from '@/services/commessa'
import { uploadFileOrigine } from '@/services/fileOrigine'
import type { Organizzazione } from '@/types/organizzazione'
import type { Commessa } from '@/types/commessa'
import { AlertMessage } from '@/components/AlertMessage'
import { LoadingButton } from '@/components/LoadingButton'

export default function UploadPage() {
  const router = useRouter()
  const { loading, user } = useUser()

  const [file, setFile] = useState<File | null>(null)
  const [orgs, setOrgs] = useState<Organizzazione[]>([])
  const [orgId, setOrgId] = useState<number | undefined>(undefined)
  const [commesse, setCommesse] = useState<Commessa[]>([])
  const [commessaId, setCommessaId] = useState<number | undefined>(undefined)
  const [isNewCommessa, setIsNew] = useState(false)
  const [newCommessa, setNewComm] = useState('')
  const [descrizione, setDescrizione] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)

  // Carica organizzazioni
  useEffect(() => {
    if (!loading && user) {
      listOrg({ userId: user.id, isSuperuser: user.is_superuser }).then(setOrgs).catch(console.error)
    }
  }, [loading, user])

  // Seleziona automaticamente l'organizzazione se l'utente non è superuser e ha una sola organizzazione
  useEffect(() => {
    if (!user?.is_superuser && orgs.length === 1 && !orgId) {
      setOrgId(orgs[0].id)
    }
  }, [user?.is_superuser, orgs, orgId])

  // Carica commesse per organizzazione
  useEffect(() => {
    if (orgId !== undefined) {
      listCommesse({ organizzazione_id: orgId, isSuperuser: user?.is_superuser }).then(commesse => {
        setCommesse(commesse)
      }).catch(err => {
        console.error('Errore caricamento commesse:', err)
        setCommesse([])
      })
      setCommessaId(undefined)
      setIsNew(false)
      setNewComm('')
    } else {
      setCommesse([])
      setCommessaId(undefined)
      setIsNew(false)
      setNewComm('')
    }
  }, [orgId, user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    if (!file) return setError('Seleziona un file')
    if (!orgId) return setError("Seleziona un'organizzazione")
    if (!commessaId && !isNewCommessa) return setError('Seleziona o crea una commessa')
    if (isNewCommessa && !newCommessa.trim()) return setError('Inserisci il nome della nuova commessa')

    let finalCommessaId = commessaId
    if (isNewCommessa && newCommessa.trim()) {
      setSaving(true)
      try {
        await createCommessa(newCommessa.trim(), orgId)
        const commesseAgg = await listCommesse({ organizzazione_id: orgId, isSuperuser: user?.is_superuser })
        setCommesse(commesseAgg)
        finalCommessaId = commesseAgg.find(c => c.nome === newCommessa.trim())?.id
        setCommessaId(finalCommessaId)
        setIsNew(false)
        setNewComm('')
      } catch (err) {
        setSaving(false)
        setError('Errore creazione commessa')
        return
      }
    }
    if (!finalCommessaId) {
      setError('Commessa non trovata')
      setSaving(false)
      return
    }
    setSaving(true)
    try {
      await uploadFileOrigine(file, finalCommessaId, descrizione || null)
      setSuccess('File caricato con successo!')
      setTimeout(() => router.push('/dashboard/files'), 1000)
    } catch (err: unknown) {
      console.error(err)
      setError('Errore in upload')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-6">Carica File</h1>
      {error && <AlertMessage type="error" message={error} onClose={() => setError(null)} />}
      {success && <AlertMessage type="success" message={success} onClose={() => setSuccess(null)} />}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Organizzazione */}
        {(user?.is_superuser || orgs.length > 1) && (
          <div className="form-control">
            <label className="label">
              <span className="label-text">Organizzazione</span>
            </label>
            <select
              className="select select-bordered w-full"
              value={orgId ?? ''}
              onChange={e => setOrgId(Number(e.target.value) || undefined)}
              disabled={saving}
            >
              <option value="">Seleziona...</option>
              {orgs.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
            </select>
          </div>
        )}
        
        {/* Messaggio informativo per utenti con una sola organizzazione */}
        {!user?.is_superuser && orgs.length === 1 && orgId && (
          <div className="alert alert-info">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span>Organizzazione selezionata automaticamente: <strong>{orgs.find(o => o.id === orgId)?.nome}</strong></span>
          </div>
        )}
        
        {/* Messaggio quando non ci sono commesse disponibili */}
        {orgId && commesse.length === 0 && (
          <div className="alert alert-warning">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span>Nessuna commessa disponibile per questa organizzazione. Crea una nuova commessa per procedere.</span>
          </div>
        )}
        {/* Commessa: esistente o nuova */}
        <div className="form-control">
          <label className="label">
            <span className="label-text">Commessa</span>
          </label>
          {!isNewCommessa ? (
            <div className="flex gap-2">
              <select
                className="select select-bordered flex-1"
                value={commessaId ?? ''}
                onChange={e => setCommessaId(Number(e.target.value) || undefined)}
                disabled={saving || orgId === undefined || commesse.length === 0}
              >
                <option value="">Seleziona...</option>
                {commesse.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
              <button
                type="button"
                onClick={() => setIsNew(true)}
                className="btn btn-outline"
                disabled={saving}
              >
                + Nuova
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                className="input input-bordered flex-1"
                placeholder="Nome nuova commessa"
                value={newCommessa}
                onChange={e => setNewComm(e.target.value)}
                disabled={saving}
              />
              <button
                type="button"
                onClick={() => { setIsNew(false); setNewComm('') }}
                className="btn btn-error btn-outline"
                disabled={saving}
              >
                Annulla
              </button>
            </div>
          )}
        </div>
        {/* Descrizione */}
        <div className="form-control">
          <label className="label">
            <span className="label-text">Descrizione (opzionale)</span>
          </label>
          <textarea
            className="textarea textarea-bordered w-full"
            value={descrizione}
            onChange={e => setDescrizione(e.target.value)}
            disabled={saving}
          />
        </div>
        {/* File input */}
        <div className="form-control">
          <label className="label">
            <span className="label-text">File (.stl, .step)</span>
          </label>
          <input
            type="file"
            accept=".stl,.step"
            onChange={e => setFile(e.target.files?.[0] || null)}
            disabled={saving}
            className="file-input file-input-bordered w-full"
          />
        </div>
        <LoadingButton
          type="submit"
          loading={saving}
          loadingText="Caricamento…"
          className="btn btn-success w-full"
        >
          Carica
        </LoadingButton>
      </form>
    </div>
  )
}