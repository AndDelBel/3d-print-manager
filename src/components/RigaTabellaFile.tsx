import React from 'react'

export interface RigaFile {
  id: number
  nome: string
  organizzazione: string
  commessa: string
  nomeGcode?: string // undefined se non associato
  descrizione?: string | null
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
  return (
    <tr className="hover:bg-base-200 cursor-pointer" onClick={() => window.location.href = `/dashboard/files/${riga.id}`}>
      <td>{riga.nome}</td>
      {showOrganizzazione && <td>{riga.organizzazione}</td>}
      <td>{riga.commessa}</td>
      <td>{riga.descrizione ? <span title={riga.descrizione} className="max-w-xs truncate inline-block align-top">{riga.descrizione}</span> : <span className="text-base-content/50">-</span>}</td>
      <td onClick={(e) => e.stopPropagation()}>
        {riga.nomeGcode ? (
          <span className="badge badge-success">✓</span>
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