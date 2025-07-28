// src/app/dashboard/orders/create/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/hooks/useUser'
import { listOrg } from '@/services/organizzazione'
import { listCommesse } from '@/services/commessa'
import { listFileOrigine } from '@/services/fileOrigine'
import { listGcode } from '@/services/gcode'
import { createOrder, checkOrdineTableExists, createOrdineTable } from '@/services/ordine'
import type { Organizzazione } from '@/types/organizzazione'
import type { Commessa } from '@/types/commessa'
import type { FileOrigine } from '@/types/fileOrigine'
import type { Gcode } from '@/types/gcode'
import { AlertMessage } from '@/components/AlertMessage'
import { LoadingButton } from '@/components/LoadingButton'

export default function CreateOrderPage() {
  const router = useRouter()
  const { loading, user } = useUser()

  const [orgs, setOrgs] = useState<Organizzazione[]>([])
  const [selectedOrg, setSelectedOrg] = useState<number | undefined>(undefined)
  const [commesse, setCommesse] = useState<Commessa[]>([])
  const [selectedCommessa, setSelectedCommessa] = useState<number | undefined>(undefined)
  const [files, setFiles] = useState<FileOrigine[]>([])
  const [selectedFile, setSelectedFile] = useState<number | undefined>(undefined)
  const [quantita, setQuantita] = useState<number>(1)
  const [dataConsegna, setDataConsegna] = useState<string>('')
  const [note, setNote] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [tableExists, setTableExists] = useState<boolean | null>(null)

  // Carica organizzazioni e verifica tabella ordine
  useEffect(() => {
    if (!loading && user) {
      listOrg({ userId: user.id, isSuperuser: user.is_superuser }).then(setOrgs).catch(console.error)
      
      // Verifica se la tabella ordine esiste
      checkOrdineTableExists().then(exists => {
        setTableExists(exists)
        if (!exists) {
          setError('La tabella ordine non esiste nel database.')
        }
      }).catch(err => {
        console.error('Errore verifica tabella ordine:', err)
        setError('Errore nella verifica del database')
        setTableExists(false)
      })
    }
  }, [loading, user])

  // Al cambio org, carica commesse
  useEffect(() => {
    if (selectedOrg !== undefined) {
      listCommesse({ organizzazione_id: selectedOrg, isSuperuser: user?.is_superuser }).then(setCommesse).catch(() => setCommesse([]))
      setSelectedCommessa(undefined)
      setFiles([])
      setSelectedFile(undefined)
    }
  }, [selectedOrg, user])

  // Al cambio commessa, carica file origine
  useEffect(() => {
    if (selectedCommessa !== undefined) {
      listFileOrigine({ 
        commessa_id: selectedCommessa, 
        isSuperuser: user?.is_superuser 
      })
        .then(setFiles)
        .catch(() => setFiles([]))
      setSelectedFile(undefined)
    }
  }, [selectedCommessa, user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    if (!selectedOrg)      return setError("Seleziona un'organizzazione")
    if (!selectedCommessa) return setError('Seleziona una commessa')
    if (!selectedFile)     return setError('Seleziona un file')
    if (quantita < 1)      return setError('Quantità non valida')
    setSaving(true)
    try {
      // Trova il G-code associato al file selezionato
      const gcodes = await listGcode({ file_origine_id: selectedFile, isSuperuser: user?.is_superuser })
      if (gcodes.length === 0) {
        setError('Il file non è ancora stato revisionato, non è disponibile per ordini automatici.')
        setSaving(false)
        return
      }
      
      // Usa il primo G-code disponibile
      const gcodeId = gcodes[0].id
      
      await createOrder(
        gcodeId,
        quantita,
        dataConsegna || null,
        note || null,
        selectedOrg,
        user?.id
      )
      setSuccess('Ordine creato con successo!')
      setTimeout(() => router.push('/dashboard/orders'), 1000)
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message)
      else if (typeof err === 'string') setError(err)
      else setError('Errore durante la creazione')
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

  // Se la tabella non esiste, mostra un pulsante per crearla
  if (tableExists === false) {
    return (
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold mb-6">Nuovo Ordine</h1>
        {error && <AlertMessage type="error" message={error} onClose={() => setError(null)} />}
        <div className="text-center">
          <p className="mb-4 text-error">La tabella ordine non esiste nel database.</p>
          <LoadingButton
            loading={false}
            onClick={async () => {
              try {
                await createOrdineTable()
                setTableExists(true)
                setError(null)
                setSuccess('Tabella ordine creata con successo!')
              } catch (err) {
                setError('Errore nella creazione della tabella')
                console.error(err)
              }
            }}
            className="btn btn-primary"
          >
            Crea Tabella Ordine
          </LoadingButton>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-6">Nuovo Ordine</h1>
      {error && <AlertMessage type="error" message={error} onClose={() => setError(null)} />}
      {success && <AlertMessage type="success" message={success} onClose={() => setSuccess(null)} />}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Organizzazione */}
        <div className="form-control">
          <label className="label">
            <span className="label-text">Organizzazione</span>
          </label>
          <select
            className="select select-bordered w-full"
            value={selectedOrg ?? ''}
            onChange={e => setSelectedOrg(Number(e.target.value) || undefined)}
            disabled={saving}
          >
            <option value="">Seleziona...</option>
            {orgs.map(o => (
              <option key={o.id} value={o.id}>{o.nome}</option>
            ))}
          </select>
        </div>
        {/* Commessa */}
        <div className="form-control">
          <label className="label">
            <span className="label-text">Commessa</span>
          </label>
          <select
            className="select select-bordered w-full"
            value={selectedCommessa ?? ''}
            onChange={e => setSelectedCommessa(Number(e.target.value) || undefined)}
            disabled={saving || !selectedOrg}
          >
            <option value="">Seleziona...</option>
            {commesse.map(c => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>
        </div>
        {/* File origine */}
        <div className="form-control">
          <label className="label">
            <span className="label-text">File disponibile</span>
          </label>
          <select
            className="select select-bordered w-full"
            value={selectedFile ?? ''}
            onChange={e => setSelectedFile(Number(e.target.value) || undefined)}
            disabled={saving || !selectedCommessa}
          >
            <option value="">Seleziona...</option>
            {files.map(f => (
              <option key={f.id} value={f.id}>{f.nome_file.split('/').pop() || f.nome_file}</option>
            ))}
          </select>
        </div>
        {files.length === 0 && (
          <div className="text-sm text-error">Nessun file disponibile per questa commessa.</div>
        )}
        {/* Quantità */}
        <div className="form-control">
          <label className="label">
            <span className="label-text">Quantità</span>
          </label>
          <input
            type="number"
            min="1"
            className="input input-bordered w-full"
            value={quantita}
            onChange={e => setQuantita(Number(e.target.value))}
            disabled={saving}
          />
        </div>
        <div className="form-control">
          <label className="label">
            <span className="label-text">Data consegna richiesta (opzionale)</span>
          </label>
          <input
            type="date"
            className="input input-bordered w-full"
            value={dataConsegna}
            onChange={e => setDataConsegna(e.target.value)}
            disabled={saving}
          />
        </div>
        <div className="form-control">
          <label className="label">
            <span className="label-text">Note (opzionale)</span>
          </label>
          <textarea
            className="textarea textarea-bordered w-full"
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Note aggiuntive per l'ordine..."
            rows={3}
            disabled={saving}
          />
        </div>
        <LoadingButton
          type="submit"
          loading={saving}
          loadingText="Salvataggio…"
          className="btn btn-success w-full"
        >
          Crea Ordine
        </LoadingButton>
      </form>
    </div>
  )
}