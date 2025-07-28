// src/app/dashboard/organization/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@/hooks/useUser'
import { listOrg, listUserOrgs, type UserOrgRelation } from '@/services/organizzazione'
import type { Organizzazione } from '@/types/organizzazione'
import Link from 'next/link'

export default function OrganizationPage() {
  const { loading } = useUser()
  const [orgs, setOrgs] = useState<Organizzazione[]>([])
  const [userOrgs, setUserOrgs] = useState<UserOrgRelation[]>([])

  // Check if user is admin in any organization
  const isAdmin = userOrgs.some(o => o.role === 'admin')

  useEffect(() => {
    if (!loading) {
      listOrg().then(setOrgs).catch(console.error)
      listUserOrgs().then(setUserOrgs).catch(console.error)
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
        <Link  href="/dashboard/organization/create">
        <button className="mb-6 px-4 py-2 bg-blue-600 text-white rounded">
          Crea Organizzazione
        </button>
        </Link>
      )}

      <ul className="space-y-2">
        {orgs.map(o => (
          <li key={o.id} className="p-4 border rounded">
            <Link href={`/dashboard/organization/${o.id}`}>
              <button className="ml-4 px-2 py-1 bg-gray-600 text-white rounded">
                {o.nome}
              </button>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}