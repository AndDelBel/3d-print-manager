'use client'

import { useState, useEffect, useCallback } from 'react'
import { getAvailablePrinters } from '@/services/homeAssistant'
import type { PrinterState } from '@/types/homeAssistant'
import { AlertMessage } from './AlertMessage'
import { LoadingButton } from './LoadingButton'

interface AvailablePrintersProps {
  onPrinterSelect?: (printer: PrinterState) => void
}

export function AvailablePrinters({ onPrinterSelect }: AvailablePrintersProps) {
  const [printers, setPrinters] = useState<PrinterState[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadPrinters = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      console.log('Caricamento stampanti disponibili...')
      const availablePrinters = await getAvailablePrinters()
      console.log('Stampanti trovate:', availablePrinters)
      setPrinters(availablePrinters)
    } catch (err) {
      setError('Errore nel caricamento delle stampanti disponibili')
      console.error('Errore caricamento stampanti:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadPrinters()
  }, [loadPrinters])

  const getStatusColor = (state: string) => {
    switch (state) {
      case 'idle': return 'bg-green-100 text-green-800'
      case 'printing': return 'bg-blue-100 text-blue-800'
      case 'paused': return 'bg-yellow-100 text-yellow-800'
      case 'error': return 'bg-red-100 text-red-800'
      case 'offline': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="bg-base-200 rounded-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Stampanti Disponibili in Home Assistant</h3>
        <LoadingButton
          onClick={loadPrinters}
          loading={loading}
          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
        >
          Aggiorna
        </LoadingButton>
      </div>

      {error && <AlertMessage type="error" message={error} onClose={() => setError(null)} />}

      {loading ? (
        <div className="text-center py-4">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-sm text-gray-600">Caricamento stampanti...</p>
        </div>
      ) : printers.length === 0 ? (
        <div className="text-center py-4">
          <p className="text-gray-500">Nessuna stampante trovata</p>
          <p className="text-sm text-gray-400 mt-1">
            {error ? 'Errore nella configurazione di Home Assistant' : 'Verifica la configurazione di Home Assistant'}
          </p>
          {!error && (
            <p className="text-xs text-gray-500 mt-2">
              Configura Home Assistant nella sezione superiore per vedere le stampanti disponibili
            </p>
          )}
          <p className="text-xs text-gray-500 mt-2">
            Debug: {printers.length} stampanti caricate
          </p>
        </div>
      ) : (
        <div>
          <p className="text-xs text-gray-500 mb-2">
            Debug: Trovate {printers.length} stampanti
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {printers.map((printer) => (
              <div 
                key={printer.entity_id} 
                className="bg-base-100 rounded-lg p-4 border border-base-300 hover:border-primary cursor-pointer"
                onClick={() => onPrinterSelect?.(printer)}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">
                      {printer.attributes.friendly_name || printer.entity_id}
                    </h4>
                    <p className="text-xs text-gray-500 truncate">{printer.entity_id}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(printer.state)}`}>
                    {printer.state}
                  </span>
                </div>

                <div className="text-xs text-gray-600 space-y-1">
                  {printer.attributes.current_temperature && (
                    <div>Nozzle: {printer.attributes.current_temperature}°C</div>
                  )}
                  {printer.attributes.bed_temperature && (
                    <div>Piatto: {printer.attributes.bed_temperature}°C</div>
                  )}
                  {printer.attributes.print_progress !== undefined && (
                    <div>Progresso: {printer.attributes.print_progress.toFixed(1)}%</div>
                  )}
                </div>

                {onPrinterSelect && (
                  <div className="mt-2 text-xs text-primary">
                    Clicca per selezionare
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
} 