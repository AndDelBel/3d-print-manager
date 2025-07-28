// src/app/dashboard/organization/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@/hooks/useUser'
import { listOrg } from '@/services/organizzazione'
import type { Organizzazione } from '@/types/organizzazione'
import Link from 'next/link'

export default function OrgPage() {
  const { loading, user } = useUser()
  const [orgs, setOrgs] = useState<Organizzazione[]>([])

  const isSuperuser = user?.is_superuser

  useEffect(() => {
    if (!loading && user) {
      listOrg({ userId: user.id, isSuperuser }).then(setOrgs).catch(err => {
        console.error('Errore caricamento organizzazioni:', err)
        setOrgs([])
      })
    }
  }, [loading, user, isSuperuser])

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Organizzazioni</h1>
      <p className="mb-4">
        {isSuperuser ? 'Sei un superuser: vedi tutte le organizzazioni' : 'Vedi solo le tue organizzazioni'}
      </p>
      <Link href="/dashboard/organization/create">
        <button className="btn btn-primary mb-6">
          Crea Organizzazione
        </button>
      </Link>
      <ul className="space-y-2">
        {orgs.map(o => (
          <li key={o.id} className="card bg-base-200">
            <div className="card-body">
              <Link href={`/dashboard/organization/${o.id}`}>
                <button className="btn btn-ghost">
                  {o.nome}
                </button>
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}