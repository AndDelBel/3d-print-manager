import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'
import type { User } from '@supabase/supabase-js'
import { getCurrentUser } from '@/services/utente'
import type { Utente } from '@/types/utente'


interface UserData {
  user: User | null
  loading: boolean
  error: string | null
}

// Cache for user session to avoid repeated calls
let userCache: { 
  user: User | null
  timestamp: number
  promise?: Promise<User | null>
} | null = null

const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export function useUser() {
  const router = useRouter()
  const [userData, setUserData] = useState<UserData>({
    user: null,
    loading: true,
    error: null
  })
  
  // Ref to track component mount state
  const mountedRef = useRef(true)

  // Memoized function to get user session
  const getUserSession = useCallback(async (): Promise<User | null> => {
    const now = Date.now()
    
    // Return cached user if still valid
    if (userCache && (now - userCache.timestamp) < CACHE_DURATION) {
      return userCache.user
    }

    // Return ongoing promise if exists
    if (userCache?.promise) {
      return userCache.promise
    }

    // Create new promise for fetching user
    const promise = supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) throw error
      const user = session?.user || null
      
      // Update cache
      userCache = {
        user,
        timestamp: now,
        promise: undefined
      }
      
      return user
    })

    // Store promise to avoid duplicate calls
    if (userCache) {
      userCache.promise = promise
    } else {
      userCache = {
        user: null,
        timestamp: now,
        promise
      }
    }

    return promise
  }, [])

  // Check authentication and redirect if needed
  const checkAuth = useCallback(async () => {
    if (!mountedRef.current) return

    try {
      setUserData(prev => ({ ...prev, loading: true, error: null }))
      
      const user = await getUserSession()
      
      if (!mountedRef.current) return

      if (!user) {
        router.replace('/auth/login')
        return
      }

      setUserData({
        user,
        loading: false,
        error: null
      })
    } catch (error) {
      if (!mountedRef.current) return
      
      console.error('Auth error:', error)
      setUserData({
        user: null,
        loading: false,
        error: error instanceof Error ? error.message : 'Errore di autenticazione'
      })
      router.replace('/auth/login')
    }
  }, [getUserSession, router])

  // Refresh user data
  const refreshUser = useCallback(() => {
    userCache = null // Clear cache
    checkAuth()
  }, [checkAuth])

  useEffect(() => {
    mountedRef.current = true
    
    // Initial auth check
    checkAuth()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mountedRef.current) return

        // Clear cache on auth changes
        userCache = null

        if (event === 'SIGNED_OUT' || !session?.user) {
          setUserData({
            user: null,
            loading: false,
            error: null
          })
          router.replace('/auth/login')
        } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          setUserData({
            user: session.user,
            loading: false,
            error: null
          })
          
          // Update cache
          userCache = {
            user: session.user,
            timestamp: Date.now()
          }
        }
      }
    )

    // Cleanup function
    return () => {
      mountedRef.current = false
      subscription.unsubscribe()
    }
  }, [checkAuth, router])

  return {
    ...userData,
    refreshUser
  }
  
  export function useUser() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<Utente | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace('/auth/login')
      } else {
        // Recupera i dati dell'utente
        getCurrentUser()
          .then(userData => {
            setUser(userData)
            setLoading(false)
          })
          .catch(error => {
            console.error('Errore recupero utente:', error)
            setLoading(false)
          })
      }
    })
  }, [router])

  return { loading, user }

}
