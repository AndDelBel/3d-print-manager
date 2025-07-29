'use client'

import React, { useState, useEffect } from 'react'

interface APILog {
  timestamp: string
  stampante: string
  tipo: 'klipper' | 'bambu'
  endpoint: string
  success: boolean
  error?: string
  data?: Record<string, unknown>
}

interface APILogViewerProps {
  isOpen: boolean
  onClose: () => void
}

export function APILogViewer({ isOpen, onClose }: APILogViewerProps) {
  const [logs, setLogs] = useState<APILog[]>([])
  const [autoScroll, setAutoScroll] = useState(true)

  useEffect(() => {
    if (!isOpen) return

    // Simula log in tempo reale
    const interval = setInterval(() => {
      const newLog: APILog = {
        timestamp: new Date().toISOString(),
        stampante: `Stampante ${Math.floor(Math.random() * 5) + 1}`,
        tipo: Math.random() > 0.5 ? 'klipper' : 'bambu',
        endpoint: Math.random() > 0.5 
          ? 'http://192.168.1.100:7125' 
          : 'https://api.bambulab.com',
        success: Math.random() > 0.2,
        error: Math.random() > 0.8 ? 'Timeout di connessione' : undefined,
        data: Math.random() > 0.3 ? {
          temperatura_nozzle: 200 + Math.random() * 20,
          temperatura_piatto: 60 + Math.random() * 10,
          stato: Math.random() > 0.5 ? 'in_stampa' : 'pronta'
        } : undefined
      }

      setLogs(prev => [newLog, ...prev.slice(0, 49)]) // Mantieni solo gli ultimi 50 log
    }, 2000)

    return () => clearInterval(interval)
  }, [isOpen])

  const getStatusColor = (success: boolean) => {
    return success ? 'text-green-600' : 'text-red-600'
  }

  const getStatusIcon = (success: boolean) => {
    return success ? '✅' : '❌'
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Log API Stampanti</h2>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
              />
              Auto-scroll
            </label>
            <button
              onClick={() => setLogs([])}
              className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm"
            >
              Pulisci
            </button>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-sm overflow-y-auto max-h-[70vh]">
          {logs.length === 0 ? (
            <div className="text-gray-500">Nessun log disponibile...</div>
          ) : (
            logs.map((log, index) => (
              <div key={index} className="mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 text-xs">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  <span className={`font-bold ${getStatusColor(log.success)}`}>
                    {getStatusIcon(log.success)}
                  </span>
                  <span className="text-blue-400">
                    [{log.tipo.toUpperCase()}]
                  </span>
                  <span className="text-yellow-400">
                    {log.stampante}
                  </span>
                  <span className="text-gray-400">
                    {log.endpoint}
                  </span>
                </div>
                
                {log.error && (
                  <div className="ml-4 text-red-400 text-xs">
                    ERRORE: {log.error}
                  </div>
                )}
                
                {log.data && (
                  <div className="ml-4 text-xs">
                    <pre className="text-gray-300">
                      {JSON.stringify(log.data, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <div className="mt-4 text-xs text-gray-500">
          Mostrando {logs.length} log • Aggiornamento automatico ogni 2 secondi
        </div>
      </div>
    </div>
  )
} 