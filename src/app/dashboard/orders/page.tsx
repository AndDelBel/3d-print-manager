// src/app/dashboard/orders/page.tsx
'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useUser } from '@/hooks/useUser'
import { listOrders, updateOrderStatus, deleteOrder, updateOrderGcode } from '@/services/ordine'
import { listOrg } from '@/services/organizzazione'
import { listCommesse } from '@/services/commessa'
import { listGcode } from '@/services/gcode'
import { listFileOrigineByIds } from '@/services/fileOrigine'

import { filterBySearch } from '@/utils/filterUtils'
import type { Ordine } from '@/types/ordine'
import { LoadingButton } from '@/components/LoadingButton'
import { ConfirmModal } from '@/components/ConfirmModal'
import { StatusChangeModal } from '@/components/StatusChangeModal'
import { getStatusBadge } from '@/utils/statusUtils'
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
      console.log('OrdersPage: Loading orders with params', { 
        isSuperuser, 
        orgId, 
        organizzazione_id: isSuperuser ? undefined : orgId 
      })
      
      listOrders({ organizzazione_id: isSuperuser ? undefined : orgId })
        .then(async (ordersList) => {
          console.log('OrdersPage: Loaded orders', ordersList.length, ordersList)
          setOrders(ordersList)
          
          // Debug: Check if we have any orders at all
          if (ordersList.length === 0) {
            console.log('OrdersPage: No orders found in database')
          }
          
          // Carica i G-code per tutti gli ordini (solo quelli con gcode_id non null)
          const gcodeIds = [...new Set(ordersList.map(o => o.gcode_id).filter(id => id !== null))] as number[]
          const gcodeMap = new Map<number, Gcode>()
          
          for (const gcodeId of gcodeIds) {
            try {
              const gcodeList = await listGcode({ file_origine_id: undefined })
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
          // Recupera file_origine_id dai gcode associati agli ordini
          const fileOrigineIds = new Set<number>()
          
          // Recupera dai gcode
          const gcodeIdsForFiles = [...new Set(ordersList.map(o => o.gcode_id).filter(id => id !== null))] as number[]
          if (gcodeIdsForFiles.length > 0) {
            try {
              const gcodeList = await listGcode({ file_origine_id: undefined })
              gcodeIdsForFiles.forEach(gcodeId => {
                const gcode = gcodeList.find(g => g.id === gcodeId)
                if (gcode) {
                  fileOrigineIds.add(gcode.file_origine_id)
                }
              })
            } catch (err) {
              console.error('Errore caricamento gcode per file origine:', err)
            }
          }
          
          if (fileOrigineIds.size > 0) {
            const fileOrigineArr = await listFileOrigineByIds([...fileOrigineIds])
            const fileMap = new Map<number, FileOrigine>()
            fileOrigineArr.forEach(f => fileMap.set(f.id, f))
            setFileOrigineMap(fileMap)
          }
        })
        .catch(err => {
          console.error('OrdersPage: Error loading orders:', err)
        })
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
    return gcode ? (gcode.nome_file ? gcode.nome_file.split('/').pop() || gcode.nome_file : `G-code ${gcodeId}`) : `G-code ${gcodeId}`
  }

  const getFileOrigine = (order: Ordine) => {
    // Recupera file_origine_id dal gcode associato all'ordine
    if (order.gcode_id) {
      const gcode = gcodes.get(order.gcode_id)
      if (gcode) {
        return fileOrigineMap.get(gcode.file_origine_id)
      }
    }
    
    return undefined
  }





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
      [
        o => String(o.id), 
        o => {
          const file = getFileOrigine(o)
          return file ? (file.nome_file ? file.nome_file.split('/').pop() || file.nome_file : '') : ''
        }
      ]
    ),
    [orders, search, fileOrigineMap, gcodes]
  )

  // Filtro per organizzazione e commessa
  const filtered = useMemo(
    () => {
      // Se non abbiamo ancora caricato i dati utente, mostra tutti gli ordini
      if (loading || isSuperuser === undefined) {
        return textFiltered
      }
      
      const result = textFiltered.filter(o => {
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
      })
      
      console.log('OrdersPage: Filtering results', {
        totalOrders: orders.length,
        textFiltered: textFiltered.length,
        filtered: result.length,
        orgId,
        isSuperuser,
        orgsLength: orgs.length,
        filterComm,
        loading
      })
      
      return result
    },
    [textFiltered, orgId, filterComm, isSuperuser, orgs, orders.length, loading]
  )



  const handleStatusChangeFromModal = async (newStatus: Ordine['stato']) => {
    if (!statusChangeTarget) return
    setStatusChangeLoading(true)
    try {
      await updateOrderStatus(statusChangeTarget.id, newStatus)
      setOrders(await listOrders({ organizzazione_id: isSuperuser ? undefined : orgId }))
      setStatusChangeTarget(null)
    } catch (err) {
      console.error('Errore aggiornamento stato ordine:', err)
    } finally {
      setStatusChangeLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      await deleteOrder(deleteTarget.id)
      setOrders(await listOrders({ organizzazione_id: isSuperuser ? undefined : orgId }))
    } catch (err) {
      console.error('Errore eliminazione ordine:', err)
    } finally {
      setDeleteLoading(false)
      setDeleteTarget(null)
    }
  }

  const handleGcodeChange = async () => {
    if (!gcodeChangeTarget || !selectedNewGcode) return
    setGcodeChangeLoading(true)
    try {
      await updateOrderGcode(gcodeChangeTarget.id, selectedNewGcode)
      setOrders(await listOrders({ organizzazione_id: isSuperuser ? undefined : orgId }))
      setGcodeChangeTarget(null)
      setSelectedNewGcode(undefined)
    } catch (err) {
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
              const allGcodes = await listGcode({ file_origine_id: undefined })
      setAvailableGcodes(allGcodes)
    } catch (err) {
      console.error('Errore caricamento G-code:', err)
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

      {/* Filtri */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-4 items-end">
          {/* Ricerca */}
          <div className="form-control flex-1 min-w-[200px]">
            <label className="label">
              <span className="label-text">Cerca per ID o nome file</span>
            </label>
            <input
              type="text"
              placeholder="Cerca per ID o nome file…"
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
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block w-full">
            <div className="overflow-x-auto overscroll-x-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200">
              <table className="table table-zebra w-full min-w-[600px]">
            <thead>
              <tr>
                <th className="whitespace-nowrap">ID</th>
                <th className="whitespace-nowrap max-w-[200px]">File</th>
                <th className="whitespace-nowrap">Commessa</th>
                {(isSuperuser || orgs.length > 1) && <th className="whitespace-nowrap">Organizzazione</th>}
                <th className="whitespace-nowrap">Quantità</th>
                <th className="whitespace-nowrap">Data Ordine</th>
                <th className="whitespace-nowrap">Consegna richiesta</th>
                <th className="whitespace-nowrap max-w-[100px]">Note</th>
                <th className="whitespace-nowrap">Stato</th>
                {isSuperuser && <th className="whitespace-nowrap">Azioni</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map(o => {
                const file = getFileOrigine(o)
                return (
                  <tr key={o.id}>
                    <td>#{o.id}</td>
                    <td>
                      <div className="max-w-[200px] truncate" title={file?.nome_file ? file.nome_file.split('/').pop() || file.nome_file : ''}>
                        {file ? (
                          <a
                            href={`/dashboard/files/${file.id}`}
                            className="link link-primary"
                          >
                            {file.nome_file ? file.nome_file.split('/').pop() || file.nome_file : 'N/A'}
                          </a>
                        ) : (
                          <span className="text-base-content/50">-</span>
                        )}
                      </div>
                    </td>
                    <td>{getCommessaName(o.commessa_id)}</td>
                    {(isSuperuser || orgs.length > 1) && <td>{getOrgName(o.organizzazione_id)}</td>}
                    <td>{o.quantita}</td>
                    <td>{o.data_ordine ? o.data_ordine.slice(0, 10) : '-'}</td>
                    <td>{o.consegna_richiesta ? o.consegna_richiesta : <span className="text-base-content/50">-</span>}</td>
                    <td>
                      {o.note ? (
                        <div className="max-w-[100px] truncate" title={o.note}>
                          {o.note}
                        </div>
                      ) : (
                        <span className="text-base-content/50">-</span>
                      )}
                    </td>
                    <td>
                      {isSuperuser ? (
                        <LoadingButton
                          loading={false}
                          loadingText="Aggiorno…"
                          className="btn btn-ghost btn-xs"
                          onClick={() => openStatusChangeModal(o)}
                        >
                          <span className={`badge cursor-pointer hover:opacity-80 ${
                            o.stato === 'consegnato' ? 'badge-success' :
                            o.stato === 'pronto' ? 'badge-info' :
                            o.stato === 'in_stampa' ? 'badge-warning' :
                            o.stato === 'in_coda' ? 'badge-primary' :
                            o.stato === 'error' ? 'badge-error' :
                            'badge-neutral'
                          }`}>
                            {o.stato}
                          </span>
                        </LoadingButton>
                      ) : (
                        <span className={`badge ${
                          o.stato === 'consegnato' ? 'badge-success' :
                          o.stato === 'pronto' ? 'badge-info' :
                          o.stato === 'in_stampa' ? 'badge-warning' :
                          o.stato === 'in_coda' ? 'badge-primary' :
                          o.stato === 'error' ? 'badge-error' :
                          'badge-neutral'
                        }`}>
                          {o.stato}
                        </span>
                      )}
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
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-4">
                {filtered.map(o => {
                  const file = getFileOrigine(o)
              return (
                <div key={o.id} className="card bg-base-100 shadow-xl border border-base-300">
                  <div className="card-body p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="card-title text-lg">Ordine #{o.id}</h3>
                      <div className="flex-shrink-0">
                        {getStatusBadge(o.stato)}
                      </div>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="font-medium">File:</span>
                        <span className="text-right max-w-[200px] truncate" title={file?.nome_file ? file.nome_file.split('/').pop() || file.nome_file : ''}>
                          {file ? (
                            <a
                              href={`/dashboard/files/${file.id}`}
                              className="link link-primary text-xs"
                            >
                              {file.nome_file ? file.nome_file.split('/').pop() || file.nome_file : 'N/A'}
                            </a>
                          ) : (
                            <span className="text-base-content/50">-</span>
                          )}
                        </span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="font-medium">Commessa:</span>
                        <span>{getCommessaName(o.commessa_id)}</span>
                      </div>
                      
                      {(isSuperuser || orgs.length > 1) && (
                        <div className="flex justify-between">
                          <span className="font-medium">Organizzazione:</span>
                          <span>{getOrgName(o.organizzazione_id)}</span>
                        </div>
                      )}
                      
                      <div className="flex justify-between">
                        <span className="font-medium">Quantità:</span>
                        <span>{o.quantita}</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="font-medium">Data Ordine:</span>
                        <span>{o.data_ordine ? o.data_ordine.slice(0, 10) : '-'}</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="font-medium">Consegna richiesta:</span>
                        <span>{o.consegna_richiesta || '-'}</span>
                      </div>
                      
                      {o.note && (
                        <div className="flex justify-between">
                          <span className="font-medium">Note:</span>
                          <span className="text-right text-xs max-w-[200px] truncate" title={o.note}>
                            {o.note}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {isSuperuser && (
                      <div className="card-actions justify-end mt-4">
                        <button
                          className="btn btn-sm btn-outline"
                          onClick={() => setStatusChangeTarget(o)}
                        >
                          Cambia Stato
                        </button>
                        <button
                          className="btn btn-sm btn-outline"
                          onClick={() => setGcodeChangeTarget(o)}
                        >
                          Cambia G-code
                        </button>
                        <button
                          className="btn btn-sm btn-error"
                          onClick={() => setDeleteTarget(o)}
                        >
                          Elimina
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </>
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
        <div className="modal modal-open z-50">
          <div 
            className="modal-backdrop" 
            onClick={() => {
              setGcodeChangeTarget(null)
              setSelectedNewGcode(undefined)
            }}
          ></div>
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">Cambia G-code per Ordine #{gcodeChangeTarget.id}</h3>
            <div className="mb-4">
              <label className="label">
                <span className="label-text">G-code attuale:</span>
              </label>
              <div className="p-2 bg-base-200 rounded text-sm">
                {gcodeChangeTarget.gcode_id ? getGcodeName(gcodeChangeTarget.gcode_id) : 'Nessun G-code associato'}
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
                    {gcode.nome_file ? gcode.nome_file.split('/').pop() || gcode.nome_file : 'N/A'}
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
      <StatusChangeModal
        open={!!statusChangeTarget}
        onClose={() => setStatusChangeTarget(null)}
        onConfirm={handleStatusChangeFromModal}
        currentStatus={statusChangeTarget?.stato || ''}
        orderId={statusChangeTarget?.id || 0}
        loading={statusChangeLoading}
        availableStatuses={['processamento', 'in_coda', 'in_stampa', 'pronto', 'consegnato', 'error']}
        getStatusBadge={getStatusBadge}
      />
    </div>
  )
}
