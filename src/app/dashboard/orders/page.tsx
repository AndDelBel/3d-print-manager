// src/app/dashboard/orders/page.tsx
'use client'

import { useState, useEffect, useMemo } from 'react'
import { useUser } from '@/hooks/useUser'
import { listOrders, updateOrderStatus } from '@/services/ordine'
import { parseDisplayName } from '@/utils/fileUtils'
import { filterBySearch } from '@/utils/filterUtils'
import type { Ordine } from '@/types/ordine'

export default function OrdersPage() {
  const { loading } = useUser()
  const [orders, setOrders] = useState<Ordine[]>([])
  const [search, setSearch] = useState('')
  const [filterOrg, setFilterOrg] = useState('')
  const [filterComm, setFilterComm] = useState('')

  useEffect(() => {
    if (!loading) {
      listOrders()
        .then(setOrders)
        .catch(console.error)
    }
  }, [loading])

  // Extract unique organizations and commesse
  const orgs = useMemo(() =>
    Array.from(new Set(orders.map(o => o.file_ordinato.split('/')[0]))),
  [orders])

  const commesse = useMemo(() =>
    Array.from(
      new Set(
        orders
          .filter(o => !filterOrg || o.file_ordinato.split('/')[0] === filterOrg)
          .map(o => o.file_ordinato.split('/')[1])
      )
    ),
  [orders, filterOrg])

  // First apply text search
  const textFiltered = useMemo(
    () => filterBySearch(
      orders,
      search,
      [o => parseDisplayName(o.file_ordinato), o => o.file_ordinato.split('/')[1]]
    ),
    [orders, search]
  )

  // Then apply org and comm filters
  const filtered = useMemo(
    () => textFiltered.filter(o => {
      const [org, comm] = o.file_ordinato.split('/')
      return (!filterOrg || org === filterOrg) && (!filterComm || comm === filterComm)
    }),
    [textFiltered, filterOrg, filterComm]
  )

  const handleStatusChange = async (id: number, newStatus: Ordine['stato']) => {
    await updateOrderStatus(id, newStatus)
    setOrders(await listOrders())
  }

  if (loading) return <p>Caricamento…</p>

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Coda Ordini</h1>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <input
          type="text"
          placeholder="Cerca per file o commessa…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 p-2 border rounded"
        />
        <select
          value={filterOrg}
          onChange={e => setFilterOrg(e.target.value)}
          className="p-2 border rounded"
        >
          <option value="">Tutte le organizzazioni</option>
          {orgs.map(o => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
        <select
          value={filterComm}
          onChange={e => setFilterComm(e.target.value)}
          className="p-2 border rounded"
          disabled={!filterOrg}
        >
          <option value="">Tutte le commesse</option>
          {commesse.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <p>Nessun ordine trovato.</p>
      ) : (
        <table className="w-full table-auto border-collapse">
          <thead>
            <tr>
              <th className="border px-4 py-2">ID</th>
              <th className="border px-4 py-2">File</th>
              <th className="border px-4 py-2">Commessa</th>
              <th className="border px-4 py-2">Organizzazione</th>
              <th className="border px-4 py-2">Quantità</th>
              <th className="border px-4 py-2">Data Ordine</th>
              <th className="border px-4 py-2">Stato</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(o => {
              const [org, comm, filePart] = o.file_ordinato.split('/')
              const fileName = parseDisplayName(o.file_ordinato)
              return (
                <tr key={o.id}>
                  <td className="border px-4 py-2">{o.id}</td>
                  <td className="border px-4 py-2">{fileName}</td>
                  <td className="border px-4 py-2">{comm}</td>
                  <td className="border px-4 py-2">{org}</td>
                  <td className="border px-4 py-2">{o.quantita}</td>
                  <td className="border px-4 py-2">
                    {new Date(o.data_ordine).toLocaleString()}
                  </td>
                  <td className="border px-4 py-2">
                    <select
                      value={o.stato}
                      onChange={e => handleStatusChange(o.id, e.target.value as Ordine['stato'])}
                      className="p-1 border rounded"
                    >
                      {['pending','printing','done','completed'].map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}
