import { useState, useCallback, useRef, useEffect } from 'react'

interface CacheEntry<T> {
  data: T
  timestamp: number
  loading: boolean
  error: string | null
}

interface CacheOptions {
  ttl?: number // Time to live in milliseconds
  staleWhileRevalidate?: boolean // Return stale data while fetching new
}

class CacheManager {
  private cache = new Map<string, CacheEntry<unknown>>()
  private promises = new Map<string, Promise<unknown>>()
  
  get<T>(key: string): CacheEntry<T> | undefined {
    return this.cache.get(key) as CacheEntry<T> | undefined
  }
  
  set<T>(key: string, data: T, error: string | null = null): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      loading: false,
      error
    })
  }
  
  setLoading(key: string): void {
    const existing = this.cache.get(key)
    this.cache.set(key, {
      data: existing?.data || null,
      timestamp: existing?.timestamp || 0,
      loading: true,
      error: null
    })
  }
  
  isStale(key: string, ttl: number): boolean {
    const entry = this.cache.get(key)
    if (!entry) return true
    return Date.now() - entry.timestamp > ttl
  }
  
  getPromise<T>(key: string): Promise<T> | undefined {
    return this.promises.get(key) as Promise<T> | undefined
  }
  
  setPromise<T>(key: string, promise: Promise<T>): void {
    this.promises.set(key, promise)
    
    // Clean up promise when resolved
    promise.finally(() => {
      this.promises.delete(key)
    })
  }
  
  clear(key?: string): void {
    if (key) {
      this.cache.delete(key)
      this.promises.delete(key)
    } else {
      this.cache.clear()
      this.promises.clear()
    }
  }
  
  // Periodic cleanup of expired entries
  cleanup(ttl: number): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > ttl * 2) {
        this.cache.delete(key)
      }
    }
  }
}

// Global cache instance
const globalCache = new CacheManager()

// Cleanup every 10 minutes
setInterval(() => {
  globalCache.cleanup(10 * 60 * 1000)
}, 10 * 60 * 1000)

export function useCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CacheOptions = {}
) {
  const { ttl = 5 * 60 * 1000, staleWhileRevalidate = true } = options
  
  const [state, setState] = useState<{
    data: T | null
    loading: boolean
    error: string | null
  }>(() => {
    const cached = globalCache.get<T>(key)
    return {
      data: cached?.data || null,
      loading: cached?.loading || false,
      error: cached?.error || null
    }
  })
  
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher
  
  const fetchData = useCallback(async (forceRefresh = false) => {
    const cached = globalCache.get<T>(key)
    const isStale = globalCache.isStale(key, ttl)
    
    // Return cached data if fresh and not forcing refresh
    if (!forceRefresh && cached && !isStale && !cached.loading) {
      setState({
        data: cached.data,
        loading: false,
        error: cached.error
      })
      return cached.data
    }
    
    // Check for ongoing promise to avoid duplicate requests
    const existingPromise = globalCache.getPromise<T>(key)
    if (existingPromise) {
      try {
        const data = await existingPromise
        setState({
          data,
          loading: false,
          error: null
        })
        return data
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        setState({
          data: cached?.data || null,
          loading: false,
          error: errorMessage
        })
        throw error
      }
    }
    
    // Start loading state
    if (!staleWhileRevalidate || !cached?.data) {
      setState(prev => ({ ...prev, loading: true, error: null }))
      globalCache.setLoading(key)
    }
    
    // Create new fetch promise
    const promise = fetcherRef.current()
    globalCache.setPromise(key, promise)
    
    try {
      const data = await promise
      
      // Update cache and state
      globalCache.set(key, data)
      setState({
        data,
        loading: false,
        error: null
      })
      
      return data
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      // Update cache and state with error
      globalCache.set(key, cached?.data || null, errorMessage)
      setState({
        data: cached?.data || null,
        loading: false,
        error: errorMessage
      })
      
      throw error
    }
  }, [key, ttl, staleWhileRevalidate])
  
  // Auto-fetch on mount and when key changes
  useEffect(() => {
    fetchData().catch(() => {
      // Error already handled in fetchData
    })
  }, [fetchData])
  
  // Provide methods to manually control cache
  const invalidate = useCallback(() => {
    globalCache.clear(key)
    return fetchData(true)
  }, [key, fetchData])
  
  const refresh = useCallback(() => {
    return fetchData(true)
  }, [fetchData])
  
  const clearCache = useCallback(() => {
    globalCache.clear(key)
    setState({
      data: null,
      loading: false,
      error: null
    })
  }, [key])
  
  return {
    ...state,
    refresh,
    invalidate,
    clearCache,
    isStale: globalCache.isStale(key, ttl)
  }
}

// Utility hook for multiple cache keys
export function useMultiCache<T>(
  keys: string[],
  fetchers: Array<() => Promise<T>>,
  options: CacheOptions = {}
) {
  const results = keys.map((key, index) => 
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useCache(key, fetchers[index], options)
  )
  
  const isLoading = results.some(r => r.loading)
  const hasError = results.some(r => r.error)
  const allData = results.map(r => r.data)
  
  const refreshAll = useCallback(() => {
    return Promise.all(results.map(r => r.refresh()))
  }, [results])
  
  const invalidateAll = useCallback(() => {
    return Promise.all(results.map(r => r.invalidate()))
  }, [results])
  
  return {
    results,
    allData,
    isLoading,
    hasError,
    refreshAll,
    invalidateAll
  }
}

// Export global cache for manual operations
export { globalCache }