// src/components/FileTable.tsx
import React, { useMemo, useCallback } from 'react'
import { parseDisplayName } from '@/utils/fileUtils'
import type { FileRecord } from '@/types/file'
import type { Ordine } from '@/types/ordine'

/**
 * Un item può essere un FileRecord o un Ordine (con proprietà file_ordinato)
 */
export type FileItem = FileRecord & Partial<Ordine>

// Cache for parsed paths to avoid repeated string operations
interface ParsedPath {
  fullPath: string
  org: string
  commessa: string
  displayName: string
}

export interface FileTableProps<T extends FileItem> {
  items: T[]
  loading: boolean
  isAdmin: boolean
  search: string
  filterOrg: string
  filterComm: string
  onSearchChange: (q: string) => void
  onFilterOrgChange: (org: string) => void
  onFilterCommChange: (comm: string) => void
  onDownload: (path: string) => void
  onAssociate?: (original: string) => void
  onModifyAssociation?: (original: string) => void
  onStatusChange?: (id: number, newStatus: T['stato']) => void
}

export const FileTable = React.memo(function FileTable<T extends FileItem>({
  items,
  loading,
  isAdmin,
  search,
  filterOrg,
  filterComm,
  onSearchChange,
  onFilterOrgChange,
  onFilterCommChange,
  onDownload,
  onAssociate,
  onModifyAssociation,
  onStatusChange
}: FileTableProps<T>) {
  // Memoize parsed paths to avoid repeated string operations
  const parsedItems = useMemo(() => {
    return items.map((item): { item: T; parsed: ParsedPath } => {
      const fullPath = item.file_ordinato ?? item.nome_file
      const [org = '', commessa = ''] = fullPath.split('/')
      
      return {
        item,
        parsed: {
          fullPath,
          org,
          commessa,
          displayName: parseDisplayName(fullPath)
        }
      }
    })
  }, [items])

  // Extract unique organizations and commesse efficiently
  const { orgs, commesse } = useMemo(() => {
    const orgSet = new Set<string>()
    const commSet = new Set<string>()

    for (const { parsed } of parsedItems) {
      if (parsed.org) orgSet.add(parsed.org)
      if (parsed.commessa && (!filterOrg || parsed.org === filterOrg)) {
        commSet.add(parsed.commessa)
      }
    }

    return {
      orgs: Array.from(orgSet),
      commesse: Array.from(commSet)
    }
  }, [parsedItems, filterOrg])

  // Optimized filtering with single pass
  const filteredItems = useMemo(() => {
    let filtered = parsedItems

    // Apply text search if provided
    if (search.trim()) {
      const searchLower = search.toLowerCase()
      filtered = filtered.filter(({ parsed }) => 
        parsed.displayName.toLowerCase().includes(searchLower) ||
        parsed.commessa.toLowerCase().includes(searchLower)
      )
    }

    // Apply org and commessa filters
    if (filterOrg || filterComm) {
      filtered = filtered.filter(({ parsed }) => {
        const orgMatch = !filterOrg || parsed.org === filterOrg
        const commMatch = !filterComm || parsed.commessa === filterComm
        return orgMatch && commMatch
      })
    }

    return filtered
  }, [parsedItems, search, filterOrg, filterComm])

  // Memoize callbacks to prevent unnecessary re-renders
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onSearchChange(e.target.value)
  }, [onSearchChange])

  const handleOrgChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    onFilterOrgChange(e.target.value)
  }, [onFilterOrgChange])

  const handleCommChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    onFilterCommChange(e.target.value)
  }, [onFilterCommChange])

  if (loading) return <p>Caricamento…</p>

  return (
    <div>
      {/* Filtri UI */}
      <div className="flex gap-4 mb-6">
        <input
          type="text"
          placeholder="Cerca…"
          value={search}
          onChange={handleSearchChange}
          className="flex-1 p-2 border rounded"
        />
        <select
          value={filterOrg}
          onChange={handleOrgChange}
          className="p-2 border rounded"
        >
          <option value="">Tutte le organizzazioni</option>
          {orgs.map(org => (
            <option key={org} value={org}>{org}</option>
          ))}
        </select>
        <select
          value={filterComm}
          onChange={handleCommChange}
          className="p-2 border rounded"
          disabled={!filterOrg}
        >
          <option value="">Tutte le commesse</option>
          {commesse.map(comm => (
            <option key={comm} value={comm}>{comm}</option>
          ))}
        </select>
      </div>

      {filteredItems.length === 0 ? (
        <p>Nessun file trovato.</p>
      ) : (
        <table className="min-w-full border-collapse border">
          <thead>
            <tr className="bg-gray-50">
              <th className="border px-4 py-2 text-left">File</th>
              <th className="border px-4 py-2 text-left">Organizzazione</th>
              <th className="border px-4 py-2 text-left">Commessa</th>
              <th className="border px-4 py-2 text-left">Tipo</th>
              <th className="border px-4 py-2 text-left">Caricato</th>
              {isAdmin && <th className="border px-4 py-2 text-left">G-code</th>}
              {onStatusChange && <th className="border px-4 py-2 text-left">Stato</th>}
              <th className="border px-4 py-2 text-left">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map(({ item: i, parsed }) => (
              <tr key={i.id || parsed.fullPath}>
                <td className="border px-4 py-2">
                  <span className="font-medium">{parsed.displayName}</span>
                  {i.descrizione && (
                    <div className="text-sm text-gray-600">{i.descrizione}</div>
                  )}
                </td>
                <td className="border px-4 py-2">{parsed.org}</td>
                <td className="border px-4 py-2">{parsed.commessa}</td>
                <td className="border px-4 py-2">
                  <span className={`px-2 py-1 rounded text-xs ${
                    i.tipo === 'stl' ? 'bg-blue-100 text-blue-800' :
                    i.tipo === 'step' ? 'bg-green-100 text-green-800' :
                    i.tipo === 'gcode.3mf' ? 'bg-purple-100 text-purple-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {i.tipo?.toUpperCase()}
                  </span>
                </td>
                <td className="border px-4 py-2">
                  {i.data_caricamento ? new Date(i.data_caricamento).toLocaleDateString('it-IT') : '—'}
                </td>
                {isAdmin && (
                  <td className="border px-4 py-2">
                    {i.gcode_nome_file ? (
                      <div className="flex gap-2">
                        <span className="text-green-600">✓ Associato</span>
                        {onModifyAssociation && (
                          <button 
                            onClick={() => onModifyAssociation(parsed.fullPath)} 
                            className="px-2 py-1 bg-yellow-600 text-white rounded text-xs"
                          >
                            Modifica
                          </button>
                        )}
                      </div>
                    ) : onAssociate ? (
                      <button 
                        onClick={() => onAssociate(parsed.fullPath)} 
                        className="px-2 py-1 bg-green-600 text-white rounded text-xs"
                      >
                        Associa
                      </button>
                    ) : null}
                  </td>
                )}
                {onStatusChange && (
                  <td className="border px-4 py-2">
                    <select
                      value={(i as Ordine).stato || ''}
                      onChange={e => onStatusChange(i.id!, e.target.value as Ordine['stato'])}
                      className="p-1 border rounded text-sm"
                    >
                      <option value="processamento">Processamento</option>
                      <option value="in_coda">In Coda</option>
                      <option value="in_stampa">In Stampa</option>
                      <option value="pronto">Pronto</option>
                      <option value="consegnato">Consegnato</option>
                    </select>
                  </td>
                )}
                <td className="border px-4 py-2 text-center">
                  <button
                    onClick={() => onDownload(parsed.fullPath)}
                    className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                  >
                    Scarica
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
})
