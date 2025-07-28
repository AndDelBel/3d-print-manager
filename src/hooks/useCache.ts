import { useEffect, useCallback } from 'react'
import { cleanUrlCache } from '@/services/file'
import { cleanOrgCache } from '@/services/organizzazione'
import { cleanDisplayNameCache } from '@/utils/fileUtils'

// Cache management hook for periodic cleanup
export function useCache() {
  const cleanAllCaches = useCallback(() => {
    cleanUrlCache()
    cleanOrgCache() 
    cleanDisplayNameCache()
  }, [])

  // Clean caches every 5 minutes
  useEffect(() => {
    const interval = setInterval(cleanAllCaches, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [cleanAllCaches])

  // Clean caches on page visibility change (when user returns to tab)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        cleanAllCaches()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [cleanAllCaches])

  return {
    cleanAllCaches
  }
}