// src/app/dashboard/orders/page.tsx
'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useUser } from '@/hooks/useUser'
import { listOrders, updateOrderStatus, deleteOrder, updateOrderGcode } from '@/services/ordine'
import { listOrg } from '@/services/organizzazione'
import { listCommesse } from '@/services/commessa'
import { listGcode, getGcodeDownloadUrl } from '@/services/gcode'
import { listFileOrigineByIds } from '@/services/fileOrigine'
import { parseDisplayName } from '@/utils/fileUtils'
import { filterBySearch } from '@/utils/filterUtils'
import type { Ordine } from '@/types/ordine'
import { AlertMessage } from '@/components/AlertMessage'
import { LoadingButton } from '@/components/LoadingButton'
import { ConfirmModal } from '@/components/ConfirmModal'
import type { Organizzazione } from '@/types/organizzazione'
import type { Commessa } from '@/types/commessa'
import type { Gcode } from '@/types/gcode'
import type { FileOrigine } from '@/types/fileOrigine'

export default function OrdersPage() {
  const { loading, user } = useUser()
  const [orders, setOrders] = useState<Ordine[]>([])
  const [orgs, setOrgs] = useState<Organizzazione[]>([])
  const [allCommesse, setAllCommesse] = useState<Commessa[]>([])
  const [gcodes, setGcodes] = useState<Map<number, Gcode>>(new Map())
  const [fileOrigineMap, setFileOrigineMap] = useState<Map<number, FileOrigine>>(new Map())
  const [orgId, setOrgId] = useState<number | undefined>(undefined)
  const [search, setSearch] = useState('')
  const [filterComm, setFilterComm] = useState('')
  const [statusError, setStatusError] = useState<string | null>(null)
  const [statusSuccess, setStatusSuccess] = useState<string | null>(null)
  const [statusLoadingId, setStatusLoadingId] = useState<number | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Ordine | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [gcodeChangeTarget, setGcodeChangeTarget] = useState<Ordine | null>(null)
  const [availableGcodes, setAvailableGcodes] = useState<Gcode[]>([])
  const [selectedNewGcode, setSelectedNewGcode] = useState<number | undefined>(undefined)
  const [gcodeChangeLoading, setGcodeChangeLoading] = useState(false)
  const [statusChangeTarget, setStatusChangeTarget] = useState<Ordine | null>(null)
  const [statusChangeLoading, setStatusChangeLoading] = useState(false)

  const isSuperuser = user?.is_superuser

  // Carica organizzazioni (per filtro, se non superuser)
  useEffect(() => {
    if (!loading && user) {
      listOrg({ userId: user.id, isSuperuser }).then(setOrgs).catch(console.error)
    }
  }, [loading, user, isSuperuser])

  // Carica commesse
  useEffect(() => {
    if (!loading) {
      if (isSuperuser) {
        // Per superuser, carica tutte le commesse
        listCommesse({ isSuperuser }).then(setAllCommesse).catch(console.error)
      } else {
        // Per utenti non superuser, carica le commesse delle loro organizzazioni
        if (orgs.length > 0) {
          const orgIds = orgs.map(o => o.id)
          Promise.all(orgIds.map(orgId => listCommesse({ organizzazione_id: orgId, isSuperuser })))
            .then(commesseResults => {
              const allCommesse = commesseResults.flat()
              setAllCommesse(allCommesse)
            })
            .catch(console.error)
        }
      }
    }
  }, [loading, isSuperuser, orgs])

  // Carica ordini
  useEffect(() => {
    if (!loading) {
      listOrders({ organizzazione_id: isSuperuser ? undefined : orgId, isSuperuser })
        .then(async (ordersList) => {
          setOrders(ordersList)
          
          // Carica i G-code per tutti gli ordini
          const gcodeIds = [...new Set(ordersList.map(o => o.gcode_id))]
          const gcodeMap = new Map<number, Gcode>()
          
          for (const gcodeId of gcodeIds) {
            try {
              const gcodeList = await listGcode({ file_origine_id: undefined, isSuperuser })
              const gcode = gcodeList.find(g => g.id === gcodeId)
              if (gcode) {
                gcodeMap.set(gcodeId, gcode)
              }
            } catch (err) {
              console.error('Errore caricamento G-code:', err)
            }
          }
          
          setGcodes(gcodeMap)

          // Carica file origine associati agli ordini
          const fileOrigineIds: number[] = []
          for (const gcodeId of gcodeIds) {
            const gcode = gcodeMap.get(gcodeId)
            if (gcode && gcode.file_origine_id) {
              fileOrigineIds.push(gcode.file_origine_id)
            }
          }
          const fileOrigineArr = await listFileOrigineByIds([...new Set(fileOrigineIds)])
          const fileMap = new Map<number, FileOrigine>()
          fileOrigineArr.forEach(f => fileMap.set(f.id, f))
          setFileOrigineMap(fileMap)
        })
        .catch(console.error)
    }
  }, [loading, orgId, isSuperuser])

  // Funzioni helper per ottenere nomi
  const getOrgName = (orgId: number) => {
    return orgs.find(o => o.id === orgId)?.nome || `Org ${orgId}`
  }

  const getCommessaName = (commessaId: number) => {
    return allCommesse.find(c => c.id === commessaId)?.nome || `Commessa ${commessaId}`
  }

  const getGcodeName = (gcodeId: number) => {
    const gcode = gcodes.get(gcodeId)
    return gcode ? gcode.nome_file.split('/').pop() || gcode.nome_file : `G-code ${gcodeId}`
  }

  const getFileOrigine = (gcodeId: number) => {
    const gcode = gcodes.get(gcodeId)
    if (!gcode) return undefined
    return fileOrigineMap.get(gcode.file_origine_id)
  }

  const handleGcodeDownload = async (gcodeId: number) => {
    const gcode = gcodes.get(gcodeId)
    if (!gcode) return
    
    try {
      const url = await getGcodeDownloadUrl(gcode.nome_file)
      window.open(url, '_blank')
    } catch (err) {
      console.error('Errore download G-code:', err)
    }
  }

  // Estrai commesse uniche per filtro
  const commesse = useMemo(() =>
    Array.from(new Set(orders.map(o => o.commessa_id))),
    [orders]
  )

  // Commesse filtrate per l'organizzazione selezionata
  const commesseFiltrate = useMemo(() => {
    if (orgId) {
      // Se è selezionata un'organizzazione, filtra per quella
      return allCommesse.filter(c => c.organizzazione_id === orgId)
    } else if (!isSuperuser && orgs.length > 0) {
      // Per utenti non superuser senza organizzazione selezionata, mostra tutte le commesse delle loro organizzazioni
      const orgIds = orgs.map(o => o.id)
      return allCommesse.filter(c => orgIds.includes(c.organizzazione_id))
    } else if (isSuperuser) {
      // Per superuser senza organizzazione selezionata, mostra tutte le commesse
      return allCommesse
    }
    return []
  }, [allCommesse, orgId, isSuperuser, orgs])

  // Filtro per testo
  const textFiltered = useMemo(
    () => filterBySearch(
      orders,
      search,
      [o => String(o.id), o => String(o.commessa_id)]
    ),
    [orders, search]
  )

  // Filtro per organizzazione e commessa
  const filtered = useMemo(
    () => textFiltered.filter(o => {
      // Filtro per organizzazione
      if (orgId) {
        if (o.organizzazione_id !== orgId) return false
      } else if (!isSuperuser && orgs.length > 0) {
        // Per utenti non superuser senza organizzazione selezionata, 
        // mostra solo ordini delle loro organizzazioni
        const orgIds = orgs.map(o => o.id)
        if (!orgIds.includes(o.organizzazione_id)) return false
      }
      
      // Filtro per commessa
      if (filterComm) {
        if (String(o.commessa_id) !== filterComm) return false
      }
      
      return true
    }),
    [textFiltered, orgId, filterComm, isSuperuser, orgs]
  )

  const handleStatusChange = async (id: number, newStatus: Ordine['stato']) => {
    setStatusError(null)
    setStatusSuccess(null)
    setStatusLoadingId(id)
    try {
      await updateOrderStatus(id, newStatus)
      setOrders(await listOrders({ organizzazione_id: isSuperuser ? undefined : orgId, isSuperuser }))
      setStatusSuccess('Stato ordine aggiornato!')
    } catch (err) {
      setStatusError('Errore aggiornamento stato ordine')
      console.error('Errore aggiornamento stato ordine:', err)
    } finally {
      setStatusLoadingId(null)
    }
  }

  const handleStatusChangeFromModal = async (newStatus: Ordine['stato']) => {
    if (!statusChangeTarget) return
    setStatusChangeLoading(true)
    setStatusError(null)
    setStatusSuccess(null)
    try {
      await updateOrderStatus(statusChangeTarget.id, newStatus)
      setOrders(await listOrders({ organizzazione_id: isSuperuser ? undefined : orgId, isSuperuser }))
      setStatusSuccess('Stato ordine aggiornato!')
      setStatusChangeTarget(null)
    } catch (err) {
      setStatusError('Errore aggiornamento stato ordine')
      console.error('Errore aggiornamento stato ordine:', err)
    } finally {
      setStatusChangeLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleteLoading(true)
    setStatusError(null)
    setStatusSuccess(null)
    try {
      await deleteOrder(deleteTarget.id)
      setOrders(await listOrders({ organizzazione_id: isSuperuser ? undefined : orgId, isSuperuser }))
      setStatusSuccess('Ordine eliminato con successo!')
    } catch (err) {
      setStatusError('Errore eliminazione ordine')
      console.error('Errore eliminazione ordine:', err)
    } finally {
      setDeleteLoading(false)
      setDeleteTarget(null)
    }
  }

  const handleGcodeChange = async () => {
    if (!gcodeChangeTarget || !selectedNewGcode) return
    setGcodeChangeLoading(true)
    setStatusError(null)
    setStatusSuccess(null)
    try {
      await updateOrderGcode(gcodeChangeTarget.id, selectedNewGcode)
      setOrders(await listOrders({ organizzazione_id: isSuperuser ? undefined : orgId, isSuperuser }))
      setStatusSuccess('G-code dell\'ordine aggiornato con successo!')
      setGcodeChangeTarget(null)
      setSelectedNewGcode(undefined)
    } catch (err) {
      setStatusError('Errore aggiornamento G-code ordine')
      console.error('Errore aggiornamento G-code ordine:', err)
    } finally {
      setGcodeChangeLoading(false)
    }
  }

  const openGcodeChangeModal = async (order: Ordine) => {
    setGcodeChangeTarget(order)
    setSelectedNewGcode(undefined)
    
    // Carica tutti i G-code disponibili
    try {
      const allGcodes = await listGcode({ isSuperuser: true })
      setAvailableGcodes(allGcodes)
    } catch (err) {
      console.error('Errore caricamento G-code:', err)
      setStatusError('Errore caricamento G-code disponibili')
    }
  }

  const openStatusChangeModal = (order: Ordine) => {
    setStatusChangeTarget(order)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Coda Ordini</h1>
        <Link href="/dashboard/orders/create" className="btn btn-primary">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Aggiungi Ordine
        </Link>
      </div>
      {statusError && <AlertMessage type="error" message={statusError} onClose={() => setStatusError(null)} />}
      {statusSuccess && <AlertMessage type="success" message={statusSuccess} onClose={() => setStatusSuccess(null)} />}
      {/* Filtri */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-4 items-end">
          {/* Ricerca */}
          <div className="form-control flex-1 min-w-[200px]">
            <label className="label">
              <span className="label-text">Cerca per ID o commessa</span>
            </label>
            <input
              type="text"
              placeholder="Cerca per ID o commessa…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input input-bordered w-full"
            />
          </div>
          
          {/* Filtro organizzazione */}
          {(isSuperuser || orgs.length > 1) && (
            <div className="form-control flex-1 min-w-[200px]">
              <label className="label">
                <span className="label-text">Organizzazione</span>
              </label>
              <select
                value={orgId ?? ''}
                onChange={e => setOrgId(Number(e.target.value) || undefined)}
                className="select select-bordered w-full"
              >
                <option value="">Tutte le organizzazioni</option>
                {orgs.map(o => (
                  <option key={o.id} value={o.id}>{o.nome}</option>
                ))}
              </select>
            </div>
          )}
          
          {/* Filtro commessa */}
          <div className="form-control flex-1 min-w-[200px]">
            <label className="label">
              <span className="label-text">Commessa</span>
            </label>
            <select
              value={filterComm}
              onChange={e => setFilterComm(e.target.value)}
              className="select select-bordered w-full"
              disabled={commesseFiltrate.length === 0}
            >
              <option value="">Tutte le commesse</option>
              {commesseFiltrate.map(commessa => (
                <option key={commessa.id} value={commessa.id}>
                  {commessa.nome}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-base-content/70">Nessun ordine trovato.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="table table-zebra w-full">
            <thead>
              <tr>
                <th>ID</th>
                <th>File</th>
                <th>Commessa</th>
                {(isSuperuser || orgs.length > 1) && <th>Organizzazione</th>}
                <th>Quantità</th>
                <th>Data Ordine</th>
                <th>Consegna richiesta</th>
                <th>Note</th>
                <th>Stato</th>
                {isSuperuser && <th>Azioni</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map(o => {
                const file = getFileOrigine(o.gcode_id)
                return (
                  <tr key={o.id}>
                    <td>#{o.id}</td>
                    <td>
                      {file ? (
                        <a
                          href={`/dashboard/files/${file.id}`}
                          className="link link-primary"
                        >
                          {file.nome_file.split('/').pop() || file.nome_file}
                        </a>
                      ) : (
                        <span className="text-base-content/50">-</span>
                      )}
                    </td>
                    <td>{getCommessaName(o.commessa_id)}</td>
                    {(isSuperuser || orgs.length > 1) && <td>{getOrgName(o.organizzazione_id)}</td>}
                    <td>{o.quantita}</td>
                    <td>{o.data_ordine ? o.data_ordine.slice(0, 10) : '-'}</td>
                    <td>{o.consegna_richiesta ? o.consegna_richiesta : <span className="text-base-content/50">-</span>}</td>
                    <td>
                      {o.note ? (
                        <div className="max-w-xs truncate" title={o.note}>
                          {o.note}
                        </div>
                      ) : (
                        <span className="text-base-content/50">-</span>
                      )}
                    </td>
                    <td>
                      <LoadingButton
                        loading={statusLoadingId === o.id}
                        loadingText="Aggiorno…"
                        className="btn btn-ghost btn-xs"
                        onClick={e => e.preventDefault()}
                      >
                        {isSuperuser ? (
                          <button
                            onClick={() => openStatusChangeModal(o)}
                            className={`badge cursor-pointer hover:opacity-80 ${
                              o.stato === 'consegnato' ? 'badge-success' :
                              o.stato === 'pronto' ? 'badge-info' :
                              o.stato === 'in_stampa' ? 'badge-warning' :
                              o.stato === 'in_coda' ? 'badge-primary' :
                              'badge-neutral'
                            }`}
                            disabled={statusLoadingId === o.id}
                          >
                            {o.stato}
                          </button>
                        ) : (
                          <span className={`badge ${
                            o.stato === 'consegnato' ? 'badge-success' :
                            o.stato === 'pronto' ? 'badge-info' :
                            o.stato === 'in_stampa' ? 'badge-warning' :
                            o.stato === 'in_coda' ? 'badge-primary' :
                            'badge-neutral'
                          }`}>
                            {o.stato}
                          </span>
                        )}
                      </LoadingButton>
                    </td>
                    {isSuperuser && (
                      <td className="text-center">
                        <button
                          onClick={() => openGcodeChangeModal(o)}
                          className="btn btn-primary btn-xs mr-2"
                          disabled={gcodeChangeLoading}
                        >
                          Cambia G-code
                        </button>
                        <button
                          onClick={() => setDeleteTarget(o)}
                          className="btn btn-error btn-xs"
                          disabled={deleteLoading}
                        >Elimina</button>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      <ConfirmModal
        open={!!deleteTarget}
        title="Conferma eliminazione"
        message={deleteTarget ? `Sei sicuro di voler eliminare l'ordine #${deleteTarget.id}?` : ''}
        confirmText="Elimina"
        cancelText="Annulla"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Modal per cambio G-code */}
      {gcodeChangeTarget && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">Cambia G-code per Ordine #{gcodeChangeTarget.id}</h3>
            <div className="mb-4">
              <label className="label">
                <span className="label-text">G-code attuale:</span>
              </label>
              <div className="p-2 bg-base-200 rounded text-sm">
                {getGcodeName(gcodeChangeTarget.gcode_id)}
              </div>
            </div>
            <div className="mb-4">
              <label className="label">
                <span className="label-text">Nuovo G-code:</span>
              </label>
              <select
                value={selectedNewGcode ?? ''}
                onChange={e => setSelectedNewGcode(Number(e.target.value) || undefined)}
                className="select select-bordered w-full"
                disabled={gcodeChangeLoading}
              >
                <option value="">Seleziona un G-code...</option>
                {availableGcodes.map(gcode => (
                  <option key={gcode.id} value={gcode.id}>
                    {gcode.nome_file.split('/').pop() || gcode.nome_file}
                  </option>
                ))}
              </select>
            </div>
            <div className="modal-action">
              <button
                onClick={() => {
                  setGcodeChangeTarget(null)
                  setSelectedNewGcode(undefined)
                }}
                className="btn btn-ghost"
                disabled={gcodeChangeLoading}
              >
                Annulla
              </button>
              <LoadingButton
                loading={gcodeChangeLoading}
                loadingText="Aggiornamento..."
                onClick={handleGcodeChange}
                className="btn btn-primary"
                disabled={!selectedNewGcode}
              >
                Conferma
              </LoadingButton>
            </div>
          </div>
        </div>
      )}

      {/* Modal per cambio stato */}
      {statusChangeTarget && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">Modifica Stato Ordine #{statusChangeTarget.id}</h3>
            <div className="mb-4">
              <label className="label">
                <span className="label-text">Stato attuale:</span>
              </label>
              <div className="p-2 bg-base-200 rounded text-sm">
                <span className={`badge ${
                  statusChangeTarget.stato === 'consegnato' ? 'badge-success' :
                  statusChangeTarget.stato === 'pronto' ? 'badge-info' :
                  statusChangeTarget.stato === 'in_stampa' ? 'badge-warning' :
                  statusChangeTarget.stato === 'in_coda' ? 'badge-primary' :
                  'badge-neutral'
                }`}>
                  {statusChangeTarget.stato}
                </span>
              </div>
            </div>
            <div className="mb-6">
              <label className="label">
                <span className="label-text">Nuovo stato:</span>
              </label>
              <div className="grid grid-cols-1 gap-2">
                {['processamento','in_coda','in_stampa','pronto','consegnato'].map(s => (
                  <button
                    key={s}
                    onClick={() => handleStatusChangeFromModal(s as Ordine['stato'])}
                    disabled={statusChangeLoading || statusChangeTarget.stato === s}
                    className={`btn btn-outline justify-start ${
                      statusChangeTarget.stato === s ? 'btn-active' : ''
                    }`}
                  >
                    <span className={`badge mr-2 ${
                      s === 'consegnato' ? 'badge-success' :
                      s === 'pronto' ? 'badge-info' :
                      s === 'in_stampa' ? 'badge-warning' :
                      s === 'in_coda' ? 'badge-primary' :
                      'badge-neutral'
                    }`}>
                      {s}
                    </span>
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div className="modal-action">
              <button
                onClick={() => setStatusChangeTarget(null)}
                className="btn btn-ghost"
                disabled={statusChangeLoading}
              >
                Annulla
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
