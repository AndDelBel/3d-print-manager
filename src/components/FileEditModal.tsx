'use client'

import { useState, useEffect } from 'react'
import { listCommesse } from '@/services/commessa'
import { listOrg } from '@/services/organizzazione'
import { updateFileOrigine, replaceFileOrigine } from '@/services/fileOrigine'
import type { FileOrigine } from '@/types/fileOrigine'
import type { Commessa } from '@/types/commessa'
import type { Organizzazione } from '@/types/organizzazione'
import { AlertMessage } from '@/components/AlertMessage'
import { LoadingButton } from '@/components/LoadingButton'

interface FileEditModalProps {
  file: FileOrigine | null
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  isSuperuser: boolean
  descriptionOnlyMode?: boolean
}

export function FileEditModal({ file, isOpen, onClose, onSuccess, isSuperuser, descriptionOnlyMode = false }: FileEditModalProps) {
  const [commesse, setCommesse] = useState<Commessa[]>([])
  const [organizzazioni, setOrganizzazioni] = useState<Organizzazione[]>([])
  const [selectedCommessaId, setSelectedCommessaId] = useState<number>(file?.commessa_id || 0)
  const [descrizione, setDescrizione] = useState<string>(file?.descrizione || '')
  const [newFile, setNewFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Carica commesse e organizzazioni
  useEffect(() => {
    if (isOpen) {
      listCommesse({ isSuperuser }).then(setCommesse).catch(console.error)
      listOrg({ isSuperuser }).then(setOrganizzazioni).catch(console.error)
    }
  }, [isOpen, isSuperuser])

  // Reset form quando cambia il file
  useEffect(() => {
    if (file) {
      setSelectedCommessaId(file.commessa_id)
      setDescrizione(file.descrizione || '')
      setNewFile(null)
    }
  }, [file])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      // In modalità solo descrizione, aggiorna solo la descrizione
      if (descriptionOnlyMode) {
        await updateFileOrigine(file.id, {
          descrizione: descrizione || null,
        })
      } else {
        // Aggiorna i dati del file
        await updateFileOrigine(file.id, {
          commessa_id: selectedCommessaId,
          descrizione: descrizione || null,
        })

        // Se è stato selezionato un nuovo file, sostituiscilo
        if (newFile) {
          await replaceFileOrigine(file.id, newFile)
        }
      }

      setSuccess('File aggiornato con successo!')
      setTimeout(() => {
        onSuccess()
        onClose()
      }, 1000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore durante l\'aggiornamento del file')
    } finally {
      setLoading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setNewFile(file)
    }
  }

  if (!isOpen || !file) return null

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-2xl">
        <h3 className="font-bold text-lg mb-4">Modifica File</h3>
        
        {descriptionOnlyMode && (
          <div className="alert alert-info mb-4">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Puoi modificare solo la descrizione perché il file ha ordini con stato diverso da &quot;processamento&quot;</span>
          </div>
        )}
        
        {error && <AlertMessage type="error" message={error} onClose={() => setError(null)} />}
        {success && <AlertMessage type="success" message={success} onClose={() => setSuccess(null)} />}

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Informazioni file corrente */}
            <div className="card bg-base-200 p-4">
              <h4 className="font-semibold mb-2">File Corrente</h4>
              <p><strong>Nome:</strong> {file.nome_file.split('/').pop() || file.nome_file}</p>
              <p><strong>Tipo:</strong> {file.tipo.toUpperCase()}</p>
              <p><strong>Data caricamento:</strong> {new Date(file.data_caricamento).toLocaleDateString()}</p>
            </div>

            {!descriptionOnlyMode && (
              <>
                {/* Sostituzione file */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Sostituisci File STL</span>
                  </label>
                  <input
                    type="file"
                    accept=".stl,.obj"
                    onChange={handleFileChange}
                    className="file-input file-input-bordered w-full"
                    disabled={loading}
                  />
                  <label className="label">
                    <span className="label-text-alt">Lascia vuoto per mantenere il file corrente</span>
                  </label>
                </div>

                {/* Commessa */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Commessa</span>
                  </label>
                  <select
                    value={selectedCommessaId}
                    onChange={(e) => setSelectedCommessaId(Number(e.target.value))}
                    className="select select-bordered w-full"
                    disabled={loading}
                    required
                  >
                    <option value="">Seleziona commessa</option>
                    {commesse.map(commessa => {
                      const org = organizzazioni.find(o => o.id === commessa.organizzazione_id)
                      return (
                        <option key={commessa.id} value={commessa.id}>
                          {org ? `${org.nome} - ` : ''}{commessa.nome}
                        </option>
                      )
                    })}
                  </select>
                </div>
              </>
            )}

            {/* Descrizione */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Descrizione</span>
              </label>
              <textarea
                value={descrizione}
                onChange={(e) => setDescrizione(e.target.value)}
                className="textarea textarea-bordered h-24"
                placeholder="Inserisci una descrizione del file..."
                disabled={loading}
              />
            </div>
          </div>

          <div className="modal-action">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-ghost"
              disabled={loading}
            >
              Annulla
            </button>
            <LoadingButton
              type="submit"
              loading={loading}
              className="btn btn-primary"
            >
              Salva Modifiche
            </LoadingButton>
          </div>
        </form>
      </div>
    </div>
  )
} 