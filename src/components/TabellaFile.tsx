import React from 'react'
import { RigaTabellaFile, RigaFile } from './RigaTabellaFile'
import Link from 'next/link'

interface TabellaFileProps {
  righe: RigaFile[]
  onAssocia: (id: number) => void
  showOrganizzazione?: boolean
  isSuperuser?: boolean
}

export function TabellaFile({ righe, showOrganizzazione = true, isSuperuser = false, onAssocia, ...callbacks }: TabellaFileProps) {
  // Costruisci l'URL per la creazione ordini con parametri precompilati
  const getOrderUrl = (riga: RigaFile) => {
    const params = new URLSearchParams()
    if (riga.organizzazione_id) {
      params.set('org', riga.organizzazione_id.toString())
    }
    if (riga.commessa_id) {
      params.set('commessa', riga.commessa_id.toString())
    }
    if (riga.id) {
      params.set('file', riga.id.toString())
    }
    const url = `/dashboard/orders/create?${params.toString()}`
    
    // Debug logging per produzione
    console.log('TabellaFile: Generated order URL', {
      rigaId: riga.id,
      orgId: riga.organizzazione_id,
      commessaId: riga.commessa_id,
      generatedUrl: url
    })
    
    return url
  }
  
  return (
    <div className="w-full">
      {/* Desktop Table View */}
      <div className="hidden md:block">
        <div className="overflow-x-auto overscroll-x-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200">
          <table className="table table-zebra w-full min-w-[600px]">
        <thead>
          <tr>
            <th className="w-1/4 whitespace-nowrap">Nome</th>
            {showOrganizzazione && <th className="w-1/6 whitespace-nowrap">Organizzazione</th>}
            <th className="w-1/6 whitespace-nowrap">Commessa</th>
            <th className="w-1/3 whitespace-nowrap">Descrizione</th>
            <th className="w-1/6 whitespace-nowrap">Processato</th>
          </tr>
        </thead>
        <tbody>
          {righe.map(riga => (
            <RigaTabellaFile key={riga.id} riga={riga} showOrganizzazione={showOrganizzazione} isSuperuser={isSuperuser} onAssocia={onAssocia} {...callbacks} />
          ))}
        </tbody>
      </table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {righe.map(riga => (
          <div key={riga.id} className="card bg-base-100 shadow-xl border border-base-300">
            <div className="card-body p-4">
              <div className="flex justify-between items-start mb-2 max-w-xs">
                <h3 className="card-title text-lg truncate">{riga.nome}</h3>
              </div>
              
              <div className="space-y-2 text-sm">
                {showOrganizzazione && (
                  <div className="flex justify-between">
                    <span className="font-medium">Organizzazione:</span>
                    <span className="text-right">{riga.organizzazione || '-'}</span>
                  </div>
                )}
                
                <div className="flex justify-between">
                  <span className="font-medium">Commessa:</span>
                  <span className="text-right">{riga.commessa || '-'}</span>
                </div>
                
                {riga.descrizione && (
                  <div className="flex justify-between">
                    <span className="font-medium">Descrizione:</span>
                    <span className="text-right text-xs max-w-[200px] truncate" title={riga.descrizione}>
                      {riga.descrizione}
                    </span>
                  </div>
                )}
              </div>
              
              <div className="card-actions justify-end mt-4" onClick={(e) => e.stopPropagation()}>
                {riga.nomeGcode ? (
                  <div className="flex items-center gap-2">
                    <span className="badge badge-success">✓</span>
                    <Link 
                      href={getOrderUrl(riga)}
                      className="btn btn-primary btn-xs"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Ordina
                    </Link>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="badge badge-error">✗</span>
                    {isSuperuser && (
                      <button onClick={() => onAssocia(riga.id)} className="btn btn-success btn-xs">Associa</button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
} 