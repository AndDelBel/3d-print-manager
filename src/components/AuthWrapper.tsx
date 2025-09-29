import React from 'react'
import { useUser } from '@/hooks/useUser'
import { AuthLoadingState } from './AuthLoadingState'

interface AuthWrapperProps {
  children: React.ReactNode
  requireAuth?: boolean
  fallback?: React.ReactNode
}

export function AuthWrapper({ 
  children, 
  requireAuth = true, 
  fallback 
}: AuthWrapperProps) {
  const { loading, user, error, retryCount } = useUser()

  const handleRetry = () => {
    window.location.reload()
  }

  // Show loading or error state
  if (loading || error) {
    return (
      <AuthLoadingState 
        loading={loading}
        error={error}
        retryCount={retryCount}
        onRetry={handleRetry}
      />
    )
  }

  // If auth is required but user is not authenticated
  if (requireAuth && !user) {
    if (fallback) {
      return <>{fallback}</>
    }
    
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="text-warning text-6xl mb-4">🔒</div>
          <h3 className="text-lg font-semibold mb-2">
            Accesso richiesto
          </h3>
          <p className="text-sm text-base-content/70 mb-4">
            Devi effettuare l'accesso per visualizzare questa pagina.
          </p>
          <a 
            href="/auth/login"
            className="btn btn-primary btn-sm"
          >
            Accedi
          </a>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
