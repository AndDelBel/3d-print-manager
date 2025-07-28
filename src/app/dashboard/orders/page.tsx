// src/app/dashboard/orders/page.tsx
'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useUser } from '@/hooks/useUser'
import { listOrders, updateOrderStatus } from '@/services/ordine'
import { parseDisplayName } from '@/utils/fileUtils'
import { filterBySearch } from '@/utils/filterUtils'
import type { Ordine } from '@/types/ordine'

// Custom hook for debounced search
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

export default function OrdersPage() {
  const { loading } = useUser()
  const [orders, setOrders] = useState<Ordine[]>([])
  const [search, setSearch] = useState('')
  const [filterOrg, setFilterOrg] = useState('')
  const [filterComm, setFilterComm] = useState('')
  const [isLoadingData, setIsLoadingData] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [updatingOrderId, setUpdatingOrderId] = useState<number | null>(null)

  // Debounce search to avoid excessive filtering
  const debouncedSearch = useDebounce(search, 300)

  // Load orders with better error handling
  const loadOrders = useCallback(async () => {
    setIsLoadingData(true)
    setError(null)
    try {
      const ordersData = await listOrders()
      setOrders(ordersData)
    } catch (err) {
      console.error('Error loading orders:', err)
      setError('Errore nel caricamento degli ordini')
    } finally {
      setIsLoadingData(false)
    }
  }, [])

  useEffect(() => {
    if (!loading) {
      loadOrders()
    }
  }, [loading, loadOrders])

  // Memoize unique organizations - only recalculate when orders change
  const orgs = useMemo(() => {
    const orgSet = new Set<string>()
    orders.forEach(o => {
      const org = o.file_ordinato.split('/')[0]
      if (org) orgSet.add(org)
    })
    return Array.from(orgSet)
  }, [orders])

  // Memoize commesse based on org filter - only recalculate when orders or filterOrg change
  const commesse = useMemo(() => {
    const commSet = new Set<string>()
    orders.forEach(o => {
      const [org, comm] = o.file_ordinato.split('/')
      if ((!filterOrg || org === filterOrg) && comm) {
        commSet.add(comm)
      }
    })
    return Array.from(commSet)
  }, [orders, filterOrg])

  // Memoize text filtering with debounced search
  const textFiltered = useMemo(() => {
    if (!debouncedSearch.trim()) return orders
    
    return filterBySearch(
      orders,
      debouncedSearch,
      [o => parseDisplayName(o.file_ordinato), o => o.file_ordinato.split('/')[1] || '']
    )
  }, [orders, debouncedSearch])

  // Memoize final filtered results
  const filtered = useMemo(() => {
    return textFiltered.filter(o => {
      const [org, comm] = o.file_ordinato.split('/')
      const orgMatch = !filterOrg || org === filterOrg
      const commMatch = !filterComm || comm === filterComm
      return orgMatch && commMatch
    })
  }, [textFiltered, filterOrg, filterComm])

  // Memoized status change handler
  const handleStatusChange = useCallback(async (id: number, newStatus: Ordine['stato']) => {
    setUpdatingOrderId(id)
    try {
      await updateOrderStatus(id, newStatus)
      // Update order in local state instead of refetching all orders
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === id ? { ...order, stato: newStatus } : order
        )
      )
    } catch (err) {
      console.error('Error updating order status:', err)
      setError('Errore nell\'aggiornamento dello stato')
    } finally {
      setUpdatingOrderId(null)
    }
  }, [])

  // Memoized filter handlers
  const handleSearchChange = useCallback((value: string) => {
    setSearch(value)
  }, [])

  const handleOrgChange = useCallback((value: string) => {
    setFilterOrg(value)
    setFilterComm('') // Reset commessa filter when org changes
  }, [])

  const handleCommChange = useCallback((value: string) => {
    setFilterComm(value)
  }, [])

  // Loading state
  if (loading) return (
    <div className="p-8">
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded mb-4 w-48"></div>
        <div className="h-64 bg-gray-100 rounded"></div>
      </div>
    </div>
  )

  // Error state
  if (error && !orders.length) return (
    <div className="p-8">
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
        {error}
      </div>
      <button 
        onClick={loadOrders} 
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Riprova
      </button>
    </div>
  )

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Coda Ordini</h1>

      {/* Error notification */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
          <button 
            onClick={() => setError(null)} 
            className="float-right text-red-500 hover:text-red-700"
          >
            ×
          </button>
        </div>
      )}

      {/* Optimized Filters */}
      <div className="flex gap-4 mb-6">
        <input
          type="text"
          placeholder="Cerca per file o commessa…"
          value={search}
          onChange={e => handleSearchChange(e.target.value)}
          className="flex-1 p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <select
          value={filterOrg}
          onChange={e => handleOrgChange(e.target.value)}
          className="p-2 border rounded focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Tutte le organizzazioni</option>
          {orgs.map(o => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
        <select
          value={filterComm}
          onChange={e => handleCommChange(e.target.value)}
          className="p-2 border rounded focus:ring-2 focus:ring-blue-500"
          disabled={!filterOrg}
        >
          <option value="">Tutte le commesse</option>
          {commesse.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Loading indicator for data */}
      {isLoadingData && (
        <div className="text-center py-4">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="ml-2">Caricamento...</span>
        </div>
      )}

      {/* Results */}
      {filtered.length === 0 ? (
        <p className="text-gray-600 text-center py-8">
          {orders.length === 0 ? 'Nessun ordine presente.' : 'Nessun ordine trovato con i filtri selezionati.'}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full table-auto border-collapse bg-white shadow-sm rounded-lg">
            <thead>
              <tr className="bg-gray-50">
                <th className="border px-4 py-3 text-left">ID</th>
                <th className="border px-4 py-3 text-left">File</th>
                <th className="border px-4 py-3 text-left">Commessa</th>
                <th className="border px-4 py-3 text-left">Organizzazione</th>
                <th className="border px-4 py-3 text-left">Quantità</th>
                <th className="border px-4 py-3 text-left">Data Ordine</th>
                <th className="border px-4 py-3 text-left">Stato</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(o => {
                const [org, comm] = o.file_ordinato.split('/')
                const isUpdating = updatingOrderId === o.id
                
                return (
                  <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                    <td className="border px-4 py-3">{o.id}</td>
                    <td className="border px-4 py-3">{parseDisplayName(o.file_ordinato)}</td>
                    <td className="border px-4 py-3">{comm}</td>
                    <td className="border px-4 py-3">{org}</td>
                    <td className="border px-4 py-3">{o.quantita}</td>
                    <td className="border px-4 py-3">
                      {new Date(o.data_ordine).toLocaleDateString('it-IT')}
                    </td>
                    <td className="border px-4 py-3">
                      <div className="flex items-center gap-2">
                        <select
                          value={o.stato}
                          onChange={e => handleStatusChange(o.id!, e.target.value as Ordine['stato'])}
                          disabled={isUpdating}
                          className="p-1 border rounded text-sm focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                        >
                          <option value="processamento">Processamento</option>
                          <option value="in_coda">In Coda</option>
                          <option value="in_stampa">In Stampa</option>
                          <option value="pronto">Pronto</option>
                          <option value="consegnato">Consegnato</option>
                        </select>
                        {isUpdating && (
                          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
