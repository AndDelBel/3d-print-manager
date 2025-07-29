// src/components/FileTable.tsx
import React, { useMemo, useCallback } from 'react'
import { parseDisplayName } from '@/utils/fileUtils'
import { filterBySearch } from '@/utils/filterUtils'
import type { FileRecord } from '@/types/file'
import type { Ordine } from '@/types/ordine'

/**
 * Un item può essere un FileRecord o un Ordine (con proprietà file_ordinato)
 */
export type FileItem = FileRecord & Partial<Ordine>

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
  onAssociate?: (original: T) => void
  onModifyAssociation?: (original: T) => void
  onStatusChange?: (id: number, newStatus: T['stato']) => void
}

// Memoized table row component to prevent unnecessary re-renders
const TableRowComponent = <T extends FileItem>({ 
  item, 
  isAdmin, 
  onDownload, 
  onAssociate, 
  onModifyAssociation, 
  onStatusChange 
}: {
  item: T
  isAdmin: boolean
  onDownload: (path: string) => void
  onAssociate?: (original: T) => void
  onModifyAssociation?: (original: T) => void
  onStatusChange?: (id: number, newStatus: T['stato']) => void
}) => {
  const path = item.file_ordinato ?? item.nome_file
  const [org, comm] = path.split('/')

  // Memoized handlers to prevent recreation
  const handleDownload = useCallback(() => {
    onDownload(path)
  }, [onDownload, path])

  const handleGcodeDownload = useCallback(() => {
    if (item.gcode_nome_file) {
      onDownload(item.gcode_nome_file)
    }
  }, [onDownload, item.gcode_nome_file])

  const handleAssociate = useCallback(() => {
    onAssociate?.(item)
  }, [onAssociate, item])

  const handleModifyAssociation = useCallback(() => {
    onModifyAssociation?.(item)
  }, [onModifyAssociation, item])

  const handleStatusChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    if (item.id) {
      onStatusChange?.(item.id, e.target.value as Ordine['stato'])
    }
  }, [onStatusChange, item.id])

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="border px-4 py-3">{parseDisplayName(path)}</td>
      <td className="border px-4 py-3">{comm}</td>
      <td className="border px-4 py-3">{org}</td>
      {isAdmin && (
        <td className="border px-4 py-3 text-center">
          {item.gcode_nome_file ? (
            <div className="flex gap-2 justify-center">
              <button 
                onClick={handleGcodeDownload} 
                className="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
              >
                Scarica
              </button>
              {onModifyAssociation && (
                <button 
                  onClick={handleModifyAssociation} 
                  className="px-2 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700 text-sm"
                >
                  Modifica
                </button>
              )}
            </div>
          ) : onAssociate ? (
            <button 
              onClick={handleAssociate} 
              className="px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
            >
              Associa
            </button>
          ) : null}
        </td>
      )}
      {onStatusChange && (
        <td className="border px-4 py-3">
          <select
            value={(item as FileItem & { stato?: string }).stato || ''}
            onChange={handleStatusChange}
            className="p-1 border rounded text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="processamento">Processamento</option>
            <option value="in_coda">In Coda</option>
            <option value="in_stampa">In Stampa</option>
            <option value="pronto">Pronto</option>
            <option value="consegnato">Consegnato</option>
          </select>
        </td>
      )}
      <td className="border px-4 py-3 text-center">
        <button
          onClick={handleDownload}
          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
        >
          Scarica
        </button>
      </td>
    </tr>
  )
}

// Add display name
TableRowComponent.displayName = 'TableRowComponent'

const TableRow = React.memo(TableRowComponent) as typeof TableRowComponent

const FileTableComponent = <T extends FileItem>({
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
}: FileTableProps<T>) => {
  // Memoize path getter function
  const getPath = useCallback((i: FileItem) => i.file_ordinato ?? i.nome_file, [])

  // Memoize unique organizations with better performance
  const orgs = useMemo(() => {
    const orgSet = new Set<string>()
    items.forEach(i => {
      const org = getPath(i).split('/')[0]
      if (org) orgSet.add(org)
    })
    return Array.from(orgSet).sort()
  }, [items, getPath])

  // Memoize unique commesse with organization filter
  const commesse = useMemo(() => {
    const commSet = new Set<string>()
    items.forEach(i => {
      const [org, comm] = getPath(i).split('/')
      if ((!filterOrg || org === filterOrg) && comm) {
        commSet.add(comm)
      }
    })
    return Array.from(commSet).sort()
  }, [items, filterOrg, getPath])

  // Memoize text filtering - only when search or items change
  const textFiltered = useMemo(() => {
    if (!search.trim()) return items
    
    return filterBySearch(
      items,
      search,
      [i => parseDisplayName(getPath(i)), i => getPath(i).split('/')[1] || '']
    )
  }, [items, search, getPath])

  // Memoize final filtering
  const filtered = useMemo(() => {
    return textFiltered.filter(i => {
      const [org, comm] = getPath(i).split('/')
      const orgMatch = !filterOrg || org === filterOrg
      const commMatch = !filterComm || comm === filterComm
      return orgMatch && commMatch
    })
  }, [textFiltered, filterOrg, filterComm, getPath])

  // Memoized event handlers
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onSearchChange(e.target.value)
  }, [onSearchChange])

  const handleOrgChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    onFilterOrgChange(e.target.value)
  }, [onFilterOrgChange])

  const handleCommChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    onFilterCommChange(e.target.value)
  }, [onFilterCommChange])

  // Early loading return
  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="mt-2 text-gray-600">Caricamento file...</p>
      </div>
    )
  }

  return (
    <div>
      {/* Optimized Filters */}
      <div className="flex gap-4 mb-6">
        <input
          type="text"
          placeholder="Cerca…"
          value={search}
          onChange={handleSearchChange}
          className="flex-1 p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <select
          value={filterOrg}
          onChange={handleOrgChange}
          className="p-2 border rounded focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Tutte le organizzazioni</option>
          {orgs.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <select
          value={filterComm}
          onChange={handleCommChange}
          className="p-2 border rounded focus:ring-2 focus:ring-blue-500"
          disabled={!filterOrg}
        >
          <option value="">Tutte le commesse</option>
          {commesse.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Results Summary */}
      <div className="mb-4 text-sm text-gray-600">
        Mostrando {filtered.length} di {items.length} file
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>Nessun file trovato con i filtri selezionati.</p>
        </div>
      ) : (
        <div className="overflow-x-auto bg-white shadow-sm rounded-lg">
          <table className="w-full table-auto border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="border px-4 py-3 text-left font-medium">File</th>
                <th className="border px-4 py-3 text-left font-medium">Commessa</th>
                <th className="border px-4 py-3 text-left font-medium">Organizzazione</th>
                {isAdmin && <th className="border px-4 py-3 text-center font-medium">G-code</th>}
                {onStatusChange && <th className="border px-4 py-3 text-left font-medium">Stato</th>}
                <th className="border px-4 py-3 text-center font-medium">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => {
                const path = getPath(item)
                return (
                  <TableRow
                    key={path + (item.id || '')}
                    item={item}
                    isAdmin={isAdmin}
                    onDownload={onDownload}
                    onAssociate={onAssociate}
                    onModifyAssociation={onModifyAssociation}
                    onStatusChange={onStatusChange}
                  />
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// Add display name
FileTableComponent.displayName = 'FileTableComponent'

export const FileTable = React.memo(FileTableComponent) as typeof FileTableComponent
