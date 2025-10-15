'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string|null>(null)
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    
    console.log('🔐 Attempting login...')
    
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })
      
      console.log('📡 Login response:', { data, authError })
      
      if (authError) {
        console.error('❌ Login error:', authError)
        setError(authError.message)
        setLoading(false)
        return
      }

      console.log('✅ Login successful, user:', data.user?.email)

      // Aggiorna/crea record tabella utente dopo login, così email/nome/cognome sono coerenti
      try {
        const user = data.user
        if (user?.id) {
          console.log('👤 Updating user record in database...')
          const metadata = user.user_metadata as Record<string, unknown> | undefined
          const nome = typeof metadata?.nome === 'string' ? metadata.nome : null
          const cognome = typeof metadata?.cognome === 'string' ? metadata.cognome : null
          const result = await supabase
            .from('utente')
            .upsert({ id: user.id, email: user.email ?? null, nome, cognome }, { onConflict: 'id' })
          
          console.log('💾 User update result:', result)
        }
      } catch (e) {
        console.error('⚠️ Aggiornamento utente post-login fallito:', e)
      }

      console.log('🔄 Redirecting to homepage...')
      router.push('/')
    } catch (err) {
      console.error('💥 Unexpected error during login:', err)
      setError('Si è verificato un errore imprevisto. Riprova.')
      setLoading(false)
    }
  }

  return (
    <>
      <h2 className="text-2xl font-bold mb-6 text-base-content">Login</h2>
      {error && <div className="alert alert-error mb-4">{error}</div>}
      <form onSubmit={handleLogin} className="space-y-4">
        <div className="form-control">
          <input
            type="email"
            placeholder="Email"
            className="input input-bordered w-full"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="form-control">
          <input
            type="password"
            placeholder="Password"
            className="input input-bordered w-full"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
        </div>
        <button
          type="submit"
          className="btn btn-primary w-full"
          disabled={loading}
        >
          {loading ? (
            <>
              <span className="loading loading-spinner"></span>
              Autenticazione in corso...
            </>
          ) : (
            'Accedi'
          )}
        </button>
      </form>
      <p className="mt-4 text-center text-base-content/70">
        Non hai un account? <a href="/auth/register" className="link link-primary">Registrati</a>
      </p>
    </>
  )
}