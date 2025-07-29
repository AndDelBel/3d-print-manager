// src/components/TabbedFileTable.tsx
import React, { useState, useCallback, useMemo } from 'react'
import { FileTable } from '@/components/FileTable'
import type { FileRecord } from '@/types/file'
import type { Ordine } from '@/types/ordine'

export type TabbedItem = FileRecord & Partial<Ordine> & { is_superato?: boolean }

export interface TabbedFileTableProps<T extends TabbedItem> {
  items: T[]
  loading: boolean
  isAdmin: boolean
  onDownload: (path: string) => void
  onAssociate?: (original: T) => void
  onModifyAssociation?: (original: T) => void
  onStatusChange?: (id: number, newStatus: T['stato']) => void
}

// Component function
const TabbedFileTableComponent = <T extends TabbedItem>({
  items,
  loading,
  isAdmin,
  onDownload,
  onAssociate,
  onModifyAssociation,
  onStatusChange,
}: TabbedFileTableProps<T>) => {
  const [activeTab, setActiveTab] = useState<'attivi' | 'superati'>('attivi')

  // Memoize filtered items to avoid recalculation on every render
  const { activeItems, expiredItems } = useMemo(() => {
    const active = items.filter(i => !i.is_superato)
    const expired = items.filter(i => !!i.is_superato)
    return { activeItems: active, expiredItems: expired }
  }, [items])

  // Memoize display items based on active tab
  const displayItems = useMemo(() => {
    return activeTab === 'attivi' ? activeItems : expiredItems
  }, [activeTab, activeItems, expiredItems])

  // Memoized tab change handler
  const handleTabChange = useCallback((tab: 'attivi' | 'superati') => {
    setActiveTab(tab)
  }, [])

  // Memoized associate handler that preserves the original object
  const handleAssociate = useCallback((original: T) => {
    onAssociate?.(original)
  }, [onAssociate])

  // Memoized modify association handler
  const handleModifyAssociation = useCallback((original: T) => {
    onModifyAssociation?.(original)
  }, [onModifyAssociation])

  // Check if tabs are needed (admin + has expired items)
  const showTabs = isAdmin && expiredItems.length > 0

  return (
    <div>
      {/* Only render tabs if needed */}
      {showTabs && (
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
        </div>
      )}

      <FileTable<T>
        items={displayItems}
        loading={loading}
        isAdmin={isAdmin}
        search=""
        filterOrg=""
        filterComm=""
        onSearchChange={() => {}} // No-op since filters are handled at page level
        onFilterOrgChange={() => {}}
        onFilterCommChange={() => {}}
        onDownload={onDownload}
        onAssociate={handleAssociate}
        onModifyAssociation={handleModifyAssociation}
        onStatusChange={onStatusChange}
      />
    </div>
  )
}

// Memoize the component to prevent unnecessary re-renders
export const TabbedFileTable = React.memo(TabbedFileTableComponent) as typeof TabbedFileTableComponent