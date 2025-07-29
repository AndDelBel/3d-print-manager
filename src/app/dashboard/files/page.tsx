// src/app/dashboard/files/page.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useUser } from '@/hooks/useUser'
import { listFiles, getDownloadUrl, uploadGcodeFile, associateGcodeFile } from '@/services/file'
import { listUserOrgs } from '@/services/organizzazione'
import { TabbedFileTable } from '@/components/TabbedFileTable'
import type { FileRecord } from '@/types/file'

export default function FilesPage() {
  const { loading } = useUser()
  const [files, setFiles] = useState<FileRecord[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Parallelize API calls for better performance
  useEffect(() => {
    if (!loading) {
      setIsLoadingData(true)
      setError(null)
      
      // Parallel execution instead of sequential
      Promise.all([
        listFiles(),
        listUserOrgs()
      ])
      .then(([filesData, orgsData]) => {
        setFiles(filesData)
        setIsAdmin(orgsData.some(o => o.is_admin))
      })
      .catch((err) => {
        console.error('Error loading data:', err)
        setError('Errore nel caricamento dei dati')
      })
      .finally(() => {
        setIsLoadingData(false)
      })
    }
  }, [loading])

  // Memoize download handler to prevent recreations
  const handleDownload = useCallback(async (path: string) => {
    try {
      const url = await getDownloadUrl(path)
      window.open(url, '_blank')
    } catch (err) {
      console.error('Errore download:', err)
      setError('Errore durante il download')
    }
  }, [])

  // Memoize Gcode action handler
  const handleGcodeAction = useCallback(async (original: FileRecord, file?: File) => {
    if (!file) return

    try {
      setIsLoadingData(true)
      
      // Parallel operations where possible
      const [orgName, baseName] = [
        original.nome_file.split('/')[0],
        original.nome_file.split('/').pop()!.split('.')[0]
      ]
      
      await uploadGcodeFile(
        file,
        original.commessa,
        null,
        original.organizzazione_id,
        orgName,
        baseName
      )
      
      await associateGcodeFile(original.nome_file, original.nome_file)
      
      // Refresh files after operations
      const updatedFiles = await listFiles()
      setFiles(updatedFiles)
    } catch (err) {
      console.error('Errore gestione G-code:', err)
      setError('Errore nella gestione del G-code')
    } finally {
      setIsLoadingData(false)
    }
  }, [])

  // Memoize file input handlers to avoid recreating DOM elements
  const createFileHandler = useCallback((original: FileRecord) => {
    return () => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = '.3mf'
      input.onchange = () => {
        const file = input.files?.[0]
        if (file) handleGcodeAction(original, file)
      }
      input.click()
    }
  }, [handleGcodeAction])

  // Memoize handlers to prevent unnecessary re-renders
  const associateHandler = useCallback((orig: FileRecord) => {
    createFileHandler(orig)()
  }, [createFileHandler])

  const modifyAssociationHandler = useCallback((orig: FileRecord) => {
    createFileHandler(orig)()
  }, [createFileHandler])

  // Show loading state
  if (loading || isLoadingData) return (
    <div className="p-8">
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded mb-4 w-48"></div>
        <div className="h-64 bg-gray-100 rounded"></div>
      </div>
    </div>
  )

  // Show error state
  if (error) return (
    <div className="p-8">
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
        {error}
      </div>
      <button 
        onClick={() => window.location.reload()} 
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Riprova
      </button>
    </div>
  )

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Elenco File</h1>
      <TabbedFileTable<FileRecord>
        items={files}
        loading={isLoadingData}
        isAdmin={isAdmin}
        onDownload={handleDownload}
        onAssociate={associateHandler}
        onModifyAssociation={modifyAssociationHandler}
      />
    </div>
  )
}