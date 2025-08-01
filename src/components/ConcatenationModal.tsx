import React, { useState } from 'react'
import type { ConcatenationProposal } from '@/services/gcodeConcatenation'
import { LoadingButton } from './LoadingButton'
import { downloadGcode3mf, downloadConcatenatedZip } from '@/utils/gcodeConcatenation'

interface ConcatenationModalProps {
  open: boolean
  proposals: ConcatenationProposal[]
  onClose: () => void
  onConfirm: (selectedProposals: ConcatenationProposal[]) => void
  loading?: boolean
}

export function ConcatenationModal({
  open,
  proposals,
  onClose,
  onConfirm,
  loading = false
}: ConcatenationModalProps) {
  const [selectedProposals, setSelectedProposals] = useState<Set<string>>(new Set())

  const handleProposalToggle = (proposalId: string) => {
    const newSelected = new Set(selectedProposals)
    if (newSelected.has(proposalId)) {
      newSelected.delete(proposalId)
    } else {
      newSelected.add(proposalId)
    }
    setSelectedProposals(newSelected)
  }

  const handleConfirm = () => {
    const selected = proposals.filter(p => selectedProposals.has(p.id))
    onConfirm(selected)
  }

  const handleClose = () => {
    setSelectedProposals(new Set())
    onClose()
  }

  if (!open) return null

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-4xl">
        <h3 className="font-bold text-lg mb-4">
          Proposte di Concatenazione G-code
        </h3>
        
        <div className="mb-4">
          <p className="text-sm text-base-content/70 mb-4">
            Sono state trovate opportunità per concatenare file G-code Bambu Lab. 
            La concatenazione può ridurre i tempi di stampa e ottimizzare l'uso del materiale.
          </p>
        </div>

        {proposals.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-base-content/50">
              <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p>Nessuna opportunità di concatenazione trovata</p>
              <p className="text-sm mt-2">
                Le concatenazioni sono disponibili solo per stampanti Bambu Lab con profilo automatico
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {proposals.map((proposal) => (
              <div key={proposal.id} className="border rounded-lg p-4">
                <div className="flex items-start gap-4">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-primary mt-1"
                    checked={selectedProposals.has(proposal.id)}
                    onChange={() => handleProposalToggle(proposal.id)}
                    disabled={loading}
                  />
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`badge ${
                        proposal.type === 'same_gcode' ? 'badge-info' : 'badge-warning'
                      }`}>
                        {proposal.type === 'same_gcode' ? 'Stesso G-code' : 'Stesso Materiale'}
                      </span>
                      <span className="text-sm text-base-content/70">
                                                 {proposal.candidates.length} candidato{proposal.candidates.length > 1 ? 'i' : ''}
                      </span>
                    </div>
                    
                    <h4 className="font-semibold mb-2">{proposal.description}</h4>
                    
                                         <div className="grid grid-cols-2 gap-4 text-sm">
                       <div>
                         <span className="text-base-content/70">Tempo stimato:</span>
                         <span className="ml-2">
                           {proposal.estimatedTime > 0 ? `${proposal.estimatedTime}h` : 'Calcolo...'}
                         </span>
                       </div>
                       <div>
                         <span className="text-base-content/70">Materiale stimato:</span>
                         <span className="ml-2">
                           {proposal.estimatedMaterial > 0 ? `${proposal.estimatedMaterial}g` : 'Calcolo...'}
                         </span>
                       </div>
                     </div>
                     
                     {proposal.concatenatedPackage && (
                       <div className="mt-3 p-3 bg-success/10 rounded-lg">
                         <div className="flex items-center justify-between">
                           <div>
                             <span className="text-success font-medium">✅ File .gcode.3mf pronto</span>
                             <div className="text-sm text-success/70">
                               {proposal.concatenatedPackage.metadata.originalFiles.length} file concatenati
                             </div>
                             <div className="text-xs text-success/60 mt-1">
                               Tempo: {proposal.concatenatedPackage.metadata.totalTime} min | 
                               Materiale: {proposal.concatenatedPackage.metadata.totalMaterial.toFixed(1)}g | 
                               Layer: {proposal.concatenatedPackage.metadata.totalLayers}
                             </div>
                           </div>
                           <button
                             onClick={() => downloadGcode3mf(proposal.concatenatedPackage!, `concatenated_${Date.now()}.gcode.3mf`)}
                             className="btn btn-success btn-xs"
                           >
                             📥 Scarica
                           </button>
                         </div>
                       </div>
                     )}
                    
                    <div className="mt-3">
                      <details className="collapse collapse-arrow bg-base-200">
                        <summary className="collapse-title text-sm font-medium">
                          Dettagli ordini ({proposal.candidates[0].ordineIds.length})
                        </summary>
                        <div className="collapse-content">
                          <ul className="text-sm space-y-1">
                            {proposal.candidates[0].ordineIds.map((ordineId) => (
                              <li key={ordineId} className="flex items-center gap-2">
                                <span className="badge badge-outline badge-xs">#{ordineId}</span>
                                <span>Ordine #{ordineId}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </details>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="modal-action">
          <button
            onClick={handleClose}
            className="btn btn-ghost"
            disabled={loading}
          >
            Annulla
          </button>
          
          {proposals.length > 0 && (
            <LoadingButton
              loading={loading}
              loadingText="Concatenazione..."
              onClick={handleConfirm}
              className="btn btn-primary"
              disabled={selectedProposals.size === 0}
            >
              Conferma Concatenazione ({selectedProposals.size})
            </LoadingButton>
          )}
        </div>
      </div>
    </div>
  )
} 