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
        >
          Accedi
        </button>
      </form>
      <p className="mt-4 text-center text-base-content/70">
        Non hai un account? <a href="/auth/register" className="link link-primary">Registrati</a>
      </p>
    </>
  )
}