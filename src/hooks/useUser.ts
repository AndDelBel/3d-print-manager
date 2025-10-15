
import { useEffect, useState, useCallback, useRef } from 'react'
import { useRetryFetch } from '@/hooks/useRetryFetch'
import { supabase } from '@/lib/supabaseClient'
import type { Utente } from '@/types/utente'
import type { Session } from '@supabase/supabase-js'

export function useUser() {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<Utente | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const isFetchingRef = useRef(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const fetchUser = useCallback(async () => {
    // Prevent multiple simultaneous calls
    if (isFetchingRef.current) {
      return
    }

    isFetchingRef.current = true
    setError(null)

    // Set a hard timeout to prevent infinite loading (only on first load)
    const hardTimeout = setTimeout(() => {
      if (isFetchingRef.current) {
        console.warn('⏱️ Auth check timed out, assuming no session')
        setUser(null)
        setLoading(false)
        isFetchingRef.current = false
      }
    }, 8000) // 8 second hard limit (increased for slower connections)

    try {
      // Simply get the current session without forcing refresh on load
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      // Clear timeout as soon as we get a response
      clearTimeout(hardTimeout)
      
      if (sessionError) {
        console.error('❌ Session error:', sessionError)
        setUser(null)
        setLoading(false)
        setError(null) // Don't show error for missing session
        return
      }
      
      if (!session) {
        console.log('🚫 No session found')
        setUser(null)
        setLoading(false)
        setError(null)
      } else {
        console.log('✅ Session found for user:', session.user.email)
        // Recupera dati utente dal DB, incluso is_superuser
        const { data, error: userError } = await supabase
          .from('utente')
          .select('*')
          .eq('id', session.user.id)
          .single()
        
        if (userError || !data) {
          // Fallback a dati minimi dall'Auth se la tabella utente non è accessibile
          console.log('⚠️ User not in DB, using auth metadata')
          const meta = session.user.user_metadata as Record<string, unknown> | undefined
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            nome: typeof meta?.nome === 'string' ? meta.nome : '',
            cognome: typeof meta?.cognome === 'string' ? meta.cognome : '',
            created_at: new Date().toISOString(),
            is_superuser: false,
          })
        } else {
          console.log('✅ User data loaded from DB')
          setUser(data as Utente)
        }
        setLoading(false)
        setError(null)
        setRetryCount(0) // Reset retry count on success
      }
    } catch (err) {
      clearTimeout(hardTimeout)
      console.error('💥 Errore nel caricamento utente:', err)
      setUser(null)
      setError(null) // Don't show error on initial load failures
      
      // Stop loading after max retries
      if (retryCount >= 1) {
        setLoading(false)
      }
    } finally {
      isFetchingRef.current = false
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }
  }, [retryCount])

  // Retry automatico con intervalli più lunghi e limite massimo
  useRetryFetch(loading, fetchUser, {
    retryInterval: 2000, // 2 secondi
    maxRetries: 1, // Solo 1 tentativo di retry
    enabled: loading && retryCount < 1
  })

  useEffect(() => {
    fetchUser()

    // Silently refresh session periodically to keep it alive (only if session exists)
    const refreshInterval = setInterval(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          // Silently refresh the session in the background
          await supabase.auth.refreshSession()
        }
      } catch (error) {
        // Silently fail - don't disrupt the user experience
        console.debug('Background session refresh failed:', error)
      }
    }, 30000) // Refresh every 30 seconds

    // Ascolta i cambiamenti di autenticazione
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: string, session: Session | null) => {
      console.log('🔔 Auth state change:', event, session ? 'Session exists' : 'No session')
      
      if (event === 'SIGNED_OUT') {
        setUser(null)
        setLoading(false)
        setError(null)
        setRetryCount(0)
      } else if (session) {
        // Update user data for any event that has a valid session
        // This includes SIGNED_IN, TOKEN_REFRESHED, INITIAL_SESSION, etc.
        const { data, error } = await supabase
          .from('utente')
          .select('*')
          .eq('id', session.user.id)
          .single()
        
        if (error || !data) {
          const meta = session.user.user_metadata as Record<string, unknown> | undefined
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            nome: typeof meta?.nome === 'string' ? meta.nome : '',
            cognome: typeof meta?.cognome === 'string' ? meta.cognome : '',
            created_at: new Date().toISOString(),
            is_superuser: false,
          })
        } else {
          setUser(data as Utente)
        }
        setLoading(false)
        setError(null)
        setRetryCount(0)
      }
    })

    return () => {
      subscription.unsubscribe()
      clearInterval(refreshInterval)
      // Cleanup timeout on unmount
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }
  }, [fetchUser])

  return { loading, user, error, retryCount }
}