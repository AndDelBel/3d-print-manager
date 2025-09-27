
import { useEffect, useState, useCallback } from 'react'
import { useRetryFetch } from '@/hooks/useRetryFetch'
import { supabase } from '@/lib/supabaseClient'
import type { Utente } from '@/types/utente'

export function useUser() {

  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<Utente | null>(null)

  const fetchUser = useCallback(async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        setUser(null)
        setLoading(false)
        return
      }
      
      if (!session) {
        setUser(null)
        setLoading(false)
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
      }
    } catch (err) {
      console.error('Errore nel caricamento utente:', err)
      setUser(null)
      setLoading(false)
    }
  }, [])

  // Retry automatico ogni 10 secondi quando in loading
  useRetryFetch(loading, fetchUser, {
    retryInterval: 500,
    enabled: true
  })

  useEffect(() => {
    fetchUser()

    // Ascolta i cambiamenti di autenticazione
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: string, session: any) => {
      if (event === 'SIGNED_OUT') {
        setUser(null)
        setLoading(false)
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
      }
    })

    return () => subscription.unsubscribe()
  }, [fetchUser])

  return { loading, user }
}