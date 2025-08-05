'use client'

import { useState, useEffect } from 'react'
import type { PrinterState } from '@/types/homeAssistant'

interface AddStampanteModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (uniqueId: string) => void
}

export function AddStampanteModal({ isOpen, onClose, onAdd }: AddStampanteModalProps) {
  const [availablePrinters, setAvailablePrinters] = useState<PrinterState[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedPrinter, setSelectedPrinter] = useState<string>('')

  useEffect(() => {
    if (isOpen) {
      loadAvailablePrinters()
    }
  }, [isOpen])

  const loadAvailablePrinters = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/home-assistant/printers')
      const data = await response.json()
      
      if (data.success) {
        setAvailablePrinters(data.printers)
      } else {
        setError(data.error || 'Errore nel caricamento delle stampanti disponibili')
      }
    } catch (err) {
      setError('Errore nel caricamento delle stampanti disponibili')
      console.error('Errore caricamento stampanti disponibili:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = () => {
    if (!selectedPrinter) {
      setError('Seleziona una stampante')
      return
    }
    
    onAdd(selectedPrinter)
  }

  const handleClose = () => {
    setSelectedPrinter('')
    setError(null)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Aggiungi Stampante
            </h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Seleziona Stampante
            </label>
            
            {loading ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : availablePrinters.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  Nessuna stampante trovata in Home Assistant
                </p>
                <button
                  onClick={loadAvailablePrinters}
                  className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  Riprova
                </button>
              </div>
            ) : (
              <select
                value={selectedPrinter}
                onChange={(e) => setSelectedPrinter(e.target.value)}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Seleziona una stampante...</option>
                {availablePrinters.map((printer) => (
                  <option key={printer.unique_id} value={printer.unique_id}>
                    {printer.friendly_name || printer.unique_id} ({printer.state})
                  </option>
                ))}
              </select>
            )}
          </div>

          {selectedPrinter && (
            <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                Informazioni Stampante
              </h4>
              {(() => {
                const printer = availablePrinters.find(p => p.unique_id === selectedPrinter)
                if (!printer) return null
                
                return (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Nome:</span>
                      <span className="text-gray-900 dark:text-white">{printer.friendly_name || printer.unique_id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Stato:</span>
                      <span className="text-gray-900 dark:text-white">{printer.state}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">ID Unico:</span>
                      <span className="text-gray-900 dark:text-white font-mono text-xs">{printer.unique_id}</span>
                    </div>
                  </div>
                )
              })()}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleClose}
              className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
            >
              Annulla
            </button>
            <button
              onClick={handleAdd}
              disabled={!selectedPrinter || loading}
              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Aggiungi
            </button>
          </div>
        </div>
      </div>
    </div>
  )
} 