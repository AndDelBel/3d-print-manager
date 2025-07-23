'use client'

import { useUser } from '@/hooks/useUser'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

type Org = { id: number; nome: string, isadmin: boolean }



export default function OrgPage() {
  const { loading } = useUser()
  const [orgs, setOrgs] = useState<Org[]>([])
  const isAdmin = orgs.some(org => org.isadmin)

  useEffect(() => {
    async function loadOrgs() {
      const { data } = await supabase.from<Org>('organizzazione').select('*')
      setOrgs(data || [])
      
    }
    if (!loading) loadOrgs()
  }, [loading])
  
  

  if (loading) return <p>Caricamento...</p>
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Organizzazioni</h1>
      { isAdmin&& (
        <button className="mb-4 p-2 bg-blue-600 text-white rounded">Crea Organizzazione</button>
      )}
      <ul className="space-y-2">
        {orgs.map(o => (
          <li key={o.id} className="p-4 border rounded">{o.nome}</li>
        ))}
      </ul>
    </div>
  )
}