'use client'

import { useState } from 'react'
import { useUser } from '@/hooks/useUser'
import { supabase } from '@/lib/supabaseClient'

interface NullStats {
  total: number
  withNulls: number
  nullFields: {
    peso_grammi: number
    tempo_stampa_min: number
    materiale: number
    stampante: number
  }
  percentages: {
    peso_grammi: number
    tempo_stampa_min: number
    materiale: number
    stampante: number
  }
}

export default function GcodeReanalyzeTool() {
  const { user, loading: userLoading } = useUser()
  const [stats, setStats] = useState<NullStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [reanalyzing, setReanalyzing] = useState(false)
  const [result, setResult] = useState<{
    success: boolean
    message: string
    reanalyzed: number
    errors: number
    errorDetails?: string[]
  } | null>(null)

  // Solo per superuser
  if (userLoading || !user?.is_superuser) {
    return null
  }

  const fetchStats = async () => {
    setLoading(true)
    try {
      // Ottieni il token di accesso dalla sessione Supabase
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        console.error('Nessuna sessione attiva')
        return
      }

      const response = await fetch('/api/gcode/null-stats', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })
      const data = await response.json()
      
      if (data.success) {
        setStats(data.stats)
      } else {
        console.error('Errore nel recupero statistiche:', data.error)
      }
    } catch (error) {
      console.error('Errore:', error)
    } finally {
      setLoading(false)
    }
  }

  const reanalyzeGcodes = async () => {
    setReanalyzing(true)
    setResult(null)
    
    try {
      // Ottieni il token di accesso dalla sessione Supabase
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        console.error('Nessuna sessione attiva')
        setResult({
          success: false,
          message: 'Nessuna sessione attiva',
          reanalyzed: 0,
          errors: 1
        })
        return
      }

      const response = await fetch('/api/gcode/reanalyze-null', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })
      const data = await response.json()
      
      setResult(data)
      
      // Ricarica le statistiche dopo la rianalisi
      if (data.success) {
        await fetchStats()
      }
    } catch (error) {
      console.error('Errore durante rianalisi:', error)
      setResult({
        success: false,
        message: 'Errore durante la rianalisi',
        reanalyzed: 0,
        errors: 1
      })
    } finally {
      setReanalyzing(false)
    }
  }

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <h2 className="card-title text-2xl mb-4">
          🔄 Strumento Rianalisi G-code
        </h2>
        
        <div className="text-sm text-base-content/70 mb-4">
          Questo strumento permette di rianalizzare automaticamente tutti i gcode nel database 
          che hanno valori nulli per peso, tempo di stampa, materiale o stampante.
        </div>

        {/* Pulsante per caricare statistiche */}
        <div className="mb-6">
          <button
            onClick={fetchStats}
            disabled={loading}
            className="btn btn-primary"
          >
            {loading ? (
              <>
                <span className="loading loading-spinner loading-sm"></span>
                Caricamento...
              </>
            ) : (
              '📊 Carica Statistiche'
            )}
          </button>
        </div>

        {/* Statistiche */}
        {stats && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">Statistiche G-code con Valori Nulli</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="stat bg-base-200 rounded-lg p-4">
                <div className="stat-title">Totale G-code</div>
                <div className="stat-value text-primary">{stats.total}</div>
              </div>
              
              <div className="stat bg-base-200 rounded-lg p-4">
                <div className="stat-title">Con Valori Nulli</div>
                <div className="stat-value text-warning">{stats.withNulls}</div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="table table-zebra w-full">
                <thead>
                  <tr>
                    <th>Campo</th>
                    <th>Valori Nulli</th>
                    <th>Percentuale</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Peso (grammi)</td>
                    <td>{stats.nullFields.peso_grammi}</td>
                    <td>{stats.percentages.peso_grammi}%</td>
                  </tr>
                  <tr>
                    <td>Tempo Stampa (min)</td>
                    <td>{stats.nullFields.tempo_stampa_min}</td>
                    <td>{stats.percentages.tempo_stampa_min}%</td>
                  </tr>
                  <tr>
                    <td>Materiale</td>
                    <td>{stats.nullFields.materiale}</td>
                    <td>{stats.percentages.materiale}%</td>
                  </tr>
                  <tr>
                    <td>Stampante</td>
                    <td>{stats.nullFields.stampante}</td>
                    <td>{stats.percentages.stampante}%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pulsante rianalisi */}
        {stats && stats.withNulls > 0 && (
          <div className="mb-6">
            <button
              onClick={reanalyzeGcodes}
              disabled={reanalyzing}
              className="btn btn-warning btn-lg"
            >
              {reanalyzing ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  Rianalisi in corso...
                </>
              ) : (
                <>
                  🔄 Rianalizza {stats.withNulls} G-code
                </>
              )}
            </button>
            
            <div className="text-sm text-warning mt-2">
              ⚠️ Questa operazione potrebbe richiedere diversi minuti a seconda del numero di file.
            </div>
          </div>
        )}

        {/* Risultato */}
        {result && (
          <div className={`alert ${result.success ? 'alert-success' : 'alert-error'}`}>
            <div>
              <h3 className="font-bold">
                {result.success ? '✅ Rianalisi Completata' : '❌ Errore durante Rianalisi'}
              </h3>
              <div className="text-sm">
                <p>{result.message}</p>
                {result.reanalyzed > 0 && (
                  <p>G-code aggiornati: {result.reanalyzed}</p>
                )}
                {result.errors > 0 && (
                  <p>Errori: {result.errors}</p>
                )}
                {result.errorDetails && result.errorDetails.length > 0 && (
                  <details className="mt-2">
                    <summary className="cursor-pointer">Dettagli errori</summary>
                    <ul className="list-disc list-inside mt-2">
                      {result.errorDetails.map((error, index) => (
                        <li key={index} className="text-xs">{error}</li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            </div>
          </div>
        )}

        {stats && stats.withNulls === 0 && (
          <div className="alert alert-success">
            <div>
              <h3 className="font-bold">🎉 Tutti i G-code sono completi!</h3>
              <div className="text-sm">
                Non ci sono gcode con valori nulli da rianalizzare.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
