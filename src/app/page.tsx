'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

type TestRow = { id: number; name: string }

export default function HomePage() {
  const [rows, setRows] = useState<TestRow[]>([])

  useEffect(() => {
    async function loadData() {
      const { data, error } = await supabase
        .from('test_table')
        .select('id, name')
      if (error) console.error('Supabase error:', error)
      else if (data) setRows(data as TestRow[])
    }
    loadData()
  }, [])

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">Connessione a Supabase</h1>
      <ul className="mt-4 space-y-2">
        {rows.map((r) => (
          <li key={r.id}>
            #{r.id} – {r.name}
          </li>
        ))}
      </ul>
    </main>
  )
}