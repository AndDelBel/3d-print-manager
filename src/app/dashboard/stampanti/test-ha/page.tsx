'use client'

import { useState, useEffect } from 'react'
import { getAvailablePrinters } from '@/services/homeAssistant'
import type { PrinterState } from '@/types/homeAssistant'

export default function TestHAPage() {
  const [printers, setPrinters] = useState<PrinterState[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadPrinters = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const data = await getAvailablePrinters()
      setPrinters(data)
    } catch (err) {
      setError('Errore nel caricamento delle stampanti')
      console.error('Errore caricamento stampanti:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPrinters()
  }, [])

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Test Home Assistant
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Test dell'integrazione con Home Assistant
        </p>
      </div>

      <div className="mb-6">
        <button
          onClick={loadPrinters}
          disabled={loading}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg disabled:opacity-50"
        >
          {loading ? 'Caricamento...' : 'Aggiorna Dati'}
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      ) : printers.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">
            Nessuna stampante trovata in Home Assistant
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Stampanti Trovate ({printers.length})
          </h2>
          
          {printers.map((printer, index) => (
            <div key={index} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    {printer.friendly_name || printer.unique_id}
                  </h3>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Entity ID:</span>
                      <span className="text-gray-900 dark:text-white font-mono">{printer.entity_id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Unique ID:</span>
                      <span className="text-gray-900 dark:text-white font-mono">{printer.unique_id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Stato:</span>
                      <span className="text-gray-900 dark:text-white">{printer.state}</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">Dati Sensori</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Temperatura Ugello:</span>
                      <span className="text-gray-900 dark:text-white">
                        {printer.hotend_temperature ? `${printer.hotend_temperature}°C` : '--'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Temperatura Piatto:</span>
                      <span className="text-gray-900 dark:text-white">
                        {printer.bed_temperature ? `${printer.bed_temperature}°C` : '--'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Progresso:</span>
                      <span className="text-gray-900 dark:text-white">
                        {printer.print_progress ? `${printer.print_progress}%` : '--'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Tempo Rimanente:</span>
                      <span className="text-gray-900 dark:text-white">
                        {printer.time_remaining ? `${Math.floor(printer.time_remaining / 3600)}h ${Math.floor((printer.time_remaining % 3600) / 60)}m` : '--'}
                      </span>
                    </div>
                    {printer.current_file && (
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">File Corrente:</span>
                        <span className="text-gray-900 dark:text-white truncate max-w-xs" title={printer.current_file}>
                          {printer.current_file}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {printer.last_update && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Ultimo aggiornamento: {new Date(printer.last_update).toLocaleString('it-IT')}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
} 