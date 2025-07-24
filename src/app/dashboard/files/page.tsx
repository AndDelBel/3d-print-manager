'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/hooks/useUser'
import {
  listFiles,
  getDownloadUrl,
  uploadGcodeFile,
  associateGcodeFile
} from '@/services/file'
import { listUserOrgs } from '@/services/organizzazione'
import { parseDisplayName } from '@/utils/fileUtils'
import type { FileRecord } from '@/types/file'

export default function FilesPage() {
  const router = useRouter()
  const { loading } = useUser()

  const [files, setFiles] = useState<FileRecord[]>([])
  const [userOrgs, setUserOrgs] = useState<string[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [uploading, setUploading] = useState<Record<string, boolean>>({})
  const [error, setError] = useState<string | null>(null)

  // 1) Carica file e membership
  useEffect(() => {
    if (!loading) {
      listFiles().then(setFiles).catch(console.error)
      listUserOrgs()
        .then(orgs => {
          setUserOrgs(orgs.map(o => o.id.toString()))
          setIsAdmin(orgs.some(o => o.is_admin))
        })
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

  const handleGcodeUpload = async (orig: FileRecord, file: File) => {
    setError(null)
    setUploading(u => ({ ...u, [orig.nome_file]: true }))
    try {
      const newNome = await uploadGcodeFile(
        file,
        orig.commessa,
        null,
        orig.organizzazione_id
      )
      await associateGcodeFile(orig.nome_file, newNome)
      setFiles(await listFiles())
    } catch (e: unknown) {
      console.error(e)
      if (e instanceof Error) {
        setError(e.message || 'Errore upload G-code')
      } else {
        setError('Errore upload G-code')
      }
    } finally {
      setUploading(u => ({ ...u, [orig.nome_file]: false }))
    }
  }

  if (loading) return <p>Caricamento…</p>

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Elenco File</h1>
      {error && <div className="mb-4 text-red-600">{error}</div>}

      <table className="w-full table-auto border-collapse">
        <thead>
          <tr>
            <th className="border px-4 py-2">File</th>
            <th className="border px-4 py-2">Commessa</th>
            <th className="border px-4 py-2">Tipo</th>
            <th className="border px-4 py-2">Azioni</th>
            {isAdmin && <th className="border px-4 py-2">G-code</th>}
          </tr>
        </thead>
        <tbody>
          {files.map(f => (
            <tr key={f.nome_file}>
              <td className="border px-4 py-2">{parseDisplayName(f.nome_file)}</td>
              <td className="border px-4 py-2">{f.commessa}</td>
              <td className="border px-4 py-2">{f.tipo}</td>
              <td className="border px-4 py-2">
                <button
                  onClick={() => handleDownload(f.nome_file)}
                  className="px-3 py-1 bg-blue-600 text-white rounded"
                >
                  Scarica
                </button>
              </td>
              {isAdmin && (
                <td className="border px-4 py-2">
                  {f.gcode_nome_file ? (
                    <button
                      onClick={() => handleDownload(f.gcode_nome_file!)}
                      className="px-3 py-1 bg-green-600 text-white rounded"
                    >
                      Scarica G-code
                    </button>
                  ) : (
                    <input
                      type="file"
                      accept=".3mf"
                      disabled={uploading[f.nome_file]}
                      onChange={e => {
                        const file = e.target.files?.[0]
                        if (file) handleGcodeUpload(f, file)
                      }}
                      className="block"
                    />
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}