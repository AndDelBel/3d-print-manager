// src/app/dashboard/orders/page.tsx
'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useUser } from '@/hooks/useUser'
import { listOrders, updateOrderStatus } from '@/services/ordine'
import { parseDisplayName } from '@/utils/fileUtils'
import type { Ordine } from '@/types/ordine'

// Cache for parsed order paths
interface ParsedOrder {
  order: Ordine
  org: string
  commessa: string
  displayName: string
}

export default function OrdersPage() {
  const { loading, user, isAuthenticated } = useUser()
  const [orders, setOrders] = useState<Ordine[]>([])
  const [search, setSearch] = useState('')
  const [filterOrg, setFilterOrg] = useState('')
  const [filterComm, setFilterComm] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)

  const loadOrders = useCallback(async () => {
    if (!isAuthenticated || !user) return
    
    try {
      // Use optimized query based on user context
      const orderData = await listOrders()
      setOrders(orderData)
    } catch (error) {
      console.error('Error loading orders:', error)
    }
  }, [isAuthenticated, user])

  useEffect(() => {
    if (!loading && isAuthenticated) {
      loadOrders()
    }
  }, [loading, isAuthenticated, loadOrders])

  // Memoize parsed orders to avoid repeated string operations
  const parsedOrders = useMemo((): ParsedOrder[] => {
    return orders.map(order => {
      const [org = '', commessa = ''] = order.file_ordinato.split('/')
      return {
        order,
        org,
        commessa,
        displayName: parseDisplayName(order.file_ordinato)
      }
    })
  }, [orders])

  // Extract unique organizations and commesse efficiently
  const { orgs, commesse } = useMemo(() => {
    const orgSet = new Set<string>()
    const commSet = new Set<string>()

    for (const { org, commessa } of parsedOrders) {
      if (org) orgSet.add(org)
      if (commessa && (!filterOrg || org === filterOrg)) {
        commSet.add(commessa)
      }
    }

    return {
      orgs: Array.from(orgSet),
      commesse: Array.from(commSet)
    }
  }, [parsedOrders, filterOrg])

  // Optimized filtering with single pass
  const filteredOrders = useMemo(() => {
    let filtered = parsedOrders

    // Apply text search if provided
    if (search.trim()) {
      const searchLower = search.toLowerCase()
      filtered = filtered.filter(({ displayName, commessa }) => 
        displayName.toLowerCase().includes(searchLower) ||
        commessa.toLowerCase().includes(searchLower)
      )
    }

    // Apply org and commessa filters
    if (filterOrg || filterComm) {
      filtered = filtered.filter(({ org, commessa }) => {
        const orgMatch = !filterOrg || org === filterOrg
        const commMatch = !filterComm || commessa === filterComm
        return orgMatch && commMatch
      })
    }

    return filtered
  }, [parsedOrders, search, filterOrg, filterComm])

  const handleStatusChange = useCallback(async (id: number, newStatus: Ordine['stato']) => {
    if (isUpdating) return
    
    setIsUpdating(true)
    try {
      await updateOrderStatus(id, newStatus)
      await loadOrders() // Reload orders after status change
    } catch (error) {
      console.error('Error updating order status:', error)
    } finally {
      setIsUpdating(false)
    }
  }, [isUpdating, loadOrders])

  const getStatusBadgeClass = useCallback((stato: Ordine['stato']) => {
    switch (stato) {
      case 'consegnato':
        return 'bg-green-100 text-green-800'
      case 'pronto':
        return 'bg-blue-100 text-blue-800'
      case 'in_stampa':
        return 'bg-yellow-100 text-yellow-800'
      case 'in_coda':
        return 'bg-purple-100 text-purple-800'
      case 'processamento':
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }, [])

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
          onChange={e => {
            setFilterOrg(e.target.value)
            setFilterComm('') // Reset commessa filter when org changes
          }}
          className="p-2 border rounded"
        >
          <option value="">Tutte le organizzazioni</option>
          {orgs.map(org => (
            <option key={org} value={org}>{org}</option>
          ))}
        </select>
        <select
          value={filterComm}
          onChange={e => setFilterComm(e.target.value)}
          className="p-2 border rounded"
          disabled={!filterOrg}
        >
          <option value="">Tutte le commesse</option>
          {commesse.map(comm => (
            <option key={comm} value={comm}>{comm}</option>
          ))}
        </select>
      </div>

      {filteredOrders.length === 0 ? (
        <p>Nessun ordine trovato.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse border">
            <thead>
              <tr className="bg-gray-50">
                <th className="border px-4 py-2 text-left">File</th>
                <th className="border px-4 py-2 text-left">Organizzazione</th>
                <th className="border px-4 py-2 text-left">Commessa</th>
                <th className="border px-4 py-2 text-left">Quantità</th>
                <th className="border px-4 py-2 text-left">Stato</th>
                <th className="border px-4 py-2 text-left">Data Ordine</th>
                <th className="border px-4 py-2 text-left">Consegna</th>
                <th className="border px-4 py-2 text-left">Note</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map(({ order, org, commessa, displayName }) => (
                <tr key={order.id}>
                  <td className="border px-4 py-2">
                    <span className="font-medium">{displayName}</span>
                  </td>
                  <td className="border px-4 py-2">{org}</td>
                  <td className="border px-4 py-2">{commessa}</td>
                  <td className="border px-4 py-2 text-center">{order.quantita}</td>
                  <td className="border px-4 py-2">
                    <select
                      value={order.stato}
                      onChange={e => handleStatusChange(order.id, e.target.value as Ordine['stato'])}
                      disabled={isUpdating}
                      className={`p-1 border rounded text-sm ${getStatusBadgeClass(order.stato)}`}
                    >
                      <option value="processamento">Processamento</option>
                      <option value="in_coda">In Coda</option>
                      <option value="in_stampa">In Stampa</option>
                      <option value="pronto">Pronto</option>
                      <option value="consegnato">Consegnato</option>
                    </select>
                  </td>
                  <td className="border px-4 py-2">
                    {new Date(order.data_ordine).toLocaleDateString('it-IT')}
                  </td>
                  <td className="border px-4 py-2">
                    {order.consegna_richiesta 
                      ? new Date(order.consegna_richiesta).toLocaleDateString('it-IT')
                      : '—'
                    }
                  </td>
                  <td className="border px-4 py-2">
                    {order.note ? (
                      <span className="text-sm text-gray-600" title={order.note}>
                        {order.note.length > 30 ? `${order.note.substring(0, 30)}...` : order.note}
                      </span>
                    ) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
