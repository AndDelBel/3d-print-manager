import React from 'react'
import { RigaTabellaFile, RigaFile } from './RigaTabellaFile'

interface TabellaFileProps {
  righe: RigaFile[]
  onAssocia: (id: number) => void
  showOrganizzazione?: boolean
  isSuperuser?: boolean
}

export function TabellaFile({ righe, showOrganizzazione = true, isSuperuser = false, ...callbacks }: TabellaFileProps) {
  return (
    <div className="overflow-x-auto">
      <table className="table table-zebra w-full">
        <thead>
          <tr>
            <th className="w-1/4">Nome</th>
            {showOrganizzazione && <th className="w-1/6">Organizzazione</th>}
            <th className="w-1/6">Commessa</th>
            <th className="w-1/3">Descrizione</th>
            <th className="w-1/6">Processato</th>
          </tr>
        </thead>
        <tbody>
          {righe.map(riga => (
            <RigaTabellaFile key={riga.id} riga={riga} showOrganizzazione={showOrganizzazione} isSuperuser={isSuperuser} {...callbacks} />
          ))}
        </tbody>
      </table>
    </div>
  )
} 