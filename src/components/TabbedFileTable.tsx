// src/components/TabbedFileTable.tsx
import React, { useState, useMemo, useCallback } from 'react'
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

export const TabbedFileTable = React.memo(function TabbedFileTable<T extends TabbedItem>({
  items,
  loading,
  isAdmin,
  onDownload,
  onAssociate,
  onModifyAssociation,
  onStatusChange,
}: TabbedFileTableProps<T>) {
  const [activeTab, setActiveTab] = useState<'attivi' | 'superati'>('attivi')
  const [search, setSearch] = useState('')
  const [filterOrg, setFilterOrg] = useState('')
  const [filterComm, setFilterComm] = useState('')

  // Memoize filtered items for better performance
  const { activeItems, expiredItems } = useMemo(() => {
    const active = items.filter(i => !i.is_superato)
    const expired = items.filter(i => !!i.is_superato)
    return { activeItems: active, expiredItems: expired }
  }, [items])

  const displayItems = useMemo(() => {
    return activeTab === 'attivi' ? activeItems : expiredItems
  }, [activeTab, activeItems, expiredItems])

  // Memoize callbacks to prevent unnecessary re-renders
  const handleTabChange = useCallback((tab: 'attivi' | 'superati') => {
    setActiveTab(tab)
    // Reset filters when changing tabs
    setSearch('')
    setFilterOrg('')
    setFilterComm('')
  }, [])

  const handleSearchChange = useCallback((query: string) => {
    setSearch(query)
  }, [])

  const handleFilterOrgChange = useCallback((org: string) => {
    setFilterOrg(org)
    // Reset commessa filter when org changes
    setFilterComm('')
  }, [])

  const handleFilterCommChange = useCallback((comm: string) => {
    setFilterComm(comm)
  }, [])

  return (
    <div>
      <div className="flex gap-4 mb-4">
        <button
          className={`px-4 py-2 rounded transition-colors ${
            activeTab === 'attivi' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-200 hover:bg-gray-300'
          }`}
          onClick={() => handleTabChange('attivi')}
        >
          Attivi ({activeItems.length})
        </button>
        {isAdmin && (
          <button
            className={`px-4 py-2 rounded transition-colors ${
              activeTab === 'superati' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 hover:bg-gray-300'
            }`}
            onClick={() => handleTabChange('superati')}
          >
            Superati ({expiredItems.length})
          </button>
        )}
      </div>

      <FileTable
        items={displayItems}
        loading={loading}
        isAdmin={isAdmin}
        search={search}
        filterOrg={filterOrg}
        filterComm={filterComm}
        onSearchChange={handleSearchChange}
        onFilterOrgChange={handleFilterOrgChange}
        onFilterCommChange={handleFilterCommChange}
        onDownload={onDownload}
        onAssociate={onAssociate}
        onModifyAssociation={onModifyAssociation}
        onStatusChange={onStatusChange}
      />
    </div>
  )
})