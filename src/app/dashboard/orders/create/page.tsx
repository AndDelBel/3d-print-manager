// src/app/dashboard/orders/create/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/hooks/useUser'
import { listOrg } from '@/services/organizzazione'
import { listCommesseByOrg, listFilesByOrgAndComm } from '@/services/file'
import { createOrder } from '@/services/ordine'
import { parseDisplayName } from '@/utils/fileUtils'
import type { Organizzazione } from '@/types/organizzazione'
import type { FileRecord } from '@/types/file'

export default function CreateOrderPage() {
  const router = useRouter()
  const { loading } = useUser()

  const [orgs, setOrgs] = useState<Organizzazione[]>([])
  const [selectedOrg, setSelectedOrg] = useState<number | null>(null)
  const [commesse, setCommesse] = useState<string[]>([])
  const [selectedCommessa, setSelectedCommessa] = useState<string>('')
  const [files, setFiles] = useState<FileRecord[]>([])
  const [selectedFile, setSelectedFile] = useState<string>('')
  const [quantita, setQuantita] = useState<number>(1)
  const [consegna, setConsegna] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // 1) carica organizzazioni
  useEffect(() => {
    if (!loading) listOrg().then(setOrgs).catch(console.error)
  }, [loading])

  // 2) al cambio org, carica commesse
  useEffect(() => {
    if (selectedOrg !== null) {
      listCommesseByOrg(selectedOrg)
        .then(setCommesse)
        .catch(() => setCommesse([]))
      setSelectedCommessa('')
      setFiles([])
      setSelectedFile('')
    }
  }, [selectedOrg])

  // 3) al cambio commessa, carica solo .gcode.3mf
  useEffect(() => {
    if (selectedOrg !== null && selectedCommessa) {
      listFilesByOrgAndComm(selectedOrg, selectedCommessa, ['gcode.3mf'])
        .then(setFiles)
        .catch(() => setFiles([]))
      setSelectedFile('')
    }
  }, [selectedOrg, selectedCommessa])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!selectedOrg)      return setError("Seleziona un'organizzazione")
    if (!selectedCommessa) return setError('Seleziona una commessa')
    if (!selectedFile)     return setError('Seleziona un file .gcode.3mf')
    if (quantita < 1)      return setError('Quantità non valida')

    setSaving(true)
    try {
      await createOrder(selectedFile, quantita, consegna || null)
      router.push('/dashboard/orders')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p>Caricamento…</p>

  return (
    <div className="p-8 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-6">Nuovo Ordine</h1>
      {error && <div className="mb-4 text-red-600">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Organizzazione */}
        <label>
          <span>Organizzazione</span>
          <select
            className="block w-full mt-1 p-2 border rounded"
            value={selectedOrg ?? ''}
            onChange={e => setSelectedOrg(Number(e.target.value))}
            disabled={saving}
          >
            <option value="">Seleziona...</option>
            {orgs.map(o => (
              <option key={o.id} value={o.id}>{o.nome}</option>
            ))}
          </select>
        </label>

        {/* Commessa */}
        <label>
          <span>Commessa</span>
          <select
            className="block w-full mt-1 p-2 border rounded"
            value={selectedCommessa}
            onChange={e => setSelectedCommessa(e.target.value)}
            disabled={saving || !selectedOrg}
          >
            <option value="">Seleziona...</option>
            {commesse.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>

        {/* File .gcode.3mf */}
        <label>
          <span>File (.gcode.3mf)</span>
          <select
            className="block w-full mt-1 p-2 border rounded"
            value={selectedFile}
            onChange={e => setSelectedFile(e.target.value)}
            disabled={saving || !selectedCommessa}
          >
            <option value="">Seleziona...</option>
            {files.map(f => (
              <option key={f.nome_file} value={f.nome_file}>
                {parseDisplayName(f.nome_file)}
              </option>
            ))}
          </select>
        </label>

        {/* Quantità */}
        <label>
          <span>Quantità</span>
          <input
            type="number"
            min="1"
            className="block w-full mt-1 p-2 border rounded"
            value={quantita}
            onChange={e => setQuantita(Number(e.target.value))}
            disabled={saving}
          />
        </label>

        <label>
          <span>Data consegna (opzionale)</span>
          <input
            type="date"
            className="block w-full mt-1 p-2 border rounded"
            value={consegna}
            onChange={e => setConsegna(e.target.value)}
            disabled={saving}
          />
        </label>

        <button
          type="submit"
          disabled={saving}
          className="w-full py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
        >
          {saving ? 'Salvataggio…' : 'Crea Ordine'}
        </button>
      </form>
    </div>
  )
}