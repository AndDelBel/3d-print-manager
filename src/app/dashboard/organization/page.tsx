// src/app/dashboard/organization/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@/hooks/useUser'
import { listOrg } from '@/services/organizzazione'
import type { Organizzazione } from '@/types/organizzazione'

export default function OrgPage() {
  const { loading } = useUser()
  const [orgs, setOrgs] = useState<Organizzazione[]>([])

  // calcolo subito isAdmin dal type
  const isAdmin = orgs.some(o => o.is_admin)

  useEffect(() => {
    if (!loading) {
      listOrg()
        .then(setOrgs)
        .catch(err => {
          console.error('Errore caricamento organizzazioni:', err)
          setOrgs([])
        })
    }
  }, [loading])

  if (loading) return <p>Caricamento…</p>

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Organizzazioni</h1>
      <p className="mb-4">
        {isAdmin ? 'Sei un amministratore' : 'Non sei un amministratore'}
      </p>

      {isAdmin && (
        <button className="mb-6 px-4 py-2 bg-blue-600 text-white rounded">
          Crea Organizzazione e
        </button>
      )}

      <ul className="space-y-2">
        {orgs.map(o => (
          <li key={o.id} className="p-4 border rounded">
            {o.nome}
          </li>
        ))}
      </ul>
    </div>
  )
}