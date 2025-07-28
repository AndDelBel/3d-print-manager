// src/app/dashboard/files/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@/hooks/useUser'
import { listFiles, getDownloadUrl, uploadGcodeFile, associateGcodeFile } from '@/services/file'
import { listUserOrgs } from '@/services/organizzazione'
import { TabbedFileTable } from '@/components/TabbedFileTable'
import type { FileRecord } from '@/types/file'

export default function FilesPage() {
  const { loading } = useUser()
  const [files, setFiles] = useState<FileRecord[]>([])
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    if (!loading) {
      listFiles().then(setFiles).catch(console.error)
      listUserOrgs()
        .then(orgs => setIsAdmin(orgs.some(o => o.role === 'admin')))
        .catch(console.error)
    }
  }, [loading])

  const handleDownload = async (path: string) => {
    try {
      const url = await getDownloadUrl(path)
      window.open(url, '_blank')
    } catch (err) {
      console.error('Errore download:', err)
    }
  }

  const handleGcodeAction = async (original: FileRecord, file?: File) => {
    if (file) {
      // upload new .3mf
      await uploadGcodeFile(
        file,
        original.commessa,
        null,
        original.organizzazione_id,
        original.nome_file.split('/')[0],        // org name
        original.nome_file.split('/').pop()!.split('.')[0] // base name
      )
      await associateGcodeFile(original.nome_file, original.nome_file) // or use returned path
      setFiles(await listFiles())
    } else {
      // modify association: reuse same handler
      // you can pop up file input then call this
    }
  }

  const handleAssociate = (originalPath: string) => {
    // Find the FileRecord corresponding to the path
    const originalFile = files.find(f => f.nome_file === originalPath)
    if (!originalFile) return

    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.3mf'
    input.onchange = () => {
      const file = input.files?.[0]
      if (file) handleGcodeAction(originalFile, file)
    }
    input.click()
  }

  if (loading) return <p>Caricamento…</p>

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Elenco File</h1>
      <TabbedFileTable
        items={files}
        loading={loading}
        isAdmin={isAdmin}
        onDownload={handleDownload}
        onAssociate={handleAssociate}
        onModifyAssociation={handleAssociate}
      />
    </div>
  )
}