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
    // 1) crea account in auth
    const { data, error: authError } = await supabase.auth.signUp({
      email, password
    })
    if (authError) {
      setError(authError.message)
      return
    }
    // 2) crea record in public.utente
    await supabase
      .from('utente')
      .insert([{ id: data.user!.id, email, nome, cognome }])
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