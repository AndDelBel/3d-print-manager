'use client'

import { useState } from 'react'
import { testGcodeParser } from '@/utils/testGcodeParser'

export default function TestGcodeParserPage() {
  const [result, setResult] = useState<{
    metadata: Record<string, unknown>
    isBambuLab: boolean
    isAutomatic: boolean
    materialName: string
    printSettingsName: string
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleTest = async () => {
    setLoading(true)
    setError(null)
    setResult(null)
    
    try {
      const testResult = await testGcodeParser()
      setResult(testResult)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore sconosciuto')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Test Parser G-code</h1>
      
      <div className="mb-6">
        <button 
          onClick={handleTest}
          disabled={loading}
          className="btn btn-primary"
        >
          {loading ? (
            <>
              <span className="loading loading-spinner loading-sm"></span>
              Analizzando...
            </>
          ) : (
            '🔍 Analizza File Esempio'
          )}
        </button>
      </div>

      {error && (
        <div className="alert alert-error mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {result && (
        <div className="space-y-6">
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">Risultati Analisi</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="stat">
                  <div className="stat-title">Stampante Bambu Lab</div>
                  <div className={`stat-value ${result.isBambuLab ? 'text-success' : 'text-error'}`}>
                    {result.isBambuLab ? '✅ Sì' : '❌ No'}
                  </div>
                </div>
                
                <div className="stat">
                  <div className="stat-title">Profilo Automatico</div>
                  <div className={`stat-value ${result.isAutomatic ? 'text-success' : 'text-error'}`}>
                    {result.isAutomatic ? '✅ Sì' : '❌ No'}
                  </div>
                </div>
                
                <div className="stat">
                  <div className="stat-title">Materiale</div>
                  <div className="stat-value text-lg">{result.materialName}</div>
                </div>
                
                <div className="stat">
                  <div className="stat-title">Impostazioni Stampa</div>
                  <div className="stat-value text-lg">{result.printSettingsName}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">Metadati Completi</h2>
              <div className="overflow-x-auto">
                <pre className="bg-base-200 p-4 rounded-lg text-sm overflow-x-auto">
                  {JSON.stringify(result.metadata, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 