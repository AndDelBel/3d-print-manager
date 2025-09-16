'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function RegisterPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nome, setNome] = useState('')
  const [cognome, setCognome] = useState('')
  const [error, setError] = useState<string|null>(null)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    // 1) crea account in auth passando i metadati (nome, cognome)
    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nome, cognome }
      }
    })
    if (authError) {
      setError(authError.message)
      return
    }
    // 2) Prova a creare/aggiornare il record in public.utente
    // Nota: se la conferma email è attiva, data.user può essere null → in quel caso
    // il record verrà creato automaticamente dal trigger lato DB (se configurato)
    try {
      if (data.user?.id) {
        const { error: utenteError } = await supabase
          .from('utente')
          .upsert({ id: data.user.id, email, nome, cognome }, { onConflict: 'id' })

        if (utenteError) {
          // Non bloccare la registrazione: mostra l'errore ma prosegui
          console.error('Errore creazione utente (tabella utente):', utenteError)
        }
      }
    } catch (e) {
      console.error('Eccezione creazione utente (tabella utente):', e)
    }

    router.push('/auth/login')
  }

  return (
    <>
      <h2 className="text-2xl font-bold mb-6 text-base-content">Registrati</h2>
      {error && <div className="alert alert-error mb-4">{error}</div>}
      <form onSubmit={handleRegister} className="space-y-4">
        <div className="form-control">
          <input
            type="text"
            placeholder="Nome"
            className="input input-bordered w-full"
            value={nome}
            onChange={e => setNome(e.target.value)}
            required
          />
        </div>
        <div className="form-control">
          <input
            type="text"
            placeholder="Cognome"
            className="input input-bordered w-full"
            value={cognome}
            onChange={e => setCognome(e.target.value)}
            required
          />
        </div>
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
          className="btn btn-success w-full"
        >
          Registrati
        </button>
      </form>
      <p className="mt-4 text-center text-base-content/70">
        Hai già un account? <a href="/auth/login" className="link link-primary">Accedi</a>
      </p>
    </>
  )
}