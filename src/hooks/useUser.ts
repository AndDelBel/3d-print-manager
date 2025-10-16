
import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'
import type { Utente } from '@/types/utente'
import type { Session } from '@supabase/supabase-js'

export function useUser() {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<Utente | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const isFetchingRef = useRef(false)
  const hardTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const hasInitialLoadRef = useRef(false)

  const fetchUser = useCallback(async () => {
    // Prevent multiple simultaneous calls
    if (isFetchingRef.current) {
      console.log('⏭️ Skipping fetchUser - already fetching')
      return
    }

    console.log('🔍 fetchUser called, loading:', loading, 'hasInitialLoad:', hasInitialLoadRef.current)
    isFetchingRef.current = true
    setError(null)

    // Set a hard timeout ONLY on very first load to prevent infinite loading
    if (!hasInitialLoadRef.current) {
      // Clear any existing timeout first
      if (hardTimeoutRef.current) {
        clearTimeout(hardTimeoutRef.current)
      }
      
      hardTimeoutRef.current = setTimeout(() => {
        // Only fire timeout if we're still fetching and haven't completed initial load
        if (isFetchingRef.current && !hasInitialLoadRef.current) {
          console.warn('⏱️ Initial auth check timed out, assuming no session')
          setUser(null)
          setLoading(false)
          isFetchingRef.current = false
          hasInitialLoadRef.current = true
        }
      }, 8000) // 8 second hard limit
    }

    try {
      // Simply get the current session without forcing refresh on load
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      // Clear timeout as soon as we get a response
      if (hardTimeoutRef.current) {
        clearTimeout(hardTimeoutRef.current)
        hardTimeoutRef.current = null
      }
      
      // Mark that initial load has completed
      hasInitialLoadRef.current = true
      
      if (sessionError) {
        console.error('❌ Session error:', sessionError)
        setUser(null)
        setLoading(false)
        setError(null) // Don't show error for missing session
        isFetchingRef.current = false
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
      if (hardTimeoutRef.current) {
        clearTimeout(hardTimeoutRef.current)
        hardTimeoutRef.current = null
      }
      console.error('💥 Errore nel caricamento utente:', err)
      setUser(null)
      setError(null) // Don't show error on initial load failures
      
      // Always stop loading on error
      setLoading(false)
    } finally {
      isFetchingRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retryCount])

  // Retry automatico disabilitato - gestito da onAuthStateChange
  // useRetryFetch(loading, fetchUser, {
  //   retryInterval: 2000, // 2 secondi
  //   maxRetries: 1, // Solo 1 tentativo di retry
  //   enabled: loading && retryCount < 1
  // })

  useEffect(() => {
    fetchUser()

    // Silently refresh session periodically to keep it alive (only if session exists)
    // Supabase default token expiration is 1 hour (3600 seconds)
    // We refresh at 50 minutes to be safe
    const refreshInterval = setInterval(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          console.log('🔄 Background session refresh triggered')
          await supabase.auth.refreshSession()
        }
      } catch (error) {
        // Silently fail - don't disrupt the user experience
        console.debug('Background session refresh failed:', error)
      }
    }, 50 * 60 * 1000) // Refresh every 50 minutes (3000 seconds)

    // Debounce auth state changes to avoid multiple rapid-fire updates
    let authStateChangeTimeout: NodeJS.Timeout | null = null
    
    // Ascolta i cambiamenti di autenticazione
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: string, session: Session | null) => {
      console.log('🔔 Auth state change:', event, session ? `Session exists for ${session.user.email}` : 'No session', 'current loading:', loading)
      
      // Clear any pending hard timeout when auth state changes
      if (hardTimeoutRef.current) {
        clearTimeout(hardTimeoutRef.current)
        hardTimeoutRef.current = null
      }
      
      // Clear any pending auth state change timeout
      if (authStateChangeTimeout) {
        clearTimeout(authStateChangeTimeout)
      }
      
      if (event === 'SIGNED_OUT') {
        console.log('🚪 SIGNED_OUT - clearing user')
        setUser(null)
        setLoading(false)
        setError(null)
        setRetryCount(0)
      } else if (event === 'INITIAL_SESSION') {
        // Skip INITIAL_SESSION if we already loaded initial data
        if (hasInitialLoadRef.current && user) {
          console.log('⏭️ Skipping INITIAL_SESSION - already have user data')
          return
        }
        
        // Debounce INITIAL_SESSION to handle multiple rapid events
        authStateChangeTimeout = setTimeout(async () => {
          if (session) {
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
        }, 300) // 300ms debounce - wait for dust to settle
      } else if (session) {
        // For TOKEN_REFRESHED, skip DB fetch if we already have user data for this user
        if (event === 'TOKEN_REFRESHED' && user && user.id === session.user.id) {
          console.log('⏭️ Token refreshed, keeping existing user data')
          setLoading(false)
          return
        }
        
        // For SIGNED_IN or different user - fetch from DB
        console.log('📥 Fetching user data for SIGNED_IN event')
        setLoading(true)
        
        try {
          // Add a timeout to prevent hanging
          const fetchPromise = supabase
            .from('utente')
            .select('*')
            .eq('id', session.user.id)
            .single()
          
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Database query timeout')), 2000)
          )
          
          const { data, error } = await Promise.race([fetchPromise, timeoutPromise]) as any
          
          if (error || !data) {
            console.log('⚠️ User not in DB, using auth metadata. Error:', error)
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
            console.log('✅ User data loaded from DB for SIGNED_IN')
            setUser(data as Utente)
          }
          console.log('✅ SIGNED_IN complete - setting loading to false')
          setLoading(false)
          setError(null)
          setRetryCount(0)
        } catch (err) {
          console.error('💥 Error fetching user data in SIGNED_IN:', err)
          // Fallback to auth metadata on error
          const meta = session.user.user_metadata as Record<string, unknown> | undefined
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            nome: typeof meta?.nome === 'string' ? meta.nome : '',
            cognome: typeof meta?.cognome === 'string' ? meta.cognome : '',
            created_at: new Date().toISOString(),
            is_superuser: false,
          })
          setLoading(false)
          setError(null)
          setRetryCount(0)
        }
      }
    })

    return () => {
      subscription.unsubscribe()
      clearInterval(refreshInterval)
      // Cleanup timeouts on unmount
      if (hardTimeoutRef.current) {
        clearTimeout(hardTimeoutRef.current)
        hardTimeoutRef.current = null
      }
      if (authStateChangeTimeout) {
        clearTimeout(authStateChangeTimeout)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchUser])

  return { loading, user, error, retryCount }
}