import { useState, useEffect, useCallback } from 'react'
import { useRetryFetch } from '@/hooks/useRetryFetch'
import { getHomeAssistantConfig } from '@/services/homeAssistantConfig'
import type { HomeAssistantConfig } from '@/types/homeAssistantConfig'

export function useHomeAssistantConfig() {
  const [config, setConfig] = useState<HomeAssistantConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadConfig = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const configData = await getHomeAssistantConfig()
      setConfig(configData)
    } catch (err) {
      setError('Errore nel caricamento della configurazione')
      console.error('Errore caricamento config HA:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // Retry automatico ogni 10 secondi quando in loading
  useRetryFetch(loading, loadConfig, {
    retryInterval: 10000,
    enabled: true
  })

  useEffect(() => {
    loadConfig()
  }, [loadConfig])

  const refreshConfig = () => {
    loadConfig()
  }

  return {
    config,
    loading,
    error,
    refreshConfig
  }
} 