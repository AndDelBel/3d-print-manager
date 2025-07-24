// src/components/FileTable.tsx
import React, { useMemo } from 'react'
import { parseDisplayName } from '@/utils/fileUtils'
import { filterBySearch } from '@/utils/filterUtils'
import type { FileRecord } from '@/types/file'
import type { Ordine } from '@/types/ordine'

/**
 * Un item può essere un FileRecord o un Ordine (con proprietà file_ordinato)
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
  onAssociate?: (original: string) => void
  onModifyAssociation?: (original: string) => void
  onStatusChange?: (id: number, newStatus: T['stato']) => void
}

export function FileTable<T extends FileItem>({
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
  // Determina path corretto per file_ordinato o nome_file
  const getPath = (i: FileItem) => i.file_ordinato ?? i.nome_file

  // Lista uniche organizzazioni (primo segmento del path)
  const orgs = useMemo(
    () => Array.from(new Set(items.map(i => getPath(i).split('/')[0]))),
    [items]
  )

  // Lista uniche commesse filtrate per organizzazione
  const commesse = useMemo(
    () => Array.from(
      new Set(
        items
          .filter(i => !filterOrg || getPath(i).split('/')[0] === filterOrg)
          .map(i => getPath(i).split('/')[1])
      )
    ),
    [items, filterOrg]
  )

  // Filtra per testo
  const textFiltered = useMemo(
    () => filterBySearch(
      items,
      search,
      [i => parseDisplayName(getPath(i)), i => getPath(i).split('/')[1]]
    ),
    [items, search]
  )

  // Applica filtri organizzazione e commessa
  const filtered = useMemo(
    () => textFiltered.filter(i => {
      const [org, comm] = getPath(i).split('/')
      return (!filterOrg || org === filterOrg) && (!filterComm || comm === filterComm)
    }),
    [textFiltered, filterOrg, filterComm]
  )

  if (loading) return <p>Caricamento…</p>

  return (
    <div>
      {/* Filtri UI */}
      <div className="flex gap-4 mb-6">
        <input
          type="text"
          placeholder="Cerca…"
          value={search}
          onChange={e => onSearchChange(e.target.value)}
          className="flex-1 p-2 border rounded"
        />
        <select
          value={filterOrg}
          onChange={e => onFilterOrgChange(e.target.value)}
          className="p-2 border rounded"
        >
          <option value="">Tutte le organizzazioni</option>
          {orgs.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <select
          value={filterComm}
          onChange={e => onFilterCommChange(e.target.value)}
          className="p-2 border rounded"
          disabled={!filterOrg}
        >
          <option value="">Tutte le commesse</option>
          {commesse.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Tabella */}
      <table className="w-full table-auto border-collapse">
        <thead>
          <tr>
            <th className="border px-4 py-2">File</th>
            <th className="border px-4 py-2">Commessa</th>
            <th className="border px-4 py-2">Organizzazione</th>
            {isAdmin && <th className="border px-4 py-2">G-code</th>}
            {onStatusChange && <th className="border px-4 py-2">Stato</th>}
            <th className="border px-4 py-2">Azioni</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map(i => {
            const path = getPath(i)
            const [org, comm] = path.split('/')
            return (
              <tr key={path}>
                <td className="border px-4 py-2">{parseDisplayName(path)}</td>
                <td className="border px-4 py-2">{comm}</td>
                <td className="border px-4 py-2">{org}</td>
                {isAdmin && (
                  <td className="border px-4 py-2 text-center">
                    {i.gcode_nome_file ? (
                      <>
                        <button onClick={() => onDownload(i.gcode_nome_file!)} className="px-2 py-1 bg-blue-600 text-white rounded">Scarica</button>
                        {onModifyAssociation && <button onClick={() => onModifyAssociation(path)} className="ml-2 px-2 py-1 bg-yellow-600 text-white rounded">Modifica</button>}
                      </>
                    ) : onAssociate ? (
                      <button onClick={() => onAssociate(path)} className="px-2 py-1 bg-green-600 text-white rounded">Associa</button>
                    ) : null}
                  </td>
                )}
                {onStatusChange && (
                  <td className="border px-4 py-2">
                    <select
                      value={(i as any).stato || ''}
                      onChange={e => onStatusChange(i.id!, e.target.value as Ordine['stato'])}
                      className="p-1 border rounded"
                    >
                      {['pending','printing','done','completed'].map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </td>
                )}
                <td className="border px-4 py-2 text-center">
                  <button
                    onClick={() => onDownload(path)}
                    className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >Scarica</button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
