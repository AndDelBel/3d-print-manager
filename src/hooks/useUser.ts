
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

    try {
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        timeoutRef.current = setTimeout(() => {
          reject(new Error('Authentication timeout'))
        }, 10000) // 10 second timeout
      })

      const sessionPromise = supabase.auth.getSession()
      
      const result = await Promise.race([
        sessionPromise,
        timeoutPromise
      ]) as { data: { session: Session | null }, error: Error | null }
      
      const { data: { session }, error: sessionError } = result
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
      
      if (sessionError) {
        console.error('Session error:', sessionError)
        setUser(null)
        setLoading(false)
        setError('Errore di sessione')
        return
      }
      
      if (!session) {
        setUser(null)
        setLoading(false)
        setError(null)
      } else {
        // Recupera dati utente dal DB, incluso is_superuser
        const { data, error: userError } = await supabase
          .from('utente')
          .select('*')
          .eq('id', session.user.id)
          .single()
        
        if (userError || !data) {
          // Fallback a dati minimi dall'Auth se la tabella utente non è accessibile
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
        setRetryCount(0) // Reset retry count on success
      }
    } catch (err) {
      console.error('Errore nel caricamento utente:', err)
      setUser(null)
      setError(err instanceof Error ? err.message : 'Errore sconosciuto')
      setRetryCount(prev => prev + 1)
      
      // Stop loading after max retries
      if (retryCount >= 3) {
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
    retryInterval: 2000, // 2 secondi invece di 500ms
    maxRetries: 5, // Massimo 5 tentativi
    enabled: loading && retryCount < 3
  })

  useEffect(() => {
    fetchUser()

    // Ascolta i cambiamenti di autenticazione
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: string, session: Session | null) => {
      if (event === 'SIGNED_OUT') {
        setUser(null)
        setLoading(false)
        setError(null)
        setRetryCount(0)
      } else if (session) {
        // Recupera dati utente dal DB, incluso is_superuser
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
      // Cleanup timeout on unmount
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }
  }, [fetchUser])

  return { loading, user, error, retryCount }
}