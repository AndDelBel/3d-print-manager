import React from 'react'
import Link from 'next/link'

export interface RigaFile {
  id: number
  nome: string
  organizzazione: string
  commessa: string
  nomeGcode?: string // undefined se non associato
  descrizione?: string | null
  // Aggiungo i campi necessari per il link di ordinazione
  organizzazione_id?: number
  commessa_id?: number
}

interface RigaTabellaFileProps {
  riga: RigaFile
  onAssocia: (id: number) => void
  showOrganizzazione?: boolean
  isSuperuser?: boolean
}

export function RigaTabellaFile({
  riga,
  onAssocia,
  showOrganizzazione = true,
  isSuperuser = false,
}: RigaTabellaFileProps) {
  // Costruisci l'URL per la creazione ordini con parametri precompilati
  const getOrderUrl = () => {
    const params = new URLSearchParams()
    if (riga.organizzazione_id) {
      params.set('org', riga.organizzazione_id.toString())
    }
    if (riga.commessa_id) {
      params.set('commessa', riga.commessa_id.toString())
    }
    if (riga.id) {
      params.set('file', riga.id.toString())
    }
    return `/dashboard/orders/create?${params.toString()}`
  }

  return (
    <tr className="hover:bg-base-200 cursor-pointer" onClick={() => window.location.href = `/dashboard/files/${riga.id}`}>
      <td>{riga.nome}</td>
      {showOrganizzazione && <td>{riga.organizzazione}</td>}
      <td>{riga.commessa}</td>
      <td>{riga.descrizione ? <span title={riga.descrizione} className="max-w-xs truncate inline-block align-top">{riga.descrizione}</span> : <span className="text-base-content/50">-</span>}</td>
      <td onClick={(e) => e.stopPropagation()}>
        {riga.nomeGcode ? (
          <div className="flex items-center gap-2">
            <span className="badge badge-success">✓</span>
            <Link 
              href={getOrderUrl()}
              className="btn btn-primary btn-xs"
              onClick={(e) => e.stopPropagation()}
            >
              Ordina
            </Link>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="badge badge-error">✗</span>
            {isSuperuser && (
              <button onClick={() => onAssocia(riga.id)} className="btn btn-success btn-xs">Associa</button>
            )}
          </div>
        )}
      </td>
    </tr>
  )
} 