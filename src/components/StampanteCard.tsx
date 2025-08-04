'use client'

import React, { useEffect, useState, useCallback } from 'react'
import type { Stampante, StampanteStatus } from '@/types/stampante'
import { getStampanteStatus } from '@/services/stampante'

interface StampanteCardProps {
  stampante: Stampante

  onEdit?: (stampante: Stampante) => void
  onDelete?: (id: number) => void
  onRefresh?: () => void
  isSuperuser?: boolean
}

export function StampanteCard({ stampante, onEdit, onDelete, onRefresh, isSuperuser }: StampanteCardProps) {
  const [status, setStatus] = useState<StampanteStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [controlLoading, setControlLoading] = useState<string | null>(null)

  const fetchStatus = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const statusData = await getStampanteStatus(stampante)
      if (statusData) {
        setStatus(statusData)
        // Se c'è un errore nei dati, mostralo
        if (statusData.error) {
          setError(statusData.error)
        }
      } else {
        setError('Impossibile recuperare i dati della stampante')
      }
    } catch (err) {
      setError('Errore nel recupero dati')
      console.error('Errore status stampante:', err)
    } finally {
      setLoading(false)
    }
  }, [stampante])

  const handleControl = async (action: string, params?: Record<string, unknown>) => {
    if (!isSuperuser) return

    setControlLoading(action)
    try {
      // Se la stampante ha un entity_id, usa Home Assistant
      if (stampante.entity_id) {
        const response = await fetch('/api/home-assistant/control', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            entity_id: stampante.entity_id,
            service: action,
            data: params 
          }),
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const result = await response.json()
        if (result.success) {
          // Ricarica lo status dopo il controllo
          setTimeout(fetchStatus, 1000)
        } else {
          setError(`Errore controllo: ${result.error}`)
        }
      } else {
        // Se non c'è entity_id, la stampante non è configurata per il controllo
        setError('Stampante non configurata per controllo remoto')
      }
    } catch (error) {
      setError(`Errore controllo: ${error instanceof Error ? error.message : 'Errore di connessione'}`)
    } finally {
      setControlLoading(null)
    }
  }

  useEffect(() => {
    fetchStatus()
    // Aggiorna ogni 30 secondi
    const interval = setInterval(fetchStatus, 30000)
    return () => clearInterval(interval)
  }, [stampante.id, fetchStatus])

  const getStatusColor = (stato: string) => {
    switch (stato) {
      case 'pronta': return 'bg-success/20 text-success'
      case 'in_stampa': return 'bg-primary/20 text-primary'
      case 'pausa': return 'bg-warning/20 text-warning'
      case 'errore': return 'bg-error/20 text-error'
      case 'offline': return 'bg-base-300 text-base-content'
      default: return 'bg-base-300 text-base-content'
    }
  }

  const getStatusIcon = (stato: string) => {
    switch (stato) {
      case 'pronta': return '🟢'
      case 'in_stampa': return '🟦'
      case 'pausa': return '🟡'
      case 'errore': return '🔴'
      case 'offline': return '⚫'
      default: return '⚪'
    }
  }

  const formatTime = (seconds?: number) => {
    if (!seconds) return '-'
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${hours}h ${minutes}m`
  }

  const formatTemperature = (temp?: number) => {
    return temp ? `${temp.toFixed(1)}°C` : '-'
  }

  return (
    <div className="bg-base-200 rounded-lg shadow-md p-6 border border-base-300 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-semibold">{stampante.nome}</h3>
          <p className="text-sm opacity-70">{stampante.modello || 'Modello non specificato'}</p>
          {stampante.seriale && (
            <p className="text-xs opacity-50">SN: {stampante.seriale}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status?.stato || 'offline')}`}>
            {getStatusIcon(status?.stato || 'offline')} {status?.stato || 'offline'}
          </span>
          <button
            onClick={() => {
              fetchStatus()
              onRefresh?.()
            }}
            disabled={loading}
            className="p-1 opacity-70 hover:opacity-100 disabled:opacity-50"
            title="Aggiorna"
          >
            🔄
          </button>
          {isSuperuser && (
            <div className="flex gap-1">
              <button
                onClick={() => onEdit?.(stampante)}
                className="p-1 text-primary hover:text-primary-focus"
                title="Modifica"
              >
                ✏️
              </button>
              <button
                onClick={() => onDelete?.(stampante.id)}
                className="p-1 text-error hover:text-error-focus"
                title="Elimina"
              >
                🗑️
              </button>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-error/10 border border-error/20 rounded text-error text-sm">
          {error}
        </div>
      )}

      {loading && (
        <div className="mb-4 text-center opacity-70 text-sm">
          Caricamento dati...
        </div>
      )}

      {status && (
        <div className="space-y-3">
          {/* Temperature */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-base-300 p-3 rounded">
              <div className="text-xs opacity-70">Nozzle</div>
              <div className="text-lg font-semibold text-error">
                {formatTemperature(status.temperatura_nozzle)}
              </div>
            </div>
            <div className="bg-base-300 p-3 rounded">
              <div className="text-xs opacity-70">Piatto</div>
              <div className="text-lg font-semibold text-info">
                {formatTemperature(status.temperatura_piatto)}
              </div>
            </div>
          </div>

          {/* Progresso stampa */}
          {status.stato === 'in_stampa' && status.percentuale_completamento !== undefined && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="opacity-70">Progresso</span>
                <span className="font-medium">{status.percentuale_completamento.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-base-300 rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${status.percentuale_completamento}%` }}
                />
              </div>
            </div>
          )}

          {/* Tempi */}
          {status.stato === 'in_stampa' && (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="opacity-70">Tempo rimanente</div>
                <div className="font-medium">{formatTime(status.tempo_rimanente)}</div>
              </div>
              <div>
                <div className="opacity-70">Tempo totale</div>
                <div className="font-medium">{formatTime(status.tempo_totale)}</div>
              </div>
            </div>
          )}

          {/* File corrente */}
          {status.nome_file_corrente && (
            <div className="text-sm">
              <div className="opacity-70">File corrente</div>
              <div className="font-medium truncate" title={status.nome_file_corrente}>
                {status.nome_file_corrente}
              </div>
            </div>
          )}

          {/* Controlli remoti */}
          {isSuperuser && stampante.endpoint_api && (
            <div className="border-t border-base-300 pt-3">
              <div className="text-xs opacity-70 mb-2">Controlli remoti</div>
              <div className="flex gap-2 flex-wrap">
                {status.stato === 'pronta' && (
                  <button
                    onClick={() => handleControl('start_print', { filename: 'test.gcode' })}
                    disabled={controlLoading === 'start_print'}
                    className="btn btn-success btn-xs"
                  >
                    {controlLoading === 'start_print' ? '⏳' : '▶️'} Start
                  </button>
                )}
                {status.stato === 'in_stampa' && (
                  <>
                    <button
                      onClick={() => handleControl('pause_print')}
                      disabled={controlLoading === 'pause_print'}
                      className="btn btn-warning btn-xs"
                    >
                      {controlLoading === 'pause_print' ? '⏳' : '⏸️'} Pausa
                    </button>
                    <button
                      onClick={() => handleControl('cancel_print')}
                      disabled={controlLoading === 'cancel_print'}
                      className="btn btn-error btn-xs"
                    >
                      {controlLoading === 'cancel_print' ? '⏳' : '⏹️'} Stop
                    </button>
                  </>
                )}
                {status.stato === 'pausa' && (
                  <button
                    onClick={() => handleControl('resume_print')}
                    disabled={controlLoading === 'resume_print'}
                    className="btn btn-primary btn-xs"
                  >
                    {controlLoading === 'resume_print' ? '⏳' : '▶️'} Resume
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Ultimo aggiornamento */}
          <div className="text-xs opacity-50 text-right">
            Ultimo aggiornamento: {new Date(status.ultimo_aggiornamento).toLocaleTimeString()}
          </div>
        </div>
      )}

      {/* Configurazione API */}
      {!stampante.entity_id && (
        <div className="mt-4 p-3 bg-warning/10 border border-warning/20 rounded text-warning text-sm">
          ⚠️ Stampante non configurata per monitoraggio remoto
          <br />
          <span className="text-xs">Aggiungi un Entity ID di Home Assistant per abilitare il monitoraggio</span>
        </div>
      )}
    </div>
  )
} 