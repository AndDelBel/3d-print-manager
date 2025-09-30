'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { listOrdersByFileOrigine } from '@/services/ordine'
import { listGcode, getGcodeDownloadUrl, uploadGcode, deleteGcode } from '@/services/gcode'
import { listFileOrigineByIds, setGcodePrincipale, getGcodePrincipale, getFileOrigineDownloadUrl, canFileBeModified } from '@/services/fileOrigine'
import { listCommesse } from '@/services/commessa'
import { listOrg } from '@/services/organizzazione'
import { getUtentiByIds } from '@/services/utente'
import { useUser } from '@/hooks/useUser'
import type { FileOrigine } from '@/types/fileOrigine'
import type { Gcode } from '@/types/gcode'
import type { Ordine } from '@/types/ordine'
import type { Commessa } from '@/types/commessa'
import type { Organizzazione } from '@/types/organizzazione'
import type { Utente } from '@/types/utente'
import { AlertMessage } from '@/components/AlertMessage'
import { ConfirmModal } from '@/components/ConfirmModal'
import { FileEditModal } from '@/components/FileEditModal'
import { updateOrderGcode, updateOrderStatus } from '@/services/ordine'

export default function FileDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user, loading } = useUser()
  const [file, setFile] = useState<FileOrigine | null>(null)
  const [gcodes, setGcodes] = useState<Gcode[]>([])
  const [orders, setOrders] = useState<Ordine[]>([])
  const [commessa, setCommessa] = useState<Commessa | null>(null)
  const [org, setOrg] = useState<Organizzazione | null>(null)
  const [utenti, setUtenti] = useState<Map<string, Utente>>(new Map())
  const [uploading, setUploading] = useState(false)
  const [mainGcodeId, setMainGcodeId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [deleteGcodeTarget, setDeleteGcodeTarget] = useState<Gcode | null>(null)
  const [editingGcodeOrderId, setEditingGcodeOrderId] = useState<number | null>(null)
  const [inlineGcodeValue, setInlineGcodeValue] = useState<number | undefined>(undefined)
  const [inlineGcodeLoading, setInlineGcodeLoading] = useState(false)
  const [editingStatusOrderId, setEditingStatusOrderId] = useState<number | null>(null)
  const [inlineStatusValue, setInlineStatusValue] = useState<string | undefined>(undefined)
  const [inlineStatusLoading, setInlineStatusLoading] = useState(false)
  const [canEdit, setCanEdit] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)

  const isSuperuser = user?.is_superuser

  useEffect(() => {
    if (!id) return
    // Carica file origine
    listFileOrigineByIds([Number(id)]).then(arr => {
      setFile(arr[0] || null)
    }).catch(err => {
      setError('Errore caricamento file')
      console.error(err)
    })
  }, [id])

  useEffect(() => {
    if (file) {
      // Carica commessa
      listCommesse({ isSuperuser: true }).then(commesse => {
        setCommessa(commesse.find(c => c.id === file.commessa_id) || null)
      }).catch(err => {
        console.error('Errore caricamento commessa:', err)
      })
      
      // Carica ordini associati
      listOrdersByFileOrigine(file.id).then(setOrders).catch(err => {
        console.error('Errore caricamento ordini:', err)
      })
      
      // Carica gcode associati
      listGcode({ file_origine_id: file.id }).then(setGcodes).catch(err => {
        console.error('Errore caricamento G-code:', err)
      })
      
      // Carica G-code principale
      getGcodePrincipale(file.id).then(setMainGcodeId).catch(err => {
        console.error('Errore caricamento G-code principale:', err)
      })

      // Verifica se il file può essere modificato
      canFileBeModified(file.id).then(setCanEdit).catch(err => {
        console.error('Errore verifica modificabilità file:', err)
        setCanEdit(false)
      })
    }
  }, [file])

  useEffect(() => {
    if (commessa) {
      listOrg({ isSuperuser: true }).then(orgs => {
        setOrg(orgs.find(o => o.id === commessa.organizzazione_id) || null)
      }).catch(err => {
        console.error('Errore caricamento organizzazione:', err)
      })
    }
  }, [commessa])

  // Carica dati utenti per gli ordini
  useEffect(() => {
    if (orders.length > 0) {
      const userIds = [...new Set(orders.map(o => o.user_id))]
      getUtentiByIds(userIds).then(setUtenti).catch(err => {
        console.error('Errore caricamento utenti:', err)
      })
    }
  }, [orders])

  const handleDownload = async (gcode: Gcode) => {
    try {
      const url = await getGcodeDownloadUrl(gcode.nome_file)
      window.open(url, '_blank')
    } catch (err) {
      setError('Errore download G-code')
      console.error(err)
    }
  }

  const handleDownloadStl = async () => {
    if (!file) return
    try {
      const url = await getFileOrigineDownloadUrl(file.nome_file)
      window.open(url, '_blank')
    } catch (err) {
      setError('Errore download file STL')
      console.error(err)
    }
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!file || !e.target.files?.[0]) return
    setUploading(true)
    setError(null)
    setSuccess(null)
    try {
      await uploadGcode(e.target.files[0], file.id, {})
      const newGcodes = await listGcode({ file_origine_id: file.id })
      setGcodes(newGcodes)
      setSuccess('G-code caricato con successo!')
      // Se è il primo G-code, impostalo come principale
      if (newGcodes.length === 1 && !mainGcodeId) {
        await handleSetMainGcode(newGcodes[0].id)
      }
    } catch (err) {
      setError('Errore caricamento G-code')
      console.error(err)
    } finally {
      setUploading(false)
    }
  }

  const handleSetMainGcode = async (gcodeId: number) => {
    if (!file) return
    setError(null)
    setSuccess(null)
    try {
      await setGcodePrincipale(file.id, gcodeId)
      setMainGcodeId(gcodeId)
      setSuccess('G-code principale aggiornato!')
    } catch (err) {
      setError('Errore aggiornamento G-code principale')
      console.error(err)
    }
  }

  const handleDeleteGcode = async () => {
    if (!deleteGcodeTarget || !file) return
    setError(null)
    setSuccess(null)
    try {
      await deleteGcode(deleteGcodeTarget.id)
      const newGcodes = await listGcode({ file_origine_id: file.id })
      setGcodes(newGcodes)
      
      // Se il G-code eliminato era quello principale, rimuovi il riferimento
      if (mainGcodeId === deleteGcodeTarget.id) {
        await setGcodePrincipale(file.id, null)
        setMainGcodeId(null)
      }
      
      setSuccess('G-code eliminato con successo!')
    } catch (err) {
      setError('Errore eliminazione G-code')
      console.error(err)
    } finally {
      setDeleteGcodeTarget(null)
    }
  }

  const handleInlineGcodeChange = async (ordineId: number) => {
    if (!inlineGcodeValue) return
    setInlineGcodeLoading(true)
    setError(null)
    setSuccess(null)
    try {
      await updateOrderGcode(ordineId, inlineGcodeValue)
      const updatedOrders = await listOrdersByFileOrigine(file!.id)
      setOrders(updatedOrders)
      setSuccess('G-code dell\'ordine aggiornato con successo!')
      setEditingGcodeOrderId(null)
      setInlineGcodeValue(undefined)
    } catch (err) {
      setError('Errore aggiornamento G-code ordine')
      console.error('Errore aggiornamento G-code ordine:', err)
    } finally {
      setInlineGcodeLoading(false)
    }
  }

  const handleInlineStatusChange = async (ordineId: number) => {
    if (!inlineStatusValue) return
    setInlineStatusLoading(true)
    setError(null)
    setSuccess(null)
    try {
      await updateOrderStatus(ordineId, inlineStatusValue as Ordine['stato'])
      const updatedOrders = await listOrdersByFileOrigine(file!.id)
      setOrders(updatedOrders)
      setSuccess('Stato dell\'ordine aggiornato con successo!')
      setEditingStatusOrderId(null)
      setInlineStatusValue(undefined)
    } catch (err) {
      setError('Errore aggiornamento stato ordine')
      console.error('Errore aggiornamento stato ordine:', err)
    } finally {
      setInlineStatusLoading(false)
    }
  }

  const handleEditSuccess = async () => {
    // Ricarica i dati del file
    if (id) {
      try {
        const updatedFiles = await listFileOrigineByIds([Number(id)])
        setFile(updatedFiles[0] || null)
        
        // Ricarica anche commessa e organizzazione
        if (updatedFiles[0]) {
          const commesse = await listCommesse({ isSuperuser: true })
          setCommessa(commesse.find(c => c.id === updatedFiles[0].commessa_id) || null)
        }
      } catch (err) {
        console.error('Errore ricaricamento file:', err)
      }
    }
  }

  const getUtenteName = (userId: string) => {
    const utente = utenti.get(userId)
    return utente ? `${utente.nome} ${utente.cognome}` : `Utente ${userId.slice(0, 8)}`
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Dettaglio File</h1>
      {error && <AlertMessage type="error" message={error} onClose={() => setError(null)} />}
      {success && <AlertMessage type="success" message={success} onClose={() => setSuccess(null)} />}
      
      {file ? (
        <>
          {/* Informazioni file */}
          <div className="card bg-base-200 mb-6">
            <div className="card-body">
              <div className="flex justify-between items-start mb-4">
                <h2 className="card-title">Informazioni File</h2>
                <div className="flex gap-2">
                  <button
                    onClick={handleDownloadStl}
                    className="btn btn-primary btn-sm"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Scarica STL
                  </button>
                  {canEdit && (
                    <button
                      onClick={() => setEditModalOpen(true)}
                      className="btn btn-secondary btn-sm"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Modifica
                    </button>
                  )}
                </div>
              </div>
              
              {!canEdit && (
                <div className="alert alert-warning mb-4">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <span>Il file non può essere modificato perché ha ordini associati con stato diverso da &quot;processamento&quot;</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><b>Nome file:</b> 
                  <div className="max-w-xs truncate inline-block" title={file.nome_file.split('/').pop() || file.nome_file}>
                    {file.nome_file.split('/').pop() || file.nome_file}
                  </div>
                </div>
                <div><b>Commessa:</b> {commessa ? commessa.nome : file.commessa_id}</div>
                <div><b>Organizzazione:</b> {org ? org.nome : '-'}</div>
                <div><b>Data caricamento:</b> {new Date(file.data_caricamento).toLocaleDateString()}</div>
                {file.descrizione && (
                  <div className="md:col-span-2">
                    <b>Descrizione:</b> 
                    <div className="mt-1 p-2 bg-base-100 rounded border text-sm">
                      {file.descrizione}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Storico Ordini */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-3">Storico Ordini ({orders.length})</h2>
            {orders.length === 0 ? (
              <p className="text-base-content/70">Nessun ordine associato a questo file.</p>
            ) : (
              <div className="w-full">
                <div className="overflow-x-auto">
                  <table className="table table-zebra w-full min-w-[600px]">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Utente</th>
                      <th>Quantità</th>
                      <th>Data</th>
                      {isSuperuser && <th>G-code</th>}
                      <th>Stato</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map(o => (
                      <tr key={o.id}>
                        <td>#{o.id}</td>
                        <td>{getUtenteName(o.user_id)}</td>
                        <td>{o.quantita}</td>
                        <td>{o.data_ordine.slice(0, 10)}</td>
                        {isSuperuser && (
                          <td>
                            {editingGcodeOrderId === o.id ? (
                              <div className="flex items-center gap-2">
                                <select
                                  value={inlineGcodeValue ?? (o.gcode_id || '')}
                                  onChange={e => setInlineGcodeValue(Number(e.target.value) || undefined)}
                                  className="select select-bordered select-xs"
                                  disabled={inlineGcodeLoading}
                                >
                                  {gcodes.map(gcode => (
                                    <option key={gcode.id} value={gcode.id}>
                                      {gcode.nome_file.split('/').pop() || gcode.nome_file}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  className="btn btn-success btn-xs"
                                  onClick={() => handleInlineGcodeChange(o.id)}
                                  disabled={inlineGcodeLoading || !inlineGcodeValue || inlineGcodeValue === o.gcode_id}
                                >
                                  Salva
                                </button>
                                <button
                                  className="btn btn-ghost btn-xs"
                                  onClick={() => { setEditingGcodeOrderId(null); setInlineGcodeValue(undefined) }}
                                  disabled={inlineGcodeLoading}
                                >
                                  Annulla
                                </button>
                              </div>
                            ) : (
                              <button
                                className="link link-primary text-sm max-w-[150px] truncate"
                                 onClick={() => { setEditingGcodeOrderId(o.id); setInlineGcodeValue(o.gcode_id || undefined) }}
                              >
                                {(() => {
                                  if (!o.gcode_id) return 'Nessun G-code'
                                  const g = gcodes.find(g => g.id === o.gcode_id)
                                  return g ? (g.nome_file.split('/').pop() || g.nome_file) : `G-code ${o.gcode_id}`
                                })()}
                              </button>
                            )}
                          </td>
                        )}
                        <td>
                          {isSuperuser && editingStatusOrderId === o.id ? (
                            <div className="flex items-center gap-2">
                              <select
                                value={inlineStatusValue ?? o.stato}
                                onChange={e => setInlineStatusValue(e.target.value)}
                                className="select select-bordered select-xs"
                                disabled={inlineStatusLoading}
                              >
                                <option value="processamento">processamento</option>
                                <option value="in_coda">in_coda</option>
                                <option value="in_stampa">in_stampa</option>
                                <option value="pronto">pronto</option>
                                <option value="consegnato">consegnato</option>
                                <option value="error">error</option>
                              </select>
                              <button
                                className="btn btn-success btn-xs"
                                onClick={() => handleInlineStatusChange(o.id)}
                                disabled={inlineStatusLoading || !inlineStatusValue || inlineStatusValue === o.stato}
                              >
                                Salva
                              </button>
                              <button
                                className="btn btn-ghost btn-xs"
                                onClick={() => { setEditingStatusOrderId(null); setInlineStatusValue(undefined) }}
                                disabled={inlineStatusLoading}
                              >
                                Annulla
                              </button>
                            </div>
                          ) : (
                            <button
                              className={`badge ${
                                o.stato === 'consegnato' ? 'badge-success' :
                                o.stato === 'pronto' ? 'badge-info' :
                                o.stato === 'in_stampa' ? 'badge-warning' :
                                o.stato === 'in_coda' ? 'badge-primary' :
                                'badge-neutral'
                              } ${isSuperuser ? 'cursor-pointer hover:opacity-80' : ''}`}
                              onClick={() => {
                                if (isSuperuser) {
                                  setEditingStatusOrderId(o.id)
                                  setInlineStatusValue(o.stato)
                                }
                              }}
                              disabled={!isSuperuser}
                            >
                              {o.stato}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </div>
            )}
          </div>

          {/* G-code associati */}
          {isSuperuser && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-3">G-code associati ({gcodes.length})</h2>
              {gcodes.length === 0 ? (
                <p className="text-base-content/70">Nessun G-code associato a questo file.</p>
              ) : (
                <div className="space-y-3">
                  {gcodes.map(g => (
                    <div key={g.id} className="card bg-base-200 hover:bg-base-300 transition-colors">
                      <div className="card-body">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <span className="font-medium max-w-[550px] truncate" title={g.nome_file.split('/').pop() || g.nome_file}>{g.nome_file.split('/').pop() || g.nome_file}</span>
                              {mainGcodeId === g.id && (
                                <span className="badge badge-success">
                                  Principale
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-base-content/70 mt-1">
                              Caricato il {new Date(g.data_caricamento).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleDownload(g)}
                              className="btn btn-primary btn-sm"
                            >
                              Scarica
                            </button>
                            {isSuperuser && mainGcodeId !== g.id && (
                              <button
                                onClick={() => handleSetMainGcode(g.id)}
                                className="btn btn-success btn-sm"
                              >
                                Imposta principale
                              </button>
                            )}
                            {isSuperuser && gcodes.length > 1 && (
                              <button
                                onClick={() => setDeleteGcodeTarget(g)}
                                className="btn btn-error btn-sm"
                              >
                                Elimina
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-4 card bg-base-200 border-dashed">
                <div className="card-body">
                  <label className="label">
                    <span className="label-text font-medium">Aggiungi nuovo G-code</span>
                  </label>
                  <input 
                    type="file" 
                    accept=".gcode,.3mf" 
                    onChange={handleUpload} 
                    disabled={uploading}
                    className="file-input file-input-bordered w-full"
                  />
                  {uploading && <p className="text-sm text-base-content/70 mt-2">Caricamento in corso...</p>}
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <p>Caricamento file…</p>
      )}

      <ConfirmModal
        open={!!deleteGcodeTarget}
        title="Conferma eliminazione"
        message={deleteGcodeTarget ? `Sei sicuro di voler eliminare il G-code "${deleteGcodeTarget.nome_file.split('/').pop()}"?` : ''}
        confirmText="Elimina"
        cancelText="Annulla"
        onConfirm={handleDeleteGcode}
        onCancel={() => setDeleteGcodeTarget(null)}
      />

      <FileEditModal
        file={file}
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        onSuccess={handleEditSuccess}
        isSuperuser={isSuperuser || false}
      />
    </div>
  )
} 