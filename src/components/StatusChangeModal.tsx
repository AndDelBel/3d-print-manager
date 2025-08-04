'use client'

import { LoadingButton } from './LoadingButton'

interface StatusChangeModalProps<T = string> {
  open: boolean
  onClose: () => void
  onConfirm: (newStatus: T) => void
  currentStatus: string
  orderId: number
  loading: boolean
  availableStatuses: string[]
  getStatusBadge: (status: string) => React.ReactNode
}

export function StatusChangeModal<T = string>({
  open,
  onClose,
  onConfirm,
  currentStatus,
  orderId,
  loading,
  availableStatuses,
  getStatusBadge
}: StatusChangeModalProps<T>) {
  if (!open) return null

  return (
    <div className="modal modal-open">
      <div className="modal-box">
        <h3 className="font-bold text-lg mb-4">Modifica Stato Ordine #{orderId}</h3>
        <div className="mb-4">
          <label className="label">
            <span className="label-text">Stato attuale:</span>
          </label>
          <div className="p-2 bg-base-200 rounded text-sm">
            {getStatusBadge(currentStatus)}
          </div>
        </div>
        <div className="mb-6">
          <label className="label">
            <span className="label-text">Nuovo stato:</span>
          </label>
          <div className="grid grid-cols-1 gap-2">
            {availableStatuses.map(status => (
              <button
                key={status}
                onClick={() => onConfirm(status as T)}
                disabled={loading || currentStatus === status}
                className={`btn btn-outline justify-start ${
                  currentStatus === status ? 'btn-active' : ''
                }`}
              >
                <span className="mr-2">
                  {getStatusBadge(status)}
                </span>
                {status}
              </button>
            ))}
          </div>
        </div>
        <div className="modal-action">
          <button
            onClick={onClose}
            className="btn btn-ghost"
            disabled={loading}
          >
            Annulla
          </button>
        </div>
      </div>
    </div>
  )
} 