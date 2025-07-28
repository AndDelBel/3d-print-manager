// src/components/TabbedFileTable.tsx
import React, { useState } from 'react'
import { FileTable } from '@/components/FileTable'
import type { Ordine } from '@/types/ordine'
import type { Gcode } from '@/types/gcode'
import type { FileOrigine } from '@/types/fileOrigine'

export type TabbedItem = Partial<Ordine> & { is_superato?: boolean }

// Extended FileOrigine type with optional is_superato property
type FileOrigineWithSuperato = FileOrigine & { is_superato?: boolean }

export interface TabbedFileTableProps {
  items: FileOrigineWithSuperato[]
  loading: boolean
  isAdmin: boolean
  search: string
  filterOrg: string
  filterComm: string
  onSearchChange: (q: string) => void
  onFilterOrgChange: (org: string) => void
  onFilterCommChange: (comm: string) => void
  onDownload: (path: string) => void
  onAssociate?: (original: FileOrigineWithSuperato) => void
  onModifyAssociation?: (original: FileOrigineWithSuperato) => void
  gcodeLoading?: boolean
  onDelete?: (item: FileOrigineWithSuperato) => void
  gcodeMap: Map<number, Gcode[]>
  onMarkSuperato?: (item: FileOrigineWithSuperato) => void
}

export function TabbedFileTable({
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
  gcodeLoading,
  onDelete,
  gcodeMap,
  onMarkSuperato,
}: TabbedFileTableProps) {
  const [activeTab, setActiveTab] = useState<'attivi' | 'superati'>('attivi')

  const activeItems = items.filter(i => !i.is_superato)
  const expiredItems = items.filter(i => !!i.is_superato)
  const displayItems = activeTab === 'attivi' ? activeItems : expiredItems

  return (
    <div>
      <div className="tabs tabs-boxed mb-4">
        <button
          className={`tab ${activeTab === 'attivi' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('attivi')}
        >
          Attivi
        </button>
        {isAdmin && (
          <button
            className={`tab ${activeTab === 'superati' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('superati')}
          >
            Superati
          </button>
        )}
      </div>

      <FileTable<FileOrigineWithSuperato>
        items={displayItems}
        loading={loading}
        isAdmin={isAdmin}
        search={search}
        filterOrg={filterOrg}
        filterComm={filterComm}
        onSearchChange={onSearchChange}
        onFilterOrgChange={onFilterOrgChange}
        onFilterCommChange={onFilterCommChange}
        onDownload={onDownload}
        onAssociate={onAssociate}
        onModifyAssociation={onModifyAssociation}
        gcodeLoading={gcodeLoading}
        onDelete={onDelete}
        gcodeMap={gcodeMap}
        onMarkSuperato={onMarkSuperato}
      />
    </div>
  )
}