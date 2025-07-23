'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string|null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError) setError(authError.message)
    else router.push('/dashboard/organization')
  }

  return (
    <>
      <h2 className="text-2xl font-bold mb-6">Login</h2>
      {error && <div className="text-red-600 mb-4">{error}</div>}
      <form onSubmit={handleLogin} className="space-y-4">
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
          className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Accedi
        </button>
      </form>
      <p className="mt-4 text-center">
        Non hai un account? <a href="/auth/register" className="text-blue-600">Registrati</a>
      </p>
    </>
  )
}