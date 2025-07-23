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
      <h2 className="text-2xl font-bold mb-6">Registrati</h2>
      {error && <div className="text-red-600 mb-4">{error}</div>}
      <form onSubmit={handleRegister} className="space-y-4">
        <input
          type="text"
          placeholder="Nome"
          className="w-full p-2 border rounded"
          value={nome}
          onChange={e => setNome(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="Cognome"
          className="w-full p-2 border rounded"
          value={cognome}
          onChange={e => setCognome(e.target.value)}
          required
        />
        <input
          type="email"
          placeholder="Email"
          className="w-full p-2 border rounded"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          className="w-full p-2 border rounded"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />
        <button
          type="submit"
          className="w-full py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Registrati
        </button>
      </form>
      <p className="mt-4 text-center">
        Hai già un account? <a href="/auth/login" className="text-blue-600">Accedi</a>
      </p>
    </>
  )
}