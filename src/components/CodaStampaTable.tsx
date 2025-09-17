'use client'

import { useState, useEffect } from 'react'
import type { OrdineInCoda, CodaStampaStato } from '@/types/codaStampa'
import { getStampanteNameByGcodeId } from '@/services/codaStampa'
import { getStatusBadge } from '@/utils/statusUtils'

interface CodaStampaTableProps {
  coda: OrdineInCoda[]
  isSuperuser: boolean
  onRefresh: () => void
  onStatusChange: (order: OrdineInCoda) => void
}

export function CodaStampaTable({ coda, isSuperuser, onRefresh, onStatusChange }: CodaStampaTableProps) {
  const [stampanteNames, setStampanteNames] = useState<Map<number, string>>(new Map())

  // Carica i nomi delle stampanti
  useEffect(() => {
    const loadStampanteNames = async () => {
      const names = new Map<number, string>()
      for (const item of coda) {
        if (item.gcode?.[0]?.stampante && !names.has(item.gcode[0].id)) {
          names.set(item.gcode[0].id, item.gcode[0].stampante)
        }
      }
      setStampanteNames(names)
    }

    if (coda.length > 0) {
      loadStampanteNames()
    }
  }, [coda])

  const formatFileName = (fileName: string) => {
    return fileName ? fileName.split('/').pop()?.replace(/\.[^/.]+$/, '') || fileName : 'N/A'
  }

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('it-IT')
  }

  const getStampanteDisplay = (gcode: { stampante?: string } | undefined) => {
    if (!gcode?.stampante) return 'N/A'
    return gcode.stampante
  }

  return (
    <div className="w-full">
      {/* Desktop Table View */}
      <div className="hidden md:block">
        <div className="overflow-x-auto overscroll-x-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200">
          <table className="table table-zebra w-full min-w-[900px]">
        <thead>
          <tr>
            <th className="whitespace-nowrap">File</th>
            <th className="whitespace-nowrap">Commessa</th>
            <th className="whitespace-nowrap">Organizzazione</th>
            <th className="whitespace-nowrap">Stampante</th>
            <th className="whitespace-nowrap">Quantità</th>
            <th className="whitespace-nowrap">Stato</th>
            <th className="whitespace-nowrap">Consegna Richiesta</th>
            <th className="whitespace-nowrap">Data Ordine</th>
            <th className="whitespace-nowrap">Inizio Stampa</th>
            <th className="whitespace-nowrap">Fine Stampa</th>
            <th className="whitespace-nowrap">Note</th>
          </tr>
        </thead>
        <tbody>
          {coda.map((item, index) => {
            const gcode = item.gcode?.[0]
            const commessa = item.commessa?.[0]
            const organizzazione = item.organizzazione?.[0]
            
            return (
              <tr key={item.id}>
                <td>
                  <div className="font-medium">
                    {gcode ? formatFileName(gcode.nome_file) : 'N/A'}
                  </div>
                  {gcode?.materiale && (
                    <div className="text-sm opacity-70">{gcode.materiale}</div>
                  )}
                </td>
                <td>{commessa?.nome || 'N/A'}</td>
                <td>{organizzazione?.nome || 'N/A'}</td>
                <td>
                  <div className="font-medium">
                    {getStampanteDisplay(gcode)}
                  </div>
                  {gcode?.materiale && (
                    <div className="text-sm opacity-70">{gcode.materiale}</div>
                  )}
                </td>
                <td>{item.quantita}</td>
                <td>
                  {isSuperuser ? (
                    <button
                      onClick={() => onStatusChange(item)}
                      className={`badge cursor-pointer hover:opacity-80 ${
                        item.stato === 'pronto' ? 'badge-info' :
                        item.stato === 'in_stampa' ? 'badge-warning' :
                        item.stato === 'in_coda' ? 'badge-primary' :
                        item.stato === 'error' ? 'badge-error' :
                        'badge-neutral'
                      }`}
                    >
                      {getStatusBadge(item.stato)}
                    </button>
                  ) : (
                    getStatusBadge(item.stato)
                  )}
                </td>
                <td>{formatDate(item.consegna_richiesta || undefined)}</td>
                <td>{formatDateTime(item.data_ordine)}</td>
                <td>{formatDateTime(item.data_inizio || undefined)}</td>
                <td>{formatDateTime(item.data_fine || undefined)}</td>
                <td>
                  <div className="max-w-xs truncate" title={item.note || ''}>
                    {item.note || '-'}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {coda.map((item, index) => {
          const gcode = item.gcode?.[0]
          const commessa = item.commessa?.[0]
          const organizzazione = item.organizzazione?.[0]
          
          return (
            <div key={item.id} className="card bg-base-100 shadow-xl border border-base-300">
              <div className="card-body p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="card-title text-lg">
                    {gcode ? formatFileName(gcode.nome_file) : 'N/A'}
                  </h3>
                  <div className="badge badge-primary">
                    {getStatusBadge(item.stato)}
                  </div>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="font-medium">Commessa:</span>
                    <span className="text-right">{commessa?.nome || 'N/A'}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="font-medium">Organizzazione:</span>
                    <span className="text-right">{organizzazione?.nome || 'N/A'}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="font-medium">Stampante:</span>
                    <span className="text-right">{getStampanteDisplay(gcode)}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="font-medium">Quantità:</span>
                    <span>{item.quantita}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="font-medium">Consegna Richiesta:</span>
                    <span className="text-right">{item.consegna_richiesta || '-'}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="font-medium">Data Ordine:</span>
                    <span className="text-right">{item.data_ordine ? item.data_ordine.slice(0, 10) : '-'}</span>
                  </div>
                  
                  {item.data_inizio && (
                    <div className="flex justify-between">
                      <span className="font-medium">Inizio Stampa:</span>
                      <span className="text-right">{item.data_inizio.slice(0, 10)}</span>
                    </div>
                  )}
                  
                  {item.data_fine && (
                    <div className="flex justify-between">
                      <span className="font-medium">Fine Stampa:</span>
                      <span className="text-right">{item.data_fine.slice(0, 10)}</span>
                    </div>
                  )}
                  
                  {item.note && (
                    <div className="flex justify-between">
                      <span className="font-medium">Note:</span>
                      <span className="text-right text-xs max-w-[200px] truncate" title={item.note}>
                        {item.note}
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="card-actions justify-end mt-4">
                  <button
                    className="btn btn-sm btn-outline"
                    onClick={() => onStatusChange(item)}
                  >
                    Cambia Stato
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {coda.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          Nessun ordine in coda
        </div>
      )}
    </div>
  )
} 