'use client'

import React, { useState } from 'react'
import { testKlipperAPI, testBambuAPI, testWithMockData } from '@/utils/printerApiTest'
import { LoadingButton } from '@/components/LoadingButton'
import { AlertMessage } from '@/components/AlertMessage'
import { APILogViewer } from '@/components/APILogViewer'

export default function TestAPIStampantiPage() {
  const [testType, setTestType] = useState<'klipper' | 'bambu' | 'mock'>('mock')
  const [endpoint, setEndpoint] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; data?: any; error?: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showLogs, setShowLogs] = useState(false)

  const handleTest = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      let testResult

      if (testType === 'mock') {
        // Test con dati mock
        const mockType = Math.random() > 0.5 ? 'klipper' : 'bambu'
        testResult = testWithMockData(mockType)
        console.log('Mock test result:', testResult)
      } else {
        // Test API reale tramite server
        if (!endpoint) {
          throw new Error('Endpoint richiesto per test API')
        }
        
        const response = await fetch('/api/stampanti/test', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            endpoint,
            tipo_sistema: testType,
            api_key: apiKey || undefined
          })
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        testResult = await response.json()
      }

      setResult(testResult)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore sconosciuto')
    } finally {
      setLoading(false)
    }
  }

  const getEndpointPlaceholder = () => {
    switch (testType) {
      case 'klipper':
        return 'http://192.168.1.100:7125'
      case 'bambu':
        return 'https://api.bambulab.com'
      default:
        return 'Endpoint API'
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Test API Stampanti</h1>

      <div className="bg-base-200 rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Configurazione Test</h2>

        <div className="space-y-4">
          {/* Tipo di test */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Tipo di Test
            </label>
            <select
              value={testType}
              onChange={(e) => setTestType(e.target.value as 'klipper' | 'bambu' | 'mock')}
              className="select select-bordered w-full"
            >
              <option value="mock">Test con Dati Mock</option>
              <option value="klipper">Test API Klipper Reale</option>
              <option value="bambu">Test API Bambu Reale</option>
            </select>
          </div>

          {/* Endpoint */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Endpoint API
            </label>
            <input
              type="url"
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              placeholder={getEndpointPlaceholder()}
              className="input input-bordered w-full"
            />
          </div>

          {/* API Key */}
          <div>
            <label className="block text-sm font-medium mb-2">
              API Key (opzionale per Klipper)
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="API Key"
              className="input input-bordered w-full"
            />
          </div>

          {/* Pulsanti */}
          <div className="flex gap-2">
            <LoadingButton
              onClick={handleTest}
              loading={loading}
              className="btn btn-primary flex-1"
            >
              Esegui Test
            </LoadingButton>
            <button
              onClick={() => setShowLogs(true)}
              className="btn btn-secondary"
            >
              📊 Log API
            </button>
          </div>
        </div>
      </div>

      {/* Risultati */}
      {error && (
        <AlertMessage 
          type="error" 
          message={error} 
          onClose={() => setError(null)} 
        />
      )}

      {result && (
        <div className="bg-base-200 rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold mb-4">Risultati Test</h2>
          
          <div className="mb-4">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              result.success 
                ? 'bg-success/20 text-success' 
                : 'bg-error/20 text-error'
            }`}>
              {result.success ? '✅ Successo' : '❌ Errore'}
            </span>
          </div>

          {result.error && (
            <div className="mb-4 p-3 bg-error/10 border border-error/20 rounded text-error">
              <strong>Errore:</strong> {result.error}
            </div>
          )}

          {result.data && (
            <div>
              <h3 className="font-medium mb-2">Dati Ricevuti:</h3>
              <pre className="bg-base-300 p-4 rounded text-sm overflow-auto max-h-96">
                {JSON.stringify(result.data, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Istruzioni */}
      <div className="bg-info/10 rounded-lg p-6 mt-6">
        <h3 className="text-lg font-semibold mb-4">Istruzioni per il Test</h3>
        
        <div className="space-y-3 text-sm">
          <div>
            <strong>Test con Dati Mock:</strong> Simula una risposta API senza connessione reale
          </div>
          
          <div>
            <strong>Test API Klipper:</strong>
            <ul className="ml-4 mt-1 space-y-1">
              <li>• Endpoint: http://IP_STAMPANTE:7125</li>
              <li>• Esempio: http://192.168.1.100:7125</li>
              <li>• API Key: opzionale</li>
            </ul>
          </div>
          
          <div>
            <strong>Test API Bambu Lab:</strong>
            <ul className="ml-4 mt-1 space-y-1">
              <li>• Endpoint: https://api.bambulab.com</li>
              <li>• API Key: Access Code dalla stampante</li>
              <li>• Richiede autenticazione OAuth</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Log Viewer */}
      <APILogViewer 
        isOpen={showLogs} 
        onClose={() => setShowLogs(false)} 
      />
    </div>
  )
} 