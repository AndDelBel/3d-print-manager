// src/components/TabbedFileTable.tsx
import React, { useState } from 'react'
import { FileTable } from '@/components/FileTable'
import type { FileRecord } from '@/types/file'
import type { Ordine } from '@/types/ordine'

export type TabbedItem = FileRecord & Partial<Ordine> & { is_superato?: boolean }

export interface TabbedFileTableProps<T extends TabbedItem> {
  items: T[]
  loading: boolean
  isAdmin: boolean
  onDownload: (path: string) => void
  onAssociate?: (original: string) => void
  onModifyAssociation?: (original: string) => void
  onStatusChange?: (id: number, newStatus: T['stato']) => void
}

export function TabbedFileTable<T extends TabbedItem>({
  items,
  loading,
  isAdmin,
  onDownload,
  onAssociate,
  onModifyAssociation,
  onStatusChange,
}: TabbedFileTableProps<T>) {
  const [activeTab, setActiveTab] = useState<'attivi' | 'superati'>('attivi')

  const activeItems = items.filter(i => !i.is_superato)
  const expiredItems = items.filter(i => !!i.is_superato)
  const displayItems = activeTab === 'attivi' ? activeItems : expiredItems

  return (
    <div>
      <div className="flex gap-4 mb-4">
        <button
          className={`px-4 py-2 rounded ${activeTab === 'attivi' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          onClick={() => setActiveTab('attivi')}
        >
          Attivi
        </button>
        {isAdmin && (
          <button
            className={`px-4 py-2 rounded ${activeTab === 'superati' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
            onClick={() => setActiveTab('superati')}
          >
            Superati
          </button>
        )}
      </div>

      <FileTable<T>
        items={displayItems}
        loading={loading}
        isAdmin={isAdmin}
        search=""
        filterOrg=""
        filterComm=""
        onSearchChange={() => {}}
        onFilterOrgChange={() => {}}
        onFilterCommChange={() => {}}
        onDownload={onDownload}
        onAssociate={onAssociate}
        onModifyAssociation={onModifyAssociation}
        onStatusChange={onStatusChange}
      />
    </div>
  )
}