import { useEffect, useRef, useCallback } from 'react'

interface UseRetryFetchOptions {
  retryInterval?: number // in millisecondi, default 10000 (10 secondi)
  maxRetries?: number // numero massimo di tentativi, default -1 (infinito)
  enabled?: boolean // se abilitare il retry automatico, default true
}

export function useRetryFetch(
  loading: boolean,
  fetchFunction: () => Promise<void>,
  options: UseRetryFetchOptions = {}
) {
  const {
    retryInterval = 10000,
    maxRetries = -1,
    enabled = true
  } = options

  const retryCountRef = useRef(0)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const startRetryTimer = useCallback(() => {
    if (!enabled || (maxRetries !== -1 && retryCountRef.current >= maxRetries)) {
      return
    }

    // Pulisci l'intervallo esistente
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    // Avvia il timer per il retry
    intervalRef.current = setInterval(() => {
      if (loading) {
        retryCountRef.current++
        fetchFunction()
      }
    }, retryInterval)
  }, [loading, fetchFunction, retryInterval, maxRetries, enabled])

  const stopRetryTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const resetRetryCount = useCallback(() => {
    retryCountRef.current = 0
  }, [])

  useEffect(() => {
    if (loading && enabled) {
      startRetryTimer()
    } else {
      stopRetryTimer()
      if (!loading) {
        resetRetryCount()
      }
    }

    return () => {
      stopRetryTimer()
    }
  }, [loading, enabled, startRetryTimer, stopRetryTimer, resetRetryCount])

  return {
    retryCount: retryCountRef.current,
    resetRetryCount,
    stopRetryTimer
  }
} 