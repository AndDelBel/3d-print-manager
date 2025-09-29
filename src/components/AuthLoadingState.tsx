import React from 'react'

interface AuthLoadingStateProps {
  loading: boolean
  error: string | null
  retryCount: number
  onRetry?: () => void
  className?: string
}

export function AuthLoadingState({ 
  loading, 
  error, 
  retryCount, 
  onRetry,
  className = "" 
}: AuthLoadingStateProps) {
  if (!loading && !error) return null

  return (
    <div className={`flex flex-col items-center justify-center min-h-[400px] ${className}`}>
      {loading && (
        <div className="text-center">
          <div className="loading loading-spinner loading-lg mb-4"></div>
          <h3 className="text-lg font-semibold mb-2">Caricamento autenticazione...</h3>
          {retryCount > 0 && (
            <p className="text-sm text-base-content/70">
              Tentativo {retryCount} di 3
            </p>
          )}
        </div>
      )}
      
      {error && (
        <div className="text-center">
          <div className="text-error text-6xl mb-4">⚠️</div>
          <h3 className="text-lg font-semibold text-error mb-2">
            Errore di autenticazione
          </h3>
          <p className="text-sm text-base-content/70 mb-4 max-w-md">
            {error}
          </p>
          {onRetry && (
            <button 
              onClick={onRetry}
              className="btn btn-primary btn-sm"
            >
              Riprova
            </button>
          )}
        </div>
      )}
    </div>
  )
}
