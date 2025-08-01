// src/app/dashboard/coda-stampa/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@/hooks/useUser'
import { listOrg } from '@/services/organizzazione'
import { listCodaStampaWithRelations } from '@/services/codaStampa'
import type { Organizzazione } from '@/types/organizzazione'
import type { CodaStampaWithRelations } from '@/types/codaStampa'
import { AlertMessage } from '@/components/AlertMessage'
import { CodaStampaTable } from '@/components/CodaStampaTable'
import { AddToQueueModal } from '@/components/AddToQueueModal'
import { ConcatenationModal } from '@/components/ConcatenationModal'
import { findConcatenationCandidates, executeConcatenation, updateQueueWithConcatenatedFile } from '@/services/gcodeConcatenation'
import type { ConcatenationProposal } from '@/services/gcodeConcatenation'
import type { Gcode3mfPackage } from '@/utils/gcodeConcatenation'

export default function CodaStampaPage() {
  const { loading, user } = useUser()
  const [orgs, setOrgs] = useState<Organizzazione[]>([])
  const [orgId, setOrgId] = useState<number | undefined>(undefined)
  const [coda, setCoda] = useState<CodaStampaWithRelations[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loadingCoda, setLoadingCoda] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showConcatenationModal, setShowConcatenationModal] = useState(false)
  const [concatenationProposals, setConcatenationProposals] = useState<ConcatenationProposal[]>([])
  const [concatenationLoading, setConcatenationLoading] = useState(false)

  const isSuperuser = user?.is_superuser

  useEffect(() => {
    if (!loading && user) {
      listOrg({ userId: user.id, isSuperuser }).then(setOrgs).catch(console.error)
    }
  }, [loading, user, isSuperuser])

  const loadCoda = async () => {
    setLoadingCoda(true)
    try {
      const data = await listCodaStampaWithRelations({ 
        organizzazione_id: isSuperuser ? undefined : orgId, 
        isSuperuser 
      })
      console.log('📋 Coda stampa caricata:', data.length, 'elementi')
      console.log('📄 Dettagli coda:', data.map(item => ({
        id: item.id,
        ordine_id: item.ordine_id,
        stampante_id: item.stampante_id,
        stato: item.stato,
        gcode_id: item.ordine?.gcode_id,
        quantita: item.ordine?.quantita,
        materiale: item.gcode?.materiale,
        nome_file: item.gcode?.nome_file,
        stampante_nome: item.stampante?.nome
      })))
      setCoda(data)
      setError(null)
    } catch (err) {
      console.error('Errore caricamento coda stampa:', err)
      setError('Errore caricamento coda stampa')
    } finally {
      setLoadingCoda(false)
    }
  }

  useEffect(() => {
    if (!loading) {
      loadCoda()
    }
  }, [loading, orgId, isSuperuser])

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

  // Funzione per eseguire la concatenazione
  const handleConcatenationConfirm = async (selectedProposals: ConcatenationProposal[]) => {
    setConcatenationLoading(true)
    try {
      const concatenatedPackages: Gcode3mfPackage[] = []
      
      for (const proposal of selectedProposals) {
        for (const candidate of proposal.candidates) {
          const outputFileName = `concatenated_${Date.now()}_${candidate.stampanteId}.gcode.3mf`
          const concatenatedPackage = await executeConcatenation(candidate, outputFileName)
          concatenatedPackages.push(concatenatedPackage)
          
          // Aggiorna la proposta con il pacchetto concatenato
          proposal.concatenatedPackage = concatenatedPackage
        }
      }
      
      // Mostra il modal con i file pronti per il download
      setConcatenationProposals(selectedProposals)
      setShowConcatenationModal(true)
      setError(null)
    } catch (err) {
      console.error('Errore concatenazione:', err)
      setError('Errore durante la concatenazione')
    } finally {
      setConcatenationLoading(false)
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
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Coda di Stampa</h1>
        <div className="flex gap-2">
          {isSuperuser && (
            <>
              <button
                onClick={() => setShowAddModal(true)}
                className="btn btn-primary"
              >
                ➕ Aggiungi alla Coda
              </button>
              <button
                onClick={findConcatenationOpportunities}
                disabled={concatenationLoading}
                className="btn btn-secondary"
              >
                {concatenationLoading ? '🔍 Cercando...' : '🔗 Trova Concatenazioni'}
              </button>
              <button
                onClick={() => {
                  console.log('🧪 Test dati coda:')
                  console.log('📋 Elementi totali:', coda.length)
                  console.log('📦 Ordini con quantità > 1:', coda.filter(item => (item.ordine?.quantita || 0) > 1).length)
                  console.log('🖨️ Stampanti diverse:', new Set(coda.map(item => item.stampante_id)).size)
                  console.log('📄 G-code diversi:', new Set(coda.map(item => item.ordine?.gcode_id).filter(Boolean)).size)
                }}
                className="btn btn-accent btn-sm"
              >
                🧪 Test Dati
              </button>
            </>
          )}
          <button 
            className="btn btn-primary btn-sm"
            onClick={loadCoda}
            disabled={loadingCoda}
          >
            {loadingCoda ? (
              <span className="loading loading-spinner loading-xs"></span>
            ) : (
              '🔄 Aggiorna'
            )}
          </button>
        </div>
      </div>

      {error && <AlertMessage type="error" message={error} onClose={() => setError(null)} />}
      
      {!isSuperuser && (
        <div className="form-control mb-4">
          <label className="label">
            <span className="label-text">Organizzazione</span>
          </label>
          <select
            className="select select-bordered w-full max-w-xs"
            value={orgId ?? ''}
            onChange={e => setOrgId(Number(e.target.value) || undefined)}
          >
            <option value="">Tutte le organizzazioni</option>
            {orgs.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
          </select>
        </div>
      )}

      {loadingCoda ? (
        <div className="flex justify-center items-center min-h-[200px]">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      ) : coda.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-gray-500 mb-4">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nessun elemento in coda</h3>
          <p className="text-gray-500">
            {isSuperuser 
              ? 'Non ci sono elementi nella coda di stampa. Aggiungi ordini per iniziare.'
              : 'Non ci sono elementi nella coda di stampa per la tua organizzazione.'
            }
          </p>
        </div>
      ) : (
        <CodaStampaTable 
          coda={coda} 
          isSuperuser={isSuperuser || false} 
          onRefresh={loadCoda}
        />
      )}

      {/* Modal per aggiungere alla coda */}
      <AddToQueueModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={loadCoda}
        organizzazione_id={orgId}
        isSuperuser={isSuperuser || false}
      />

      {/* Modal per concatenazione */}
      <ConcatenationModal
        open={showConcatenationModal}
        proposals={concatenationProposals}
        onClose={() => setShowConcatenationModal(false)}
        onConfirm={handleConcatenationConfirm}
        loading={concatenationLoading}
      />
    </div>
  )
} 