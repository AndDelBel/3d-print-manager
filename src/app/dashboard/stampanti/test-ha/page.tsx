'use client'

import { useState, useEffect } from 'react'
import { getAvailablePrinters } from '@/services/homeAssistant'
import type { PrinterState } from '@/types/homeAssistant'
import { AlertMessage } from '@/components/AlertMessage'
import { LoadingButton } from '@/components/LoadingButton'

export default function TestHAPage() {
  const [printers, setPrinters] = useState<PrinterState[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const testConnection = async () => {
    setLoading(true)
    setError(null)

    try {
      const availablePrinters = await getAvailablePrinters()
      setPrinters(availablePrinters)
    } catch (err) {
      setError('Errore nella connessione a Home Assistant')
      console.error('Errore test HA:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    testConnection()
  }, [])

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
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Test Home Assistant</h1>
        <LoadingButton
          onClick={testConnection}
          loading={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Test Connessione
        </LoadingButton>
      </div>

      {error && <AlertMessage type="error" message={error} onClose={() => setError(null)} />}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {printers.map((printer) => (
          <div key={printer.entity_id} className="bg-white rounded-lg shadow-md p-6 border">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold">
                  {printer.attributes.friendly_name || printer.entity_id}
                </h3>
                <p className="text-sm text-gray-500">{printer.entity_id}</p>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(printer.state)}`}>
                {printer.state}
              </span>
            </div>

            <div className="space-y-2">
              {printer.attributes.current_temperature && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Temperatura Nozzle:</span>
                  <span className="font-medium">{printer.attributes.current_temperature}°C</span>
                </div>
              )}
              
              {printer.attributes.bed_temperature && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Temperatura Piatto:</span>
                  <span className="font-medium">{printer.attributes.bed_temperature}°C</span>
                </div>
              )}
              
              {printer.attributes.print_progress !== undefined && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Progresso:</span>
                  <span className="font-medium">{printer.attributes.print_progress.toFixed(1)}%</span>
                </div>
              )}
              
              {printer.attributes.current_file && (
                <div>
                  <span className="text-sm text-gray-600">File corrente:</span>
                  <p className="text-sm font-medium truncate" title={printer.attributes.current_file}>
                    {printer.attributes.current_file}
                  </p>
                </div>
              )}
              
              {printer.attributes.last_update && (
                <div className="text-xs text-gray-500 mt-2">
                  Ultimo aggiornamento: {new Date(printer.attributes.last_update).toLocaleString()}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {printers.length === 0 && !loading && (
        <div className="text-center py-8">
          <p className="text-gray-500">Nessuna stampante trovata in Home Assistant</p>
          <p className="text-sm text-gray-400 mt-2">
            Assicurati che Home Assistant sia configurato correttamente e che ci siano entità stampante disponibili.
          </p>
        </div>
      )}
    </div>
  )
} 