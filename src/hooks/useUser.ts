import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import type { Utente } from '@/types/utente'

export function useUser() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<Utente | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
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
        
        if (userError) {
          setUser(null)
        } else {
          setUser(data as Utente)
        }
        setLoading(false)
      }
    })

    // Ascolta i cambiamenti di autenticazione
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
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
        
        if (error) {
          setUser(null)
        } else {
          setUser(data as Utente)
        }
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  return { loading, user }
}