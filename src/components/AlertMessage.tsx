import React from 'react'

interface AlertMessageProps {
  type: 'success' | 'error' | 'info'
  message: string
  onClose?: () => void
}

export const AlertMessage: React.FC<AlertMessageProps> = ({ type, message, onClose }) => {
  const alertClass = 
    type === 'success' ? 'alert-success' :
    type === 'error' ? 'alert-error' :
    'alert-info'

  return (
    <div className={`alert ${alertClass} mb-4`}>
      <span>{message}</span>
      {onClose && (
        <button onClick={onClose} className="btn btn-sm btn-ghost">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  )
} 