'use client'

import { useState } from 'react'
import type { CodaStampaWithRelations } from '@/types/codaStampa'
import { updateCodaStampaStatus, removeFromCodaStampa, moveCodaStampaPosition } from '@/services/codaStampa'
import { LoadingButton } from './LoadingButton'
import { ConfirmModal } from './ConfirmModal'

interface CodaStampaTableProps {
  coda: CodaStampaWithRelations[]
  isSuperuser: boolean
  onRefresh: () => void
}

export function CodaStampaTable({ coda, isSuperuser, onRefresh }: CodaStampaTableProps) {
  const [loading, setLoading] = useState<number | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState<number | null>(null)

  const handleStatusChange = async (id: number, newStatus: CodaStampaWithRelations['stato']) => {
    setLoading(id)
    try {
      await updateCodaStampaStatus(id, newStatus)
      onRefresh()
    } catch (error) {
      console.error('Errore aggiornamento stato:', error)
    } finally {
      setLoading(null)
    }
  }

  const handleDelete = async (id: number) => {
    setLoading(id)
    try {
      await removeFromCodaStampa(id)
      onRefresh()
    } catch (error) {
      console.error('Errore eliminazione:', error)
    } finally {
      setLoading(null)
      setShowDeleteModal(null)
    }
  }

  const handleMovePosition = async (id: number, newPosition: number) => {
    setLoading(id)
    try {
      await moveCodaStampaPosition(id, newPosition)
      onRefresh()
    } catch (error) {
      console.error('Errore spostamento:', error)
    } finally {
      setLoading(null)
    }
  }

  const getStatusBadge = (stato: string) => {
    const statusConfig = {
      'in_queue': { label: 'In Coda', color: 'badge-warning' },
      'printing': { label: 'In Stampa', color: 'badge-info' },
      'done': { label: 'Completato', color: 'badge-success' },
      'error': { label: 'Errore', color: 'badge-error' }
    }
    
    const config = statusConfig[stato as keyof typeof statusConfig] || { label: stato, color: 'badge-neutral' }
    return <span className={`badge ${config.color}`}>{config.label}</span>
  }

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

  return (
    <div className="overflow-x-auto">
      <table className="table table-zebra w-full">
        <thead>
          <tr>
            <th>Posizione</th>
            <th>File</th>
            <th>Commessa</th>
            <th>Organizzazione</th>
            <th>Stampante</th>
            <th>Quantità</th>
            <th>Stato</th>
            <th>Inizio</th>
            <th>Fine</th>
            <th>Note</th>
            {isSuperuser && <th>Azioni</th>}
          </tr>
        </thead>
        <tbody>
          {coda.map((item) => (
            <tr key={item.id}>
              <td className="font-mono">{item.posizione}</td>
              <td>
                <div className="max-w-xs">
                  <div className="font-medium">
                    {item.gcode?.nome_file ? formatFileName(item.gcode.nome_file) : `Ordine #${item.ordine_id}`}
                  </div>
                  {item.gcode?.peso_grammi && (
                    <div className="text-sm text-gray-500">
                      {item.gcode.peso_grammi}g
                      {item.gcode.tempo_stampa_min && ` • ${item.gcode.tempo_stampa_min}min`}
                    </div>
                  )}
                </div>
              </td>
              <td>{item.commessa?.nome || '-'}</td>
              <td>{item.organizzazione?.nome || '-'}</td>
              <td>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{item.stampante?.nome || `#${item.stampante_id}`}</span>
                  {item.stampante?.modello && (
                    <span className="text-sm text-gray-500">({item.stampante.modello})</span>
                  )}
                </div>
              </td>
              <td className="text-center">{item.ordine?.quantita || '-'}</td>
              <td>{getStatusBadge(item.stato)}</td>
              <td className="text-sm">{formatDateTime(item.data_inizio)}</td>
              <td className="text-sm">{formatDateTime(item.data_fine)}</td>
              <td>
                <div className="max-w-xs">
                  {item.note || '-'}
                </div>
              </td>
              {isSuperuser && (
                <td>
                  <div className="flex flex-col gap-1">
                    {/* Cambio stato */}
                    <select
                      className="select select-xs select-bordered"
                      value={item.stato}
                      onChange={(e) => handleStatusChange(item.id, e.target.value as CodaStampaWithRelations['stato'])}
                      disabled={loading === item.id}
                    >
                      <option value="in_queue">In Coda</option>
                      <option value="printing">In Stampa</option>
                      <option value="done">Completato</option>
                      <option value="error">Errore</option>
                    </select>
                    
                    {/* Spostamento posizione */}
                    <div className="flex gap-1">
                      <button
                        className="btn btn-xs btn-outline"
                        onClick={() => handleMovePosition(item.id, Math.max(1, item.posizione - 1))}
                        disabled={loading === item.id || item.posizione <= 1}
                      >
                        ↑
                      </button>
                      <button
                        className="btn btn-xs btn-outline"
                        onClick={() => handleMovePosition(item.id, item.posizione + 1)}
                        disabled={loading === item.id}
                      >
                        ↓
                      </button>
                    </div>
                    
                    {/* Elimina */}
                    <button
                      className="btn btn-xs btn-error"
                      onClick={() => setShowDeleteModal(item.id)}
                      disabled={loading === item.id}
                    >
                      Elimina
                    </button>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Modal conferma eliminazione */}
      {showDeleteModal && (
        <ConfirmModal
          open={!!showDeleteModal}
          onCancel={() => setShowDeleteModal(null)}
          onConfirm={() => handleDelete(showDeleteModal)}
          title="Elimina dalla coda"
          message="Sei sicuro di voler rimuovere questo elemento dalla coda di stampa?"
        />
      )}
    </div>
  )
} 