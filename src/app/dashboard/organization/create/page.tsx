'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/hooks/useUser'
import { createOrg } from '@/services/organizzazione'
import { AlertMessage } from '@/components/AlertMessage'
import { LoadingButton } from '@/components/LoadingButton'

export default function CreateOrganizationPage() {
  const router = useRouter()
  const { loading } = useUser()
  const [nome, setNome] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    if (!nome.trim()) {
      setError('Il nome non può essere vuoto')
      return
    }
    setSaving(true)
    try {
      await createOrg(nome.trim())
      setSuccess('Organizzazione creata con successo!')
      setTimeout(() => router.push('/dashboard/organization'), 1000)
    } catch (err: unknown) {
      console.error(err)
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Errore durante la creazione')
      }
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p>Caricamento…</p>

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-6">Nuova Organizzazione</h1>
      {error && <AlertMessage type="error" message={error} onClose={() => setError(null)} />}
      {success && <AlertMessage type="success" message={success} onClose={() => setSuccess(null)} />}
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block">
          <span className="text-sm font-medium">Nome organizzazione</span>
          <input
            type="text"
            value={nome}
            onChange={e => setNome(e.target.value)}
            className="mt-1 block w-full p-2 border rounded"
            placeholder="Es. Org Gamma"
            disabled={saving}
          />
        </label>
        <LoadingButton
          type="submit"
          loading={saving}
          loadingText="Salvataggio…"
          className="w-full py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
        >
          {saving ? 'Salvataggio…' : 'Crea'}
        </LoadingButton>
      </form>
    </div>
  )
}