// src/app/dashboard/files/page.tsx
'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { useUser } from '@/hooks/useUser'
import { useRetryFetch } from '@/hooks/useRetryFetch'
import { listOrg } from '@/services/organizzazione'
import { listCommesse } from '@/services/commessa'
import { listFileOrigine, deleteFileOrigine } from '@/services/fileOrigine'
import { listGcode, uploadGcode } from '@/services/gcode'
import { TabellaFile } from '@/components/TabellaFile'
import type { RigaFile } from '@/components/RigaTabellaFile'
import type { FileOrigine } from '@/types/fileOrigine'
import type { Commessa } from '@/types/commessa'
import type { Organizzazione } from '@/types/organizzazione'
import { AlertMessage } from '@/components/AlertMessage'

import { ConfirmModal } from '@/components/ConfirmModal'
import type { Gcode } from '@/types/gcode'
import { filterBySearch } from '@/utils/filterUtils'

export default function FilesPage() {
  const { loading, user } = useUser()
  const [orgs, setOrgs] = useState<Organizzazione[]>([])
  const [orgId, setOrgId] = useState<number | undefined>(undefined)
  const [commesse, setCommesse] = useState<Commessa[]>([])
  const [commessaId, setCommessaId] = useState<number | undefined>(undefined)
  const [files, setFiles] = useState<FileOrigine[]>([])
  const [search, setSearch] = useState('')
  const [gcodeError, setGcodeError] = useState<string | null>(null)
  const [gcodeSuccess, setGcodeSuccess] = useState<string | null>(null)

  const [deleteTarget, setDeleteTarget] = useState<FileOrigine | null>(null)
  const [gcodeMap, setGcodeMap] = useState<Map<number, Gcode[]>>(new Map())

  const isSuperuser = user?.is_superuser

  // Carica organizzazioni
  useEffect(() => {
    if (!loading && user) {
      listOrg({ userId: user.id, isSuperuser }).then(setOrgs).catch(console.error)
    }
  }, [loading, user, isSuperuser])



  // Carica commesse
  useEffect(() => {
    if (!loading) {
      if (isSuperuser) {
        // Per superuser, carica tutte le commesse
        listCommesse({ isSuperuser }).then(setCommesse).catch(console.error)
      } else {
        // Per utenti non superuser, carica le commesse di tutte le loro organizzazioni
        if (orgs.length > 0) {
          const orgIds = orgs.map(o => o.id)
          Promise.all(orgIds.map(orgId => listCommesse({ organizzazione_id: orgId, isSuperuser })))
            .then(commesseResults => {
              const allCommesse = commesseResults.flat()
              setCommesse(allCommesse)
            })
            .catch(console.error)
        }
      }
    }
  }, [loading, isSuperuser, orgs])

  // Reset commessa quando cambia organizzazione
  useEffect(() => {
    setCommessaId(undefined)
  }, [orgId])



  const loadFiles = useCallback(async () => {
    if (!loading) {
      // Per utenti non superuser, carica i file delle loro organizzazioni
      // Per superuser, carica tutti i file
      if (isSuperuser) {
        listFileOrigine({ isSuperuser })
          .then(async (fileList) => {
            setFiles(fileList)
            
            // Carica i G-code per i file caricati
            if (fileList.length > 0) {
              try {
                const results = await Promise.all(fileList.map(f => listGcode({ file_origine_id: f.id })))
                // Mappa fileOrigine.id -> array di Gcode SOLO se almeno uno presente
                const gcodeMap = new Map<number, Gcode[]>()
                fileList.forEach((f, idx) => {
                  const arr = results[idx]
                  if (Array.isArray(arr) && arr.length > 0) {
                    gcodeMap.set(f.id, arr)
                  }
                })
                setGcodeMap(gcodeMap)
              } catch (error) {
                console.error('Errore caricamento G-code:', error)
                setGcodeMap(new Map())
              }
            } else {
              setGcodeMap(new Map())
            }
          })
          .catch(console.error)
      } else {
        // Per utenti non superuser, carica i file delle loro organizzazioni
        // Usa le organizzazioni già caricate
        if (orgs.length > 0) {
          const orgIds = orgs.map(o => o.id)
          // Carica i file di tutte le organizzazioni dell'utente
          const filePromises = orgIds.map(orgId => 
            listFileOrigine({ organizzazione_id: orgId, isSuperuser })
          )
          
          Promise.all(filePromises)
            .then(async (fileResults) => {
              const allFiles = fileResults.flat()
              setFiles(allFiles)
              
              // Carica i G-code per i file caricati
              if (allFiles.length > 0) {
                try {
                  const results = await Promise.all(allFiles.map(f => listGcode({ file_origine_id: f.id })))
                  // Mappa fileOrigine.id -> array di Gcode SOLO se almeno uno presente
                  const gcodeMap = new Map<number, Gcode[]>()
                  allFiles.forEach((f, idx) => {
                    const arr = results[idx]
                    if (Array.isArray(arr) && arr.length > 0) {
                      gcodeMap.set(f.id, arr)
                    }
                  })
                  setGcodeMap(gcodeMap)
                } catch (error) {
                  console.error('Errore caricamento G-code:', error)
                  setGcodeMap(new Map())
                }
              } else {
                setGcodeMap(new Map())
              }
            })
            .catch(console.error)
        }
      }
    }
  }, [loading, isSuperuser, orgs])

  // Retry automatico ogni 10 secondi quando in loading
  useRetryFetch(loading, loadFiles, {
    retryInterval: 10000,
    enabled: true
  })

  // Carica file
  useEffect(() => {
    loadFiles()
  }, [loadFiles])



  // Handler upload/associazione G-code (placeholder, da adattare)
  const handleGcodeAction = async (original: FileOrigine, file?: File) => {
    setGcodeError(null)
    setGcodeSuccess(null)
    try {
      if (file) {
        await uploadGcode(file, original.id, {})
        // Ricarica i file (che automaticamente ricaricherà anche i G-code)
        if (isSuperuser) {
          const fileList = await listFileOrigine({ isSuperuser })
          setFiles(fileList)
          
          // Ricarica i G-code
          if (fileList.length > 0) {
            const results = await Promise.all(fileList.map(f => listGcode({ file_origine_id: f.id })))
            const gcodeMap = new Map<number, Gcode[]>()
            fileList.forEach((f, idx) => {
              const arr = results[idx]
              if (Array.isArray(arr) && arr.length > 0) {
                gcodeMap.set(f.id, arr)
              }
            })
            setGcodeMap(gcodeMap)
          }
        } else {
          // Per utenti non superuser, ricarica i file delle loro organizzazioni
          if (orgs.length > 0) {
            const orgIds = orgs.map(o => o.id)
            const fileResults = await Promise.all(orgIds.map(orgId => 
              listFileOrigine({ organizzazione_id: orgId, isSuperuser })
            ))
            
            const allFiles = fileResults.flat()
            setFiles(allFiles)
            
            // Ricarica i G-code
            if (allFiles.length > 0) {
              const results = await Promise.all(allFiles.map(f => listGcode({ file_origine_id: f.id })))
              const gcodeMap = new Map<number, Gcode[]>()
              allFiles.forEach((f, idx) => {
                const arr = results[idx]
                if (Array.isArray(arr) && arr.length > 0) {
                  gcodeMap.set(f.id, arr)
                }
              })
              setGcodeMap(gcodeMap)
            }
          }
        }
        setGcodeSuccess('G-code associato con successo!')
      }
    } catch (err) {
      setGcodeError('Errore upload/associazione G-code')
      console.error('Errore upload/associazione G-code:', err)
    } finally {
    }
  }

  // Handler eliminazione file
  const handleDelete = async () => {
    if (!deleteTarget) return
    setGcodeError(null)
    setGcodeSuccess(null)
    try {
      await deleteFileOrigine(deleteTarget.id)
      // Ricarica i file (che automaticamente ricaricherà anche i G-code)
      if (isSuperuser) {
        const fileList = await listFileOrigine({ isSuperuser })
        setFiles(fileList)
        
        // Ricarica i G-code
        if (fileList.length > 0) {
          const results = await Promise.all(fileList.map(f => listGcode({ file_origine_id: f.id })))
          const gcodeMap = new Map<number, Gcode[]>()
          fileList.forEach((f, idx) => {
            const arr = results[idx]
            if (Array.isArray(arr) && arr.length > 0) {
              gcodeMap.set(f.id, arr)
            }
          })
          setGcodeMap(gcodeMap)
        } else {
          setGcodeMap(new Map())
        }
      } else {
        // Per utenti non superuser, ricarica i file delle loro organizzazioni
        if (orgs.length > 0) {
          const orgIds = orgs.map(o => o.id)
          const fileResults = await Promise.all(orgIds.map(orgId => 
            listFileOrigine({ organizzazione_id: orgId, isSuperuser })
          ))
          
          const allFiles = fileResults.flat()
          setFiles(allFiles)
          
          // Ricarica i G-code
          if (allFiles.length > 0) {
            const results = await Promise.all(allFiles.map(f => listGcode({ file_origine_id: f.id })))
            const gcodeMap = new Map<number, Gcode[]>()
            allFiles.forEach((f, idx) => {
              const arr = results[idx]
              if (Array.isArray(arr) && arr.length > 0) {
                gcodeMap.set(f.id, arr)
              }
            })
            setGcodeMap(gcodeMap)
          } else {
            setGcodeMap(new Map())
          }
        }
      }
      setGcodeSuccess('File eliminato con successo!')
    } catch (err) {
      setGcodeError('Errore eliminazione file')
      console.error('Errore eliminazione file:', err)
    } finally {
      setDeleteTarget(null)
    }
  }

  // Funzione di utilità per trovare nome organizzazione e commessa
  function getOrgCommFromFile(file: FileOrigine, commesse: Commessa[], orgs: Organizzazione[]): { organizzazione: string, commessa: string } {
    const comm = commesse.find(c => c.id === file.commessa_id)
    const org = comm ? orgs.find(o => o.id === comm.organizzazione_id) : undefined
    return {
      organizzazione: org ? org.nome : '',
      commessa: comm ? comm.nome : ''
    }
  }

  // Costruisci le righe per la tabella
  const righe: RigaFile[] = files.map(f => {
    const { organizzazione, commessa } = getOrgCommFromFile(f, commesse, orgs)
    const gcodeList = gcodeMap.get(f.id)
    const comm = commesse.find(c => c.id === f.commessa_id)
    return {
      id: f.id,
      nome: f.nome_file.split('/').pop() || f.nome_file,
      organizzazione,
      commessa,
      descrizione: f.descrizione,
      nomeGcode: gcodeList && gcodeList.length > 0 ? gcodeList[0].nome_file.split('/').pop() : undefined,
      organizzazione_id: comm?.organizzazione_id,
      commessa_id: f.commessa_id,
    }
  })

  // Commesse filtrate per l'organizzazione selezionata
  const commesseFiltrate = useMemo(() => {
    if (orgId) {
      // Se è selezionata un'organizzazione, filtra per quella
      return commesse.filter(c => c.organizzazione_id === orgId)
    } else if (!isSuperuser && orgs.length > 0) {
      // Per utenti non superuser senza organizzazione selezionata, mostra tutte le commesse delle loro organizzazioni
      const orgIds = orgs.map(o => o.id)
      return commesse.filter(c => orgIds.includes(c.organizzazione_id))
    } else if (isSuperuser) {
      // Per superuser senza organizzazione selezionata, mostra tutte le commesse
      return commesse
    }
    return []
  }, [commesse, orgId, isSuperuser, orgs])

  // Filtro per testo
  const textFiltered = useMemo(
    () => filterBySearch(
      righe,
      search,
      [r => r.nome, r => r.organizzazione, r => r.commessa]
    ),
    [righe, search]
  )

  // Filtro per organizzazione e commessa
  const filteredRighe = useMemo(
    () => textFiltered.filter(riga => {
      const file = files.find(f => f.id === riga.id)
      if (!file) return false
      
      // Filtro per organizzazione
      if (orgId) {
        const comm = commesse.find(c => c.id === file.commessa_id)
        if (!comm || comm.organizzazione_id !== orgId) return false
      } else if (!isSuperuser && orgs.length > 0) {
        // Per utenti non superuser senza organizzazione selezionata, 
        // mostra solo file delle loro organizzazioni
        const comm = commesse.find(c => c.id === file.commessa_id)
        if (!comm) return false
        const orgIds = orgs.map(o => o.id)
        if (!orgIds.includes(comm.organizzazione_id)) return false
      }
      
      // Filtro per commessa
      if (commessaId) {
        if (file.commessa_id !== commessaId) return false
      }
      
      return true
    }),
    [textFiltered, orgId, commessaId, files, commesse, isSuperuser, orgs]
  )

  // Callback per le azioni
  const handleAssocia = (id: number) => {
    const fileObj = files.find(f => f.id === id)
    if (!fileObj) return
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.3mf'
    input.onchange = () => {
      const file = input.files?.[0]
      if (file) handleGcodeAction(fileObj, file)
    }
    input.click()
  }





  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Elenco File</h1>
        <Link href="/dashboard/files/upload" className="btn btn-primary">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Aggiungi File
        </Link>
      </div>
      {gcodeError && <AlertMessage type="error" message={gcodeError} onClose={() => setGcodeError(null)} />}
      {gcodeSuccess && <AlertMessage type="success" message={gcodeSuccess} onClose={() => setGcodeSuccess(null)} />}
      
      {/* Filtri */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-4 items-end">
          {/* Ricerca */}
          <div className="form-control flex-1 min-w-[200px]">
            <label className="label">
              <span className="label-text">Cerca per nome file</span>
            </label>
            <input
              type="text"
              placeholder="Inserisci il nome del file..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input input-bordered w-full"
            />
          </div>
          
          {/* Filtro organizzazione */}
          
            
              {(isSuperuser || orgs.length > 1) && (
                <div className="form-control flex-1 min-w-[200px]">
                <label className="label">
                  <span className="label-text">Organizzazione</span>
                </label>
              <select
                className="select select-bordered w-full"
                value={orgId ?? ''}
                onChange={e => setOrgId(Number(e.target.value) || undefined)}
              >
                <option value="">Tutte le organizzazioni</option>
                {orgs.map(o => (
                  <option key={o.id} value={o.id}>{o.nome}</option>
                ))}
              </select>
              </div>
            )}
          
          
          {/* Filtro commessa */}
          <div className="form-control flex-1 min-w-[200px]">
            <label className="label">
              <span className="label-text">Commessa</span>
            </label>
            <select
              className="select select-bordered w-full"
              value={commessaId ?? ''}
              onChange={e => setCommessaId(Number(e.target.value) || undefined)}
              disabled={commesseFiltrate.length === 0}
            >
              <option value="">Tutte le commesse</option>
              {commesseFiltrate.map(c => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
      
      {/* Tabella file */}
      <div className="mb-4">
        <p className="text-sm text-base-content/70">
          Visualizzati {filteredRighe.length} file su {files.length} totali
        </p>
      </div>
      <TabellaFile
        righe={filteredRighe}
        onAssocia={handleAssocia}
        showOrganizzazione={isSuperuser || orgs.length > 1}
        isSuperuser={isSuperuser}
      />
      <ConfirmModal
        open={!!deleteTarget}
        title="Conferma eliminazione"
        message={deleteTarget ? `Sei sicuro di voler eliminare il file "${deleteTarget.nome_file}"?` : ''}
        confirmText="Elimina"
        cancelText="Annulla"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}