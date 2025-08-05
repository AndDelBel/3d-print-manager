// src/app/dashboard/coda-stampa/page.tsx
'use client'

import { useEffect, useState, useCallback } from 'react'
import { useUser } from '@/hooks/useUser'
import { useRetryFetch } from '@/hooks/useRetryFetch'
import { listOrg } from '@/services/organizzazione'
import { listOrders } from '@/services/ordine'
import { listGcode } from '@/services/gcode'
import { listCommesse } from '@/services/commessa'
import { listFileOrigineByIds } from '@/services/fileOrigine'
import { updateCodaStampaStatus } from '@/services/codaStampa'
import type { Organizzazione } from '@/types/organizzazione'
import type { Ordine } from '@/types/ordine'
import type { Gcode } from '@/types/gcode'
import type { Commessa } from '@/types/commessa'
import type { FileOrigine } from '@/types/fileOrigine'
import type { CodaStampaStato } from '@/types/codaStampa'
import { AlertMessage } from '@/components/AlertMessage'
import { CodaStampaTable } from '@/components/CodaStampaTable'
import { AddToQueueModal } from '@/components/AddToQueueModal'
import { ConcatenationModal } from '@/components/ConcatenationModal'
import { StatusChangeModal } from '@/components/StatusChangeModal'
import { LoadingButton } from '@/components/LoadingButton'
import { findConcatenationCandidates, executeConcatenation, updateQueueWithConcatenatedFile } from '@/services/gcodeConcatenation'
import type { ConcatenationProposal } from '@/services/gcodeConcatenation'
import type { Gcode3mfPackage } from '@/utils/gcodeConcatenation'
import { downloadGcode3mf } from '@/utils/gcodeConcatenation'
import { getStatusBadge } from '@/utils/statusUtils'

export default function CodaStampaPage() {
  const { loading, user } = useUser()
  const [orgs, setOrgs] = useState<Organizzazione[]>([])
  const [orgId, setOrgId] = useState<number | undefined>(undefined)
  const [orders, setOrders] = useState<Ordine[]>([])
  const [gcodes, setGcodes] = useState<Map<number, Gcode>>(new Map())
  const [commesse, setCommesse] = useState<Commessa[]>([])
  const [fileOrigineMap, setFileOrigineMap] = useState<Map<number, FileOrigine>>(new Map())
  const [error, setError] = useState<string | null>(null)
  const [loadingCoda, setLoadingCoda] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showConcatenationModal, setShowConcatenationModal] = useState(false)
  const [concatenationProposals, setConcatenationProposals] = useState<ConcatenationProposal[]>([])
  const [concatenationLoading, setConcatenationLoading] = useState(false)
  
  // Stati per cambio stato
  const [statusChangeTarget, setStatusChangeTarget] = useState<Ordine | null>(null)
  const [statusChangeLoading, setStatusChangeLoading] = useState(false)
  const [statusError, setStatusError] = useState<string | null>(null)
  const [statusSuccess, setStatusSuccess] = useState<string | null>(null)

  const isSuperuser = user?.is_superuser

  useEffect(() => {
    if (!loading && user) {
      listOrg({ userId: user.id, isSuperuser }).then(setOrgs).catch(console.error)
    }
  }, [loading, user, isSuperuser])

  // Carica commesse
  useEffect(() => {
    if (!loading) {
      if (isSuperuser) {
        listCommesse({ isSuperuser }).then(setCommesse).catch(console.error)
      } else {
        if (orgs.length > 0) {
          const orgIds = orgs.map(o => o.id)
          Promise.all(orgIds.map(orgId => listCommesse({ organizzazione_id: orgId, isSuperuser })))
            .then(commesseResults => {
              const allCommesse = commesseResults.flat()
              setCommesse(allCommesse)
            })
            .catch(console.error)
        }
      }
    }
  }, [loading, isSuperuser, orgs])

  const loadCoda = useCallback(async () => {
    setLoadingCoda(true)
    try {
      // Carica ordini
      const ordersList = await listOrders({ 
        organizzazione_id: isSuperuser ? orgId : orgId, 
        isSuperuser 
      })
      
      // Filtra solo ordini in coda
      const codaOrders = ordersList.filter(o => ['in_coda', 'in_stampa', 'pronto'].includes(o.stato))
      
      // Ordina per priorità: consegna_richiesta (priorità 1), data_ordine (priorità 2)
      const sortedCodaOrders = codaOrders.sort((a, b) => {
        // Se entrambi hanno consegna_richiesta, ordina per quella
        if (a.consegna_richiesta && b.consegna_richiesta) {
          return new Date(a.consegna_richiesta).getTime() - new Date(b.consegna_richiesta).getTime()
        }
        
        // Se solo uno ha consegna_richiesta, quello viene prima
        if (a.consegna_richiesta && !b.consegna_richiesta) return -1
        if (!a.consegna_richiesta && b.consegna_richiesta) return 1
        
        // Altrimenti ordina per data_ordine (più vecchio prima)
        return new Date(a.data_ordine).getTime() - new Date(b.data_ordine).getTime()
      })
      
      setOrders(sortedCodaOrders)
      
      // Carica i G-code per tutti gli ordini
      const gcodeIds = [...new Set(codaOrders.map(o => o.gcode_id))]
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

      console.log('📋 Coda stampa caricata:', codaOrders.length, 'elementi')
      setError(null)
    } catch (err) {
      console.error('Errore caricamento coda stampa:', err)
      setError('Errore caricamento coda stampa')
    } finally {
      setLoadingCoda(false)
    }
  }, [orgId, isSuperuser])

  // Retry automatico ogni 10 secondi quando in loading
  useRetryFetch(loadingCoda, loadCoda, {
    retryInterval: 10000,
    enabled: true
  })

  useEffect(() => {
    if (!loading) {
      loadCoda()
    }
  }, [loading, loadCoda])

  // Funzioni helper per ottenere nomi
  const getOrgName = (orgId: number) => {
    return orgs.find(o => o.id === orgId)?.nome || `Org ${orgId}`
  }

  const getCommessaName = (commessaId: number) => {
    return commesse.find(c => c.id === commessaId)?.nome || `Commessa ${commessaId}`
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

  // Funzioni per cambio stato
  const handleStatusChangeFromModal = async (newStatus: CodaStampaStato) => {
    if (!statusChangeTarget) return
    setStatusChangeLoading(true)
    setStatusError(null)
    setStatusSuccess(null)
    try {
      await updateCodaStampaStatus(statusChangeTarget.id, newStatus)
      await loadCoda() // Ricarica la coda
      setStatusSuccess('Stato ordine aggiornato!')
      setStatusChangeTarget(null)
    } catch (err) {
      setStatusError('Errore aggiornamento stato ordine')
      console.error('Errore aggiornamento stato ordine:', err)
    } finally {
      setStatusChangeLoading(false)
    }
  }

  const openStatusChangeModal = (order: Ordine) => {
    setStatusChangeTarget(order)
  }

  // Converti ordini in formato OrdineInCoda
  const codaData = orders
    .filter(order => ['in_coda', 'in_stampa', 'pronto'].includes(order.stato))
    .map(order => {
      const gcode = gcodes.get(order.gcode_id)
      const commessa = commesse.find(c => c.id === order.commessa_id)
      const organizzazione = orgs.find(o => o.id === order.organizzazione_id)
      
      return {
        ...order,
        stato: order.stato as CodaStampaStato,
        gcode: gcode ? [gcode] : [],
        commessa: commessa ? [commessa] : [],
        organizzazione: organizzazione ? [organizzazione] : []
      }
    })

  // Funzione per cercare opportunità di concatenazione
  const findConcatenationOpportunities = async () => {
    if (!isSuperuser) return // Solo superuser può concatenare
    
    console.log('🔍 Avvio ricerca opportunità di concatenazione...')
    setConcatenationLoading(true)
    try {
      // Usa "AUTO" come criterio per il profilo automatico
      const automaticProfileName = 'AUTO'
      console.log('📋 Cercando con profilo automatico:', automaticProfileName)
      
      const proposals = await findConcatenationCandidates(automaticProfileName)
      console.log('🎯 Proposte trovate:', proposals.length)
      
      setConcatenationProposals(proposals)
      setShowConcatenationModal(true)
      
      if (proposals.length === 0) {
        setError('Nessuna opportunità di concatenazione trovata')
      } else {
        setError(null)
      }
    } catch (err) {
      console.error('❌ Errore ricerca concatenazioni:', err)
      setError('Errore ricerca opportunità di concatenazione')
    } finally {
      setConcatenationLoading(false)
    }
  }

  const handleConcatenationConfirm = async (selectedProposals: ConcatenationProposal[], autoDownload: boolean = true) => {
    console.log('✅ Conferma concatenazione per', selectedProposals.length, 'proposte')
    
    try {
      for (const proposal of selectedProposals) {
        console.log(`🔄 Elaborazione proposta: ${proposal.description}`)
        
        // Esegui concatenazione per ogni candidato
        for (const candidate of proposal.candidates) {
          const outputFileName = `concatenated_${Date.now()}_${candidate.stampanteId}.gcode.3mf`
          const concatenatedPackage = await executeConcatenation(candidate, outputFileName)
          console.log('📦 File concatenato creato:', concatenatedPackage)
          
          // Scarica il file concatenato se richiesto
          if (autoDownload) {
            try {
              await downloadGcode3mf(concatenatedPackage, outputFileName)
              console.log('📥 File concatenato scaricato:', outputFileName)
            } catch (downloadError) {
              console.error('❌ Errore download file concatenato:', downloadError)
              // Continua comunque con l'aggiornamento della coda
            }
          } else {
            console.log('⏭️ Download automatico disabilitato')
          }
          
          // Aggiorna coda con nuovo file (usa il nome del file generato)
          await updateQueueWithConcatenatedFile(candidate, outputFileName)
          console.log('✅ Coda aggiornata con file concatenato')
        }
      }
      
      // Ricarica coda
      await loadCoda()
      setShowConcatenationModal(false)
      setError(null)
      setStatusSuccess(
        autoDownload 
          ? 'Concatenazione completata! Il file è stato scaricato automaticamente. Gli ordini originali rimangono invariati.'
          : 'Concatenazione completata! Il file è stato creato. Gli ordini originali rimangono invariati.'
      )
      
    } catch (err) {
      console.error('❌ Errore durante concatenazione:', err)
      setError('Errore durante concatenazione')
    }
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Coda di Stampa</h1>
        
        <div className="flex gap-2">
          {isSuperuser && (
            <button
              onClick={findConcatenationOpportunities}
              disabled={concatenationLoading}
              className="btn btn-secondary"
            >
              {concatenationLoading ? 'Ricerca...' : 'Trova Concatenazioni'}
            </button>
          )}
          
          <button
            onClick={() => setShowAddModal(true)}
            className="btn btn-primary"
          >
            Aggiungi alla Coda
          </button>
        </div>
      </div>

      {/* Filtro organizzazione per superuser */}
      {isSuperuser && orgs.length > 0 && (
        <div className="mb-4">
          <label className="label">
            <span className="label-text">Filtra per Organizzazione:</span>
          </label>
          <select
            className="select select-bordered w-full max-w-xs"
            value={orgId || ''}
            onChange={(e) => setOrgId(e.target.value ? Number(e.target.value) : undefined)}
          >
            <option value="">Tutte le organizzazioni</option>
            {orgs.map(org => (
              <option key={org.id} value={org.id}>
                {org.nome}
              </option>
            ))}
          </select>
        </div>
      )}

      {error && (
        <AlertMessage
          type="error"
          message={error}
          onClose={() => setError(null)}
        />
      )}

      {statusError && (
        <AlertMessage
          type="error"
          message={statusError}
          onClose={() => setStatusError(null)}
        />
      )}

      {statusSuccess && (
        <AlertMessage
          type="success"
          message={statusSuccess}
          onClose={() => setStatusSuccess(null)}
        />
      )}

      {loadingCoda ? (
        <div className="flex justify-center items-center py-8">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      ) : (
        <CodaStampaTable
          coda={codaData}
          isSuperuser={isSuperuser || false}
          onRefresh={loadCoda}
          onStatusChange={openStatusChangeModal}
        />
      )}

      <AddToQueueModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={loadCoda}
        organizzazione_id={orgId}
        isSuperuser={isSuperuser || false}
      />

      {showConcatenationModal && (
        <ConcatenationModal
          open={showConcatenationModal}
          onClose={() => setShowConcatenationModal(false)}
          proposals={concatenationProposals}
          onConfirm={handleConcatenationConfirm}
        />
      )}

      {/* Modal per cambio stato */}
      {statusChangeTarget && (
        <StatusChangeModal
          open={!!statusChangeTarget}
          onClose={() => setStatusChangeTarget(null)}
          onConfirm={handleStatusChangeFromModal}
          currentStatus={statusChangeTarget?.stato || ''}
          orderId={statusChangeTarget?.id || 0}
          loading={statusChangeLoading}
          availableStatuses={['in_coda', 'in_stampa', 'pronto', 'consegnato', 'error']}
          getStatusBadge={getStatusBadge}
        />
      )}
    </div>
  )
} 