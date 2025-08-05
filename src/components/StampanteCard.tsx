'use client'

import { useState } from 'react'
import type { StampanteData } from '@/types/stampante'
import { ConfirmModal } from './ConfirmModal'

interface StampanteCardProps {
  stampante: StampanteData
  onDelete: () => void
  onRefresh: () => void
}

export function StampanteCard({ stampante, onDelete, onRefresh }: StampanteCardProps) {
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  const getStatusColor = (stato: string) => {
    switch (stato) {
      case 'printing':
        return 'bg-green-500'
      case 'idle':
        return 'bg-blue-500'
      case 'paused':
        return 'bg-yellow-500'
      case 'error':
        return 'bg-red-500'
      case 'offline':
        return 'bg-gray-500'
      default:
        return 'bg-gray-500'
    }
  }

  const getStatusText = (stato: string) => {
    switch (stato) {
      case 'printing':
        return 'In Stampa'
      case 'idle':
        return 'In Attesa'
      case 'paused':
        return 'In Pausa'
      case 'error':
        return 'Errore'
      case 'offline':
        return 'Offline'
      default:
        return 'Sconosciuto'
    }
  }

  const formatTime = (seconds: number) => {
    if (!seconds || seconds <= 0) return '--:--'
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
  }

  const formatTemperature = (temp: number) => {
    return temp ? `${temp.toFixed(1)}°C` : '--'
  }

  const formatProgress = (progress: number) => {
    return progress ? `${progress.toFixed(1)}%` : '--'
  }

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
              {stampante.nome}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              ID: {stampante.unique_id}
            </p>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={onRefresh}
              className="p-2 text-gray-500 hover:text-blue-500 dark:text-gray-400 dark:hover:text-blue-400"
              title="Aggiorna"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            
            <button
              onClick={() => setShowDeleteModal(true)}
              className="p-2 text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400"
              title="Elimina"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>

        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-3 h-3 rounded-full ${getStatusColor(stampante.stato)}`}></div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {getStatusText(stampante.stato)}
            </span>
          </div>
          
          {stampante.current_file && (
            <p className="text-sm text-gray-600 dark:text-gray-400 truncate" title={stampante.current_file}>
              File: {stampante.current_file}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Ugello</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {formatTemperature(stampante.hotend_temperature)}
            </p>
          </div>
          
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Piatto</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {formatTemperature(stampante.bed_temperature)}
            </p>
          </div>
        </div>

        {(stampante.stato === 'printing' || stampante.stato === 'paused') && (
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                <span>Progresso</span>
                <span>{formatProgress(stampante.print_progress)}</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${stampante.print_progress || 0}%` }}
                ></div>
              </div>
            </div>
            
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Tempo Rimanente</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {formatTime(stampante.time_remaining)}
              </p>
            </div>
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Ultimo aggiornamento: {new Date(stampante.last_update).toLocaleString('it-IT')}
          </p>
        </div>
      </div>

      <ConfirmModal
        open={showDeleteModal}
        onCancel={() => setShowDeleteModal(false)}
        onConfirm={() => {
          onDelete()
          setShowDeleteModal(false)
        }}
        title="Elimina Stampante"
        message={`Sei sicuro di voler eliminare la stampante "${stampante.nome}"? Questa azione non può essere annullata.`}
        confirmText="Elimina"
        cancelText="Annulla"
      />
    </>
  )
} 