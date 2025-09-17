// src/components/FileTable.tsx
import React, { useMemo } from 'react'
import { parseDisplayName } from '@/utils/fileUtils'
import { filterBySearch } from '@/utils/filterUtils'
import type { FileOrigine } from '@/types/fileOrigine'
import type { Ordine } from '@/types/ordine'
import type { Gcode } from '@/types/gcode'
import { LoadingButton } from '@/components/LoadingButton'

/**
 * Un item può essere un FileRecord o un Ordine (con proprietà file_ordinato)
 */
export type FileItem = FileOrigine & Partial<Ordine> & { is_superato?: boolean }

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
  gcodeLoading?: boolean
  onDelete?: (item: T) => void
  gcodeMap: Map<number, Gcode[]>
  onMarkSuperato?: (item: T) => void
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
  onStatusChange,
  gcodeLoading,
  onDelete,
  gcodeMap,
  onMarkSuperato
}: FileTableProps<T>) {
  // Determina path corretto per file_ordinato o nome_file
  const getPath = (i: FileItem) => i.nome_file

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
      <div className="w-full">
        {/* Desktop Table View */}
        <div className="hidden md:block">
          <div className="overflow-x-auto overscroll-x-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200">
            <table className="w-full table-auto border-collapse min-w-[700px]">
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
            const gcodeList = gcodeMap.get(i.id)
            console.log('FileTable row', { id: i.id, nome_file: i.nome_file, gcode: gcodeList })
            return (
              <tr key={i.id}>
                <td className="border px-4 py-2">{parseDisplayName(path)}</td>
                <td className="border px-4 py-2">{comm}</td>
                <td className="border px-4 py-2">{org}</td>
                {isAdmin && (
                  <td className="border px-4 py-2 text-center">
                    {Array.isArray(gcodeList) && gcodeList.length > 0 ? (
                      gcodeList.map(g => (
                        <span key={g.id} className="inline-flex items-center gap-2 mr-2">
                          <LoadingButton
                            type="button"
                            loading={gcodeLoading ?? false}
                            loadingText="Scarico…"
                            onClick={() => onDownload(g.nome_file)}
                            className="px-2 py-1 bg-blue-600 text-white rounded"
                          >
                            Scarica
                          </LoadingButton>
                          {onModifyAssociation && (
                            <LoadingButton
                              type="button"
                              loading={gcodeLoading ?? false}
                              loadingText="Salvataggio…"
                              onClick={() => onModifyAssociation(i)}
                              className="px-2 py-1 bg-yellow-600 text-white rounded"
                            >
                              Modifica
                            </LoadingButton>
                          )}
                        </span>
                      ))
                    ) : (
                      onAssociate && (
                        <LoadingButton
                          type="button"
                          loading={gcodeLoading ?? false}
                          loadingText="Salvataggio…"
                          onClick={() => onAssociate(i)}
                          className="px-2 py-1 bg-green-600 text-white rounded"
                        >
                          Associa
                        </LoadingButton>
                      )
                    )}
                  </td>
                )}
                {onStatusChange && (
                  <td className="border px-4 py-2">
                    <select
                      value={i.stato ?? ''}
                      onChange={e => onStatusChange(i.id!, e.target.value as Ordine['stato'])}
                      className="p-1 border rounded"
                    >
                      {['processamento','in_coda','in_stampa','pronto','consegnato'].map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </td>
                )}
                <td className="border px-4 py-2 text-center">
                  {isAdmin && !i.is_superato && onMarkSuperato && (
                    <button
                      onClick={() => onMarkSuperato(i)}
                      className="ml-2 px-3 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700"
                    >Rendi superato</button>
                  )}
                  {isAdmin && i.is_superato && onDelete && (
                    <button
                      onClick={() => onDelete(i)}
                      className="ml-2 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                    >Elimina</button>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
          </div>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden space-y-4">
          {filtered.map(i => {
            const path = getPath(i)
            const [org, comm] = path.split('/')
            const gcodeList = gcodeMap.get(i.id)
            
            return (
              <div key={i.id} className="card bg-base-100 shadow-xl border border-base-300">
                <div className="card-body p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="card-title text-lg truncate">{parseDisplayName(path)}</h3>
                    {onStatusChange && (
                      <div className="badge badge-outline">
                        {i.is_superato ? 'Superato' : 'Attivo'}
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="font-medium">Commessa:</span>
                      <span className="text-right">{comm}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="font-medium">Organizzazione:</span>
                      <span className="text-right">{org}</span>
                    </div>
                    
                    {isAdmin && gcodeList && Array.isArray(gcodeList) && gcodeList.length > 0 && (
                      <div className="flex justify-between">
                        <span className="font-medium">G-code:</span>
                        <div className="text-right">
                          {gcodeList.map(g => (
                            <div key={g.id} className="mb-1">
                              <button
                                onClick={() => onDownload(g.nome_file)}
                                className="btn btn-xs btn-primary"
                                disabled={gcodeLoading}
                              >
                                {gcodeLoading ? 'Scarico...' : 'Scarica'}
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="card-actions justify-end mt-4">
                    {onAssociate && (
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => onAssociate(i)}
                      >
                        Associa
                      </button>
                    )}
                    {onModifyAssociation && (
                      <button
                        className="btn btn-sm btn-outline"
                        onClick={() => onModifyAssociation(i)}
                      >
                        Modifica
                      </button>
                    )}
                    {onStatusChange && !i.is_superato && onMarkSuperato && (
                      <button
                        onClick={() => onMarkSuperato(i)}
                        className="btn btn-sm btn-warning"
                      >
                        Rendi superato
                      </button>
                    )}
                    {isAdmin && i.is_superato && onDelete && (
                      <button
                        onClick={() => onDelete(i)}
                        className="btn btn-sm btn-error"
                      >
                        Elimina
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
