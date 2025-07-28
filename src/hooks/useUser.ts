import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { getCurrentUser } from '@/services/utente'
import type { Utente } from '@/types/utente'

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