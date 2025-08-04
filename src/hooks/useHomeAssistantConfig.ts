import { useState, useEffect } from 'react'
import { getHomeAssistantConfig } from '@/services/homeAssistantConfig'
import type { HomeAssistantConfig } from '@/types/homeAssistantConfig'

export function useHomeAssistantConfig() {
  const [config, setConfig] = useState<HomeAssistantConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadConfig = async () => {
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
  }

  useEffect(() => {
    loadConfig()
  }, [])

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