'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

interface AuthStatus {
  authenticated?: boolean
  user?: {
    id: string
    email: string
    is_superuser: boolean
    nome: string
    cognome: string
  }
  session?: {
    access_token: string
    refresh_token: string
    expires_at: number
  }
  error?: string
  details?: string
  message?: string
}

export function AuthDebug() {
  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function checkAuth() {
      try {
        // Verifica sessione
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          setAuthStatus({ error: 'Errore sessione', details: sessionError.message })
          setLoading(false)
          return
        }

        if (!session) {
          setAuthStatus({ authenticated: false, message: 'Nessuna sessione attiva' })
          setLoading(false)
          return
        }

        // Verifica utente nel database
        const { data: userData, error: userError } = await supabase
          .from('utente')
          .select('*')
          .eq('id', session.user.id)
          .single()

        if (userError) {
          setAuthStatus({ 
            authenticated: false, 
            error: 'Utente non trovato nel database',
            details: userError.message 
          })
          setLoading(false)
          return
        }

        setAuthStatus({
          authenticated: true,
          user: {
            id: session.user.id,
            email: session.user.email || '',
            is_superuser: userData.is_superuser,
            nome: userData.nome,
            cognome: userData.cognome
          },
          session: {
            access_token: session.access_token ? 'present' : 'missing',
            refresh_token: session.refresh_token ? 'present' : 'missing',
            expires_at: session.expires_at || 0
          }
        })
      } catch (error) {
        setAuthStatus({ error: 'Errore interno', details: String(error) })
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [])

  if (loading) {
    return <div>Caricamento stato autenticazione...</div>
  }

  return (
    <div className="p-4 bg-base-200 rounded-lg">
      <h3 className="text-lg font-bold mb-2">Debug Autenticazione</h3>
      <pre className="text-xs overflow-auto">
        {JSON.stringify(authStatus, null, 2)}
      </pre>
    </div>
  )
} 