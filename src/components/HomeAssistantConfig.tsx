'use client'

import { useState, useEffect } from 'react'
import { AlertMessage } from './AlertMessage'
import { LoadingButton } from './LoadingButton'
import type { HomeAssistantConfig } from '@/types/homeAssistantConfig'
import { clearHomeAssistantConfigCache } from '@/services/homeAssistant'
import { useHomeAssistantConfig } from '@/hooks/useHomeAssistantConfig'

interface HomeAssistantConfigProps {
  onConfigSaved?: () => void
}

export function HomeAssistantConfig({ onConfigSaved }: HomeAssistantConfigProps) {
  const { config: existingConfig, loading: configLoading, error: configError, refreshConfig } = useHomeAssistantConfig()
  const [config, setConfig] = useState<Partial<HomeAssistantConfig>>({
    base_url: '',
    access_token: '',
    entity_prefix: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Aggiorna il form quando la configurazione viene caricata
  useEffect(() => {
    if (existingConfig && !config.base_url && !config.access_token) {
      setConfig({
        base_url: existingConfig.base_url,
        access_token: existingConfig.access_token,
        entity_prefix: existingConfig.entity_prefix || ''
      })
    }
  }, [existingConfig, config.base_url, config.access_token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/home-assistant/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      })

      const data = await response.json()

      if (data.success) {
        setSuccess('Configurazione salvata con successo! Usa il pulsante "Aggiorna Stampanti" per vedere le modifiche.')
        clearHomeAssistantConfigCache() // Pulisce la cache
        refreshConfig() // Ricarica la configurazione
        // Non chiamiamo onConfigSaved automaticamente per evitare re-render
        // onConfigSaved?.()
      } else {
        setError(data.error || 'Errore nel salvataggio')
      }
    } catch (error) {
      setError('Errore di connessione')
    } finally {
      setLoading(false)
    }
  }

  const handleTestConnection = async () => {
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/home-assistant/printers')
      const data = await response.json()

      if (data.success) {
        setSuccess(`Connessione riuscita! Trovate ${data.printers.length} stampanti disponibili.`)
      } else {
        setError('Errore nella connessione a Home Assistant')
      }
    } catch (error) {
      setError('Errore di connessione a Home Assistant')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-base-200 rounded-lg p-6">
      <h3 className="text-lg font-semibold mb-4">Configurazione Home Assistant</h3>
      
      {configError && <AlertMessage type="error" message={configError} onClose={() => {}} />}
      {error && <AlertMessage type="error" message={error} onClose={() => setError(null)} />}
      {success && <AlertMessage type="success" message={success} onClose={() => setSuccess(null)} />}
      
      {!configLoading && (!existingConfig || !existingConfig.base_url || !existingConfig.access_token) && (
        <div className="mb-4 p-3 bg-info/10 border border-info/20 rounded text-info text-sm">
          <strong>Configurazione richiesta:</strong> Inserisci l&apos;URL e il token di Home Assistant per abilitare il monitoraggio delle stampanti.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            URL Home Assistant
          </label>
          <input
            type="url"
            value={config.base_url}
            onChange={(e) => setConfig({ ...config, base_url: e.target.value })}
            placeholder="http://192.168.1.100:8123"
            className="w-full p-2 border rounded bg-base-100"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Access Token
          </label>
          <input
            type="password"
            value={config.access_token}
            onChange={(e) => setConfig({ ...config, access_token: e.target.value })}
            placeholder="Inserisci il tuo access token"
            className="w-full p-2 border rounded bg-base-100"
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            Puoi generare un token in Home Assistant: Profilo → Token di accesso
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Prefisso Entità (opzionale)
          </label>
          <input
            type="text"
            value={config.entity_prefix || ''}
            onChange={(e) => setConfig({ ...config, entity_prefix: e.target.value })}
            placeholder="printer."
            className="w-full p-2 border rounded bg-base-100"
          />
                     <p className="text-xs text-gray-500 mt-1">
             Prefisso per filtrare le entità stampante (es: &quot;printer.&quot;)
           </p>
        </div>

        <div className="flex gap-2">
          <LoadingButton
            type="submit"
            loading={loading || configLoading}
            className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-focus"
          >
            Salva Configurazione
          </LoadingButton>
          
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={loading || configLoading || !config.base_url || !config.access_token}
            className="px-4 py-2 bg-secondary text-white rounded hover:bg-secondary-focus disabled:opacity-50"
          >
            Test Connessione
          </button>
          
          {onConfigSaved && (
            <button
              type="button"
              onClick={onConfigSaved}
              className="px-4 py-2 bg-success text-white rounded hover:bg-success-focus"
            >
              Aggiorna Stampanti
            </button>
          )}
        </div>
      </form>
    </div>
  )
} 