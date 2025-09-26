// src/app/dashboard/orders/create/page.tsx
'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useUser } from '@/hooks/useUser'
import { listGcode } from '@/services/gcode'
import { createOrder, checkOrdineTableExists, createOrdineTable } from '@/services/ordine'
import { CascadingFilters } from '@/components/CascadingFilters'
import { AlertMessage } from '@/components/AlertMessage'
import { LoadingButton } from '@/components/LoadingButton'

function CreateOrderContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { loading, user } = useUser()

  const [selectedOrg, setSelectedOrg] = useState<number | undefined>(undefined)
  const [selectedCommessa, setSelectedCommessa] = useState<number | undefined>(undefined)
  const [selectedFile, setSelectedFile] = useState<number | undefined>(undefined)
  const [quantita, setQuantita] = useState<number>(1)
  const [dataConsegna, setDataConsegna] = useState<string>('')
  const [note, setNote] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [tableExists, setTableExists] = useState<boolean | null>(null)

  const isSuperuser = user?.is_superuser

  // Gestisci parametri URL per precompilare i campi
  useEffect(() => {
    if (!loading && user) {
      const orgParam = searchParams.get('org')
      const commessaParam = searchParams.get('commessa')
      const fileParam = searchParams.get('file')

      if (orgParam) {
        setSelectedOrg(Number(orgParam))
      }
      if (commessaParam) {
        setSelectedCommessa(Number(commessaParam))
      }
      if (fileParam) {
        setSelectedFile(Number(fileParam))
      }
    }
  }, [loading, user, searchParams])

  // Verifica tabella ordine
  useEffect(() => {
    if (!loading && user) {
      checkOrdineTableExists().then(exists => {
        setTableExists(exists)
        if (!exists) {
          setError('La tabella ordine non esiste nel database.')
        } else {
          setError(null)
        }
      }).catch(err => {
        console.error('Errore verifica tabella ordine:', err)
        setError('Errore nella verifica del database')
        setTableExists(false)
      })
    }
  }, [loading, user])

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
      // Verifica se esiste un G-code associato al file selezionato
      const gcodes = await listGcode({ file_origine_id: selectedFile })
      const gcodeId = gcodes.length > 0 ? gcodes[0].id : null
      
      await createOrder(
        gcodeId,
        selectedFile,
        quantita,
        dataConsegna || null,
        note || null,
        selectedOrg,
        user?.id
      )
      
      const successMessage = gcodeId 
        ? 'Ordine creato con successo!'
        : 'Ordine creato con successo! Il G-code potrà essere associato successivamente.'
      setSuccess(successMessage)
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
        {/* Filtri a cascata */}
        <CascadingFilters
          isSuperuser={isSuperuser || false}
          userId={user?.id}
          selectedOrg={selectedOrg}
          selectedCommessa={selectedCommessa}
          selectedFile={selectedFile}
          onOrgChange={setSelectedOrg}
          onCommessaChange={setSelectedCommessa}
          onFileChange={setSelectedFile}
          showFileFilter={true}
          disabled={saving}
        />

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

export default function CreateOrderPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center min-h-[400px]">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    }>
      <CreateOrderContent />
    </Suspense>
  )
}