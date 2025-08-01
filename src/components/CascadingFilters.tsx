'use client'

import { useState, useEffect } from 'react'
import { listOrg } from '@/services/organizzazione'
import { listCommesse } from '@/services/commessa'
import { listFileOrigine } from '@/services/fileOrigine'
import type { Organizzazione } from '@/types/organizzazione'
import type { Commessa } from '@/types/commessa'
import type { FileOrigine } from '@/types/fileOrigine'

interface CascadingFiltersProps {
  isSuperuser: boolean
  userId?: string
  selectedOrg?: number
  selectedCommessa?: number
  selectedFile?: number
  onOrgChange?: (orgId: number | undefined) => void
  onCommessaChange?: (commessaId: number | undefined) => void
  onFileChange?: (fileId: number | undefined) => void
  showFileFilter?: boolean
  disabled?: boolean
  className?: string
}

export function CascadingFilters({
  isSuperuser,
  userId,
  selectedOrg: externalSelectedOrg,
  selectedCommessa: externalSelectedCommessa,
  selectedFile: externalSelectedFile,
  onOrgChange,
  onCommessaChange,
  onFileChange,
  showFileFilter = false,
  disabled = false,
  className = ''
}: CascadingFiltersProps) {
  const [orgs, setOrgs] = useState<Organizzazione[]>([])
  const [selectedOrg, setSelectedOrg] = useState<number | undefined>(externalSelectedOrg)
  const [commesse, setCommesse] = useState<Commessa[]>([])
  const [selectedCommessa, setSelectedCommessa] = useState<number | undefined>(externalSelectedCommessa)
  const [files, setFiles] = useState<FileOrigine[]>([])
  const [selectedFile, setSelectedFile] = useState<number | undefined>(externalSelectedFile)
  
  // Stati di loading
  const [loadingCommesse, setLoadingCommesse] = useState(false)
  const [loadingFiles, setLoadingFiles] = useState(false)

  // Sincronizza stato interno con props esterne
  useEffect(() => {
    setSelectedOrg(externalSelectedOrg)
  }, [externalSelectedOrg])

  useEffect(() => {
    setSelectedCommessa(externalSelectedCommessa)
  }, [externalSelectedCommessa])

  useEffect(() => {
    setSelectedFile(externalSelectedFile)
  }, [externalSelectedFile])

  // Carica organizzazioni
  useEffect(() => {
    if (userId) {
      listOrg({ userId, isSuperuser }).then(setOrgs).catch(console.error)
    }
  }, [userId, isSuperuser])

  // Seleziona automaticamente l'organizzazione se l'utente non è superuser e ha una sola organizzazione
  useEffect(() => {
    if (!isSuperuser && orgs.length === 1 && !selectedOrg) {
      const orgId = orgs[0].id
      console.log('CascadingFilters: Selezione automatica organizzazione', orgId)
      setSelectedOrg(orgId)
      onOrgChange?.(orgId)
    }
  }, [isSuperuser, orgs, selectedOrg, onOrgChange])

  // Al cambio org, carica commesse
  useEffect(() => {
    if (selectedOrg !== undefined) {
      console.log('CascadingFilters: Caricamento commesse per organizzazione', selectedOrg)
      setLoadingCommesse(true)
      setCommesse([]) // Reset immediato
      setSelectedCommessa(undefined)
      setFiles([])
      setSelectedFile(undefined)
      onCommessaChange?.(undefined)
      onFileChange?.(undefined)
      
      listCommesse({ organizzazione_id: selectedOrg, isSuperuser })
        .then(setCommesse)
        .catch(() => setCommesse([]))
        .finally(() => {
          setLoadingCommesse(false)
        })
    } else {
      setCommesse([])
      setSelectedCommessa(undefined)
      setFiles([])
      setSelectedFile(undefined)
      onCommessaChange?.(undefined)
      onFileChange?.(undefined)
      setLoadingCommesse(false)
    }
  }, [selectedOrg, isSuperuser, onCommessaChange, onFileChange])

  // Al cambio commessa, carica file origine (se richiesto)
  useEffect(() => {
    if (selectedCommessa !== undefined && showFileFilter) {
      console.log('CascadingFilters: Caricamento file per commessa', selectedCommessa)
      setLoadingFiles(true)
      setFiles([]) // Reset immediato
      setSelectedFile(undefined)
      onFileChange?.(undefined)
      
      listFileOrigine({ 
        commessa_id: selectedCommessa, 
        isSuperuser 
      })
        .then(setFiles)
        .catch(() => setFiles([]))
        .finally(() => setLoadingFiles(false))
    } else if (selectedCommessa === undefined && showFileFilter) {
      setFiles([])
      setSelectedFile(undefined)
      onFileChange?.(undefined)
      setLoadingFiles(false)
    }
  }, [selectedCommessa, isSuperuser, showFileFilter, onFileChange])

  const handleOrgChange = (orgId: number | undefined) => {
    console.log('CascadingFilters: Cambio organizzazione', orgId)
    setSelectedOrg(orgId)
    onOrgChange?.(orgId)
  }

  const handleCommessaChange = (commessaId: number | undefined) => {
    console.log('CascadingFilters: Cambio commessa', commessaId)
    setSelectedCommessa(commessaId)
    onCommessaChange?.(commessaId)
  }

  const handleFileChange = (fileId: number | undefined) => {
    console.log('CascadingFilters: Cambio file', fileId)
    setSelectedFile(fileId)
    onFileChange?.(fileId)
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Organizzazione - solo per superuser o se ci sono più organizzazioni */}
      {(isSuperuser || orgs.length > 1) && (
        <div className="form-control">
          <label className="label">
            <span className="label-text">Organizzazione</span>
          </label>
          <select
            className="select select-bordered w-full"
            value={selectedOrg ?? ''}
            onChange={e => handleOrgChange(Number(e.target.value) || undefined)}
            disabled={disabled}
          >
            <option value="">Seleziona...</option>
            {orgs.map(o => (
              <option key={o.id} value={o.id}>{o.nome}</option>
            ))}
          </select>
        </div>
      )}

      {/* Messaggio informativo per utenti con una sola organizzazione */}
      {!isSuperuser && orgs.length === 1 && selectedOrg && (
        <div className="alert alert-info">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <span>Organizzazione selezionata automaticamente: <strong>{orgs.find(o => o.id === selectedOrg)?.nome}</strong></span>
        </div>
      )}

      {/* Commessa */}
      <div className="form-control">
        <label className="label">
          <span className="label-text">Commessa</span>
        </label>
        <select
          className="select select-bordered w-full"
          value={selectedCommessa ?? ''}
          onChange={e => handleCommessaChange(Number(e.target.value) || undefined)}
          disabled={disabled || !selectedOrg || loadingCommesse}
        >
          <option value="">Seleziona...</option>
          {loadingCommesse ? (
            <option value="" disabled>Caricamento...</option>
          ) : (
            commesse.map(c => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))
          )}
        </select>
      </div>

      {/* File origine - solo se richiesto */}
      {showFileFilter && (
        <div className="form-control">
          <label className="label">
            <span className="label-text">File disponibile</span>
          </label>
          <select
            className="select select-bordered w-full"
            value={selectedFile ?? ''}
            onChange={e => handleFileChange(Number(e.target.value) || undefined)}
            disabled={disabled || !selectedCommessa || loadingFiles}
          >
            <option value="">Seleziona...</option>
            {loadingFiles ? (
              <option value="" disabled>Caricamento...</option>
            ) : (
              files.map(f => (
                <option key={f.id} value={f.id}>{f.nome_file.split('/').pop() || f.nome_file}</option>
              ))
            )}
          </select>
        </div>
      )}
    </div>
  )
} 