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
        if (item.gcode?.[0]?.stampante_id && !names.has(item.gcode[0].stampante_id)) {
          const name = await getStampanteNameByGcodeId(item.gcode[0].stampante_id)
          if (name) {
            names.set(item.gcode[0].stampante_id, name)
          }
        }
      }
      setStampanteNames(names)
    }

    if (coda.length > 0) {
      loadStampanteNames()
    }
  }, [coda])

  const formatFileName = (fileName: string) => {
    return fileName.split('/').pop()?.replace(/\.[^/.]+$/, '') || fileName
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

  const getStampanteDisplay = (gcode: { stampante_id?: number } | undefined) => {
    if (!gcode?.stampante_id) return 'N/A'
    
    const stampanteName = stampanteNames.get(gcode.stampante_id)
    return stampanteName || `Stampante #${gcode.stampante_id}`
  }

  return (
    <div className="overflow-x-auto">
      <table className="table table-zebra w-full">
        <thead>
          <tr>
            <th>File</th>
            <th>Commessa</th>
            <th>Organizzazione</th>
            <th>Stampante</th>
            <th>Quantità</th>
            <th>Stato</th>
            <th>Consegna Richiesta</th>
            <th>Data Ordine</th>
            <th>Inizio Stampa</th>
            <th>Fine Stampa</th>
            <th>Note</th>
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

      {coda.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          Nessun ordine in coda
        </div>
      )}
    </div>
  )
} 