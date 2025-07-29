// src/app/dashboard/coda-stampa/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@/hooks/useUser'
import { listOrg } from '@/services/organizzazione'
import { listCodaStampa } from '@/services/codaStampa'
import type { Organizzazione } from '@/types/organizzazione'
import type { CodaStampa } from '@/types/codaStampa'
import { AlertMessage } from '@/components/AlertMessage'

export default function CodaStampaPage() {
  const { loading, user } = useUser()
  const [orgs, setOrgs] = useState<Organizzazione[]>([])
  const [orgId, setOrgId] = useState<number | undefined>(undefined)
  const [coda, setCoda] = useState<CodaStampa[]>([])
  const [error, setError] = useState<string | null>(null)

  const isSuperuser = user?.is_superuser

  useEffect(() => {
    if (!loading && user) {
      listOrg({ userId: user.id, isSuperuser }).then(setOrgs).catch(console.error)
    }
  }, [loading, user, isSuperuser])

  useEffect(() => {
    if (!loading) {
      listCodaStampa({ organizzazione_id: isSuperuser ? undefined : orgId, isSuperuser })
        .then(setCoda)
        .catch(() => setError('Errore caricamento coda stampa'))
    }
  }, [loading, orgId, isSuperuser])

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Coda Stampa</h1>
      {error && <AlertMessage type="error" message={error} onClose={() => setError(null)} />}
      {!isSuperuser && (
        <div className="form-control mb-4">
          <label className="label">
            <span className="label-text">Organizzazione</span>
          </label>
          <select
            className="select select-bordered w-full"
            value={orgId ?? ''}
            onChange={e => setOrgId(Number(e.target.value) || undefined)}
          >
            <option value="">Tutte</option>
            {orgs.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
          </select>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="table table-zebra w-full">
          <thead>
            <tr>
              <th>Ordine</th>
              <th>Stampante</th>
              <th>Posizione</th>
              <th>Stato</th>
              <th>Inizio</th>
              <th>Fine</th>
              <th>Note</th>
              {isSuperuser && <th>Azioni</th>}
            </tr>
          </thead>
          <tbody>
            {coda.map(j => (
              <tr key={j.id}>
                <td>{j.ordine_id}</td>
                <td>{j.stampante_id}</td>
                <td>{j.posizione}</td>
                <td>{j.stato}</td>
                <td>{j.data_inizio || '-'}</td>
                <td>{j.data_fine || '-'}</td>
                <td>{j.note || '-'}</td>
                {isSuperuser && (
                  <td className="text-center">
                    {/* Azioni CRUD future qui */}
                    <button className="btn btn-warning btn-xs">Modifica</button>
                    <button className="btn btn-error btn-xs ml-2">Elimina</button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
} 