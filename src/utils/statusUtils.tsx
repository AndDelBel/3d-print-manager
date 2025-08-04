import React from 'react'

export function getStatusBadge(stato: string): React.ReactNode {
  const statusConfig = {
    'processamento': { label: 'Processamento', color: 'badge-neutral' },
    'in_coda': { label: 'In_Coda', color: 'badge-primary' },
    'in_stampa': { label: 'In_Stampa', color: 'badge-warning' },
    'pronto': { label: 'Pronto', color: 'badge-info' },
    'consegnato': { label: 'Consegnato', color: 'badge-success' },
    'error': { label: 'Errore', color: 'badge-error' }
  }
  
  const config = statusConfig[stato as keyof typeof statusConfig] || { label: stato, color: 'badge-neutral' }
  return <span className={`badge ${config.color}`}>{config.label}</span>
}

export function getStatusBadgeInline(stato: string): React.ReactNode {
  const statusConfig = {
    'processamento': { label: 'Processamento', color: 'badge-neutral' },
    'in_coda': { label: 'In_Coda', color: 'badge-primary' },
    'in_stampa': { label: 'In_Stampa', color: 'badge-warning' },
    'pronto': { label: 'Pronto', color: 'badge-info' },
    'consegnato': { label: 'Consegnato', color: 'badge-success' },
    'error': { label: 'Errore', color: 'badge-error' }
  }
  
  const config = statusConfig[stato as keyof typeof statusConfig] || { label: stato, color: 'badge-neutral' }
  return <span className={`badge ${config.color}`}>{config.label}</span>
} 